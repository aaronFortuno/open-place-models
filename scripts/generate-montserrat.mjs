import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';

const require=createRequire(resolve(process.argv[2]??'.','package.json'));
const {fromUrl,fromArrayBuffer,writeArrayBuffer}=require('geotiff');
const proj4=require('proj4');
proj4.defs('EPSG:25831','+proj=utm +zone=31 +ellps=GRS80 +units=m +no_defs');
const toWGS84=proj4('EPSG:25831','EPSG:4326').forward;
const root=new URL('../',import.meta.url),directory='models/montserrat/r1/',output=new URL(directory,root);
const source='https://datacloud.icgc.cat/datacloud/model-elevacions-terreny/tif_unzip/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023.tif';
const metadata='https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat';
const park='https://muntanyamontserrat.gencat.cat/ca/el_parc/senderisme/Del_Monestir_SantJeroni';
const attribution='Surface elevations © Institut Cartogràfic i Geològic de Catalunya, CC BY 4.0. Mesh by Open Place Models contributors.';
const verticalDatum='EGM08D595';
// EPSG:25831 bounds use the centres of pixels at the corresponding overview level.
const overviewBounds=[396004,4602804,405604,4609204];
const tileBounds=[398561,4607217,399329,4607601],seamEasting=398945;
const anchor=toWGS84([401204,4606004]);
const metresPerDegree=111320,longitudeScale=metresPerDegree*Math.cos(anchor[1]*Math.PI/180);

const terrain=await fromUrl(source,{allowFullFile:false,maxRanges:0,blockSize:65536,cacheSize:64},AbortSignal.timeout(20000));
const original=await terrain.getImage();
const [originE,originN]=original.getOrigin();
assert.equal(original.getGeoKeys().ProjectedCSTypeGeoKey,25831);
assert.equal(original.pixelIsArea(),true);

async function readWindow(level,bounds,step){
  const [w,s,e,n]=bounds;
  const image=await terrain.getImage(level);
  assert.deepEqual(image.getResolution(original).slice(0,2),[step,-step]);
  const window=[(w-originE)/step-.5,(originN-n)/step-.5,(e-originE)/step+.5,(originN-s)/step+.5];
  assert(window.every(Number.isInteger),'The sample window must align to pixel centres.');
  const elevations=await image.readRasters({window,samples:[0],interleave:true,signal:AbortSignal.timeout(60000)});
  const columns=window[2]-window[0],rows=window[3]-window[1];
  const nodata=image.getGDALNoData()??original.getGDALNoData();
  assert(elevations.every(z=>Number.isFinite(z)&&z!==nodata&&z>=0),'Complete terrain coverage');
  assert.equal(elevations.length,columns*rows);
  return {bounds,step,columns,rows,elevations};
}

function subset(source,bounds,step){
  const [w,s,e,n]=bounds,columns=(e-w)/step+1,rows=(n-s)/step+1;
  const stride=step/source.step,left=(w-source.bounds[0])/source.step,top=(source.bounds[3]-n)/source.step;
  assert([columns,rows,stride,left,top].every(Number.isInteger)&&left>=0&&top>=0&&
    left+(columns-1)*stride<source.columns&&top+(rows-1)*stride<source.rows,'Subset aligns to its source.');
  const elevations=Float32Array.from({length:columns*rows},(_,i)=>
    source.elevations[(top+Math.floor(i/columns)*stride)*source.columns+left+(i%columns)*stride]);
  return {bounds,step,columns,rows,elevations};
}

function elevationRange({elevations}){
  let low=Infinity,high=-Infinity;
  for(const elevation of elevations){low=Math.min(low,elevation);high=Math.max(high,elevation);}
  return [low,high];
}

function cellHeight(a,b,c,d,u,v,main){
  if(main)return u>=v?a*(1-u)+b*(u-v)+d*v:a*(1-v)+c*(v-u)+d*u;
  return u+v<=1?a*(1-u-v)+b*u+c*v:d*(u+v-1)+b*(1-v)+c*(1-u);
}

function refinedCellHeight(a,b,c,d,u,v,{u:px,v:py,z:peak}){
  const north=v/py,east=(1-u)/(1-px),south=(1-v)/(1-py),west=u/px;
  const weight=Math.min(north,east,south,west);
  const right=u-weight*px,lower=v-weight*py;
  if(weight===north)return (1-weight-right)*a+right*b+weight*peak;
  if(weight===east)return (1-weight-lower)*b+lower*d+weight*peak;
  if(weight===south)return (1-weight-right)*c+right*d+weight*peak;
  return (1-weight-lower)*a+lower*c+weight*peak;
}

function fitError(samples,surface){
  let max=0,sumSquares=0;
  for(const {u,v,z} of samples){
    const error=Math.abs(z-surface(u,v));
    max=Math.max(max,error);sumSquares+=error**2;
  }
  return {max,sumSquares};
}

function cellPlan(grid,reference,vertexBudget){
  const {columns,rows,elevations,step}=grid,cellColumns=columns-1;
  const diagonals=new Uint8Array(cellColumns*(rows-1)),candidates=[];
  for(let row=0;row<rows-1;row++)for(let col=0;col<cellColumns;col++){
    const i=row*columns+col,cell=row*cellColumns+col;
    const a=elevations[i],b=elevations[i+1],c=elevations[i+columns],d=elevations[i+columns+1];
    let main=Math.abs(a-d)<Math.abs(b-c);
    diagonals[cell]=Number(main);
    if(!reference)continue;
    const stride=step/reference.step,samples=[];
    for(let y=1;y<stride;y++)for(let x=1;x<stride;x++){
      samples.push({u:x/stride,v:y/stride,z:reference.elevations[(row*stride+y)*reference.columns+col*stride+x]});
    }
    let best=fitError(samples,(u,v)=>cellHeight(a,b,c,d,u,v,main));
    const other=fitError(samples,(u,v)=>cellHeight(a,b,c,d,u,v,!main));
    if(other.max<=best.max&&other.sumSquares<best.sumSquares){main=!main;best=other;diagonals[cell]=Number(main);}
    if(best.max<8)continue;
    let refinement;
    for(const sample of samples){
      const error=fitError(samples,(u,v)=>refinedCellHeight(a,b,c,d,u,v,sample));
      const gain=best.sumSquares-error.sumSquares;
      if(error.max<=best.max&&(refinement?.gain??0)<gain)refinement={cell,...sample,gain};
    }
    if(refinement)candidates.push(refinement);
  }
  const refinements=new Map(candidates.sort((a,b)=>b.gain-a.gain).slice(0,vertexBudget).map(item=>[item.cell,item]));
  return {diagonals,refinements};
}

function triangulate(grid,base,reference){
  const {bounds:[west,,,north],columns,rows,elevations,step}=grid;
  const vertexCount=columns*rows,border=[];
  for(let x=0;x<columns-1;x++)border.push(x);
  for(let z=0;z<rows-1;z++)border.push(z*columns+columns-1);
  for(let x=columns-1;x>0;x--)border.push((rows-1)*columns+x);
  for(let z=rows-1;z>0;z--)border.push(z*columns);
  const centre=vertexCount+border.length;
  const {diagonals,refinements}=cellPlan(grid,reference,Math.max(0,65536-centre-1));
  const totalVertices=centre+1+refinements.size;
  const positions=new Float32Array(totalVertices*3);
  const triangleCount=2*((columns-1)*(rows-1)+refinements.size)+3*border.length;
  const indices=totalVertices<=65536?new Uint16Array(3*triangleCount):new Uint32Array(3*triangleCount);
  const convert=(east,northing,height)=>{
    const [lon,lat]=toWGS84([east,northing]);
    return [(lon-anchor[0])*longitudeScale,height-base,(anchor[1]-lat)*metresPerDegree];
  };
  for(let i=0;i<vertexCount;i++)positions.set(convert(west+i%columns*step,north-Math.floor(i/columns)*step,elevations[i]),i*3);
  positions.set(convert(west+(columns-1)*step/2,north-(rows-1)*step/2,base),centre*3);
  let index=0,nextVertex=centre+1;
  const face=(a,b,c)=>{indices[index++]=a;indices[index++]=b;indices[index++]=c;};
  for(let row=0;row<rows-1;row++)for(let col=0;col<columns-1;col++){
    const a=row*columns+col,b=a+1,c=a+columns,d=c+1;
    const cell=row*(columns-1)+col,refined=refinements.get(cell);
    if(refined){
      const {u,v,z}=refined,i=nextVertex++;
      positions.set(convert(west+(col+u)*step,north-(row+v)*step,z),i*3);
      face(a,c,i);face(c,d,i);face(d,b,i);face(b,a,i);
    }else if(diagonals[cell]){face(a,c,d);face(a,d,b);}
    else{face(a,c,b);face(b,c,d);}
  }
  for(let i=0;i<border.length;i++){
    const j=(i+1)%border.length,a=border[i],b=border[j],c=vertexCount+i,d=vertexCount+j;
    positions.set([positions[a*3],0,positions[a*3+2]],c*3);
    face(a,b,c);face(b,d,c);face(c,d,centre);
  }
  assert.equal(index,indices.length);
  return {positions,indices,diagonals,refinements};
}

function audit({positions,indices}){
  const count=positions.length/3,edges=new Map(),used=new Set();
  let volume6=0;
  for(let i=0;i<indices.length;i+=3){
    const a=indices[i],b=indices[i+1],c=indices[i+2];
    const [ax,ay,az]=positions.subarray(a*3,a*3+3),[bx,by,bz]=positions.subarray(b*3,b*3+3),[cx,cy,cz]=positions.subarray(c*3,c*3+3);
    const [ux,uy,uz]=[bx-ax,by-ay,bz-az],[vx,vy,vz]=[cx-ax,cy-ay,cz-az];
    assert(Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)>0,'No degenerate triangles');
    volume6+=ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx);
    for(const [from,to] of [[a,b],[b,c],[c,a]]){
      used.add(from);
      const key=Math.min(from,to)*count+Math.max(from,to),sign=from<to?1:-1,first=edges.get(key);
      assert(first===undefined||first===-sign,'Exactly two opposite faces at each edge');
      edges.set(key,first===undefined?sign:0);
    }
  }
  assert(edges.values().every(value=>value===0)&&used.size===count,'Closed mesh with welded edges');
  assert.equal(count-edges.size+indices.length/3,2);
  assert(volume6>0&&Number.isFinite(volume6),'Outward winding and positive volume');
  return {vertices:count,triangles:indices.length/3,eulerCharacteristic:2,signedVolumeM3:Math.round(volume6/6)};
}

function glb(mesh,base){
  const {positions,indices}=mesh,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<positions.length;i++){
    const axis=i%3;min[axis]=Math.min(min[axis],positions[i]);max[axis]=Math.max(max[axis],positions[i]);
  }
  const binary=Buffer.concat([Buffer.from(positions.buffer),Buffer.from(indices.buffer)]);
  const document={asset:{version:'2.0',generator:'Open Place Models',copyright:attribution,extras:{baseElevation:base,verticalDatum}},
    scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
    buffers:[{byteLength:binary.length}],bufferViews:[{buffer:0,byteLength:positions.byteLength,target:34962},
      {buffer:0,byteOffset:positions.byteLength,byteLength:indices.byteLength,target:34963}],
    accessors:[{bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3',min,max},
      {bufferView:1,componentType:indices instanceof Uint16Array?5123:5125,count:indices.length,type:'SCALAR'}]};
  const json=Buffer.from(JSON.stringify(document)),jsonSize=(json.length+3)&~3,binSize=(binary.length+3)&~3;
  const file=Buffer.alloc(28+jsonSize+binSize);
  file.write('glTF');file.writeUInt32LE(2,4);file.writeUInt32LE(file.length,8);file.writeUInt32LE(jsonSize,12);
  file.write('JSON',16);file.fill(0x20,20,20+jsonSize);json.copy(file,20);
  file.writeUInt32LE(binSize,20+jsonSize);file.write('BIN\0',24+jsonSize);binary.copy(file,28+jsonSize);
  assert(file.length<4*1024**2,'Each standalone GLB must fit below 4 MiB');
  return file;
}

function surfaceAt(grid,{diagonals,refinements},east,north){
  const {bounds:[w,,,n],step,columns,rows,elevations:z}=grid;
  const x=(east-w)/step,y=(n-north)/step;
  const col=Math.min(Math.floor(x),columns-2),row=Math.min(Math.floor(y),rows-2),u=x-col,v=y-row;
  const a=row*columns+col,b=a+1,c=a+columns,d=c+1;
  const cell=row*(columns-1)+col,refined=refinements.get(cell);
  if(!refined)return cellHeight(z[a],z[b],z[c],z[d],u,v,diagonals[cell]);
  return refinedCellHeight(z[a],z[b],z[c],z[d],u,v,refined);
}

function compareSurface(grid,mesh,reference){
  const {bounds:[w,,,n],step,columns,elevations}=reference;
  const errors=elevations.map((elevation,i)=>Math.abs(elevation-surfaceAt(grid,mesh,w+(i%columns)*step,n-Math.floor(i/columns)*step)));
  errors.sort();
  return {samples:errors.length,p50M:errors[Math.floor(errors.length*.5)],p95M:errors[Math.floor(errors.length*.95)],maxM:errors.at(-1)};
}

async function writeRaster(filename,grid){
  const {bounds:[west,,,north],step,columns,rows,elevations}=grid;
  const data=writeArrayBuffer(elevations,{width:columns,height:rows,BitsPerSample:[32],SampleFormat:[3],SamplesPerPixel:1,
    ModelPixelScale:[step,step,0],ModelTiepoint:[0,0,0,west,north,0],GTModelTypeGeoKey:1,GTRasterTypeGeoKey:2,
    ProjectedCSTypeGeoKey:25831,VerticalUnitsGeoKey:9001});
  const image=await (await fromArrayBuffer(data)).getImage();
  assert.equal(image.pixelIsArea(),false);
  assert.equal(image.getGeoKeys().ProjectedCSTypeGeoKey,25831);
  const restored=await image.readRasters({interleave:true});
  assert(restored.length===elevations.length&&restored.every((value,i)=>value===elevations[i]),'Exact GeoTIFF elevation round trip');
  await writeFile(new URL(filename,output),Buffer.from(data));
  return data.byteLength;
}

const sourceOverview=await readWindow(4,overviewBounds,8),overview=subset(sourceOverview,overviewBounds,32);
const sourceTiles=await readWindow(2,tileBounds,2);
const [left,south,right,north]=tileBounds;
const tiles=[{id:'foradada-nord',grid:subset(sourceTiles,[left,south,seamEasting,north],2)},
  {id:'agulles-nord',grid:subset(sourceTiles,[seamEasting,south,right,north],2)}];
const overviewBase=Math.floor(elevationRange(sourceOverview)[0])-75,tileBase=Math.floor(elevationRange(sourceTiles)[0])-20;
const baseline=triangulate(overview,overviewBase),overviewMesh=triangulate(overview,overviewBase,sourceOverview);
const overviewFile=glb(overviewMesh,overviewBase);
const overviewRange=elevationRange(overview);
for(const {z} of overviewMesh.refinements.values()){
  overviewRange[0]=Math.min(overviewRange[0],z);overviewRange[1]=Math.max(overviewRange[1],z);
}
for(const tile of tiles)tile.mesh=triangulate(tile.grid,tileBase);
const [westTile,eastTile]=tiles;
for(let row=0;row<westTile.grid.rows;row++){
  const w=3*((row+1)*westTile.grid.columns-1),e=3*row*eastTile.grid.columns;
  assert.deepEqual(westTile.mesh.positions.subarray(w,w+3),eastTile.mesh.positions.subarray(e,e+3));
}

await mkdir(new URL('tiles/',output),{recursive:true});
await writeFile(new URL('print.glb',output),overviewFile);
const report={source,crs:'EPSG:25831',verticalDatum,anchor,overview:{bounds:overviewBounds,stepM:overview.step,
  elevationRangeM:overviewRange,baseElevationM:overviewBase,byteLength:overviewFile.length,...audit(overviewMesh),
  interiorSamples:overviewMesh.refinements.size,baselineDifferenceFrom8m:compareSurface(overview,baseline,sourceOverview),
  differenceFrom8m:compareSurface(overview,overviewMesh,sourceOverview)},tiles:[],seam:{eastingM:seamEasting,nodes:westTile.grid.rows,maxDifferenceM:0}};
assert(report.overview.differenceFrom8m.p95M<report.overview.baselineDifferenceFrom8m.p95M,'Refinement improves agreement with source elevations.');
assert(report.overview.differenceFrom8m.maxM<=report.overview.baselineDifferenceFrom8m.maxM,'Refinement preserves the worst-case source agreement.');
for(const {id,grid,mesh} of tiles){
  const file=`tiles/${id}.glb`,raster=`tiles/${id}.tif`,bytes=glb(mesh,tileBase);
  const rasterByteLength=await writeRaster(raster,grid);
  await writeFile(new URL(file,output),bytes);
  report.tiles.push({id,file,raster,bounds:grid.bounds,stepM:grid.step,elevationRangeM:elevationRange(grid),baseElevationM:tileBase,
    byteLength:bytes.length,rasterByteLength,...audit(mesh),differenceFromOverview:compareSurface(overview,overviewMesh,grid)});
}
await writeFile(new URL('survey.json',output),JSON.stringify(report,null,2)+'\n');

const [w,s,e,n]=overviewBounds,ring=[[w,s],[e,s],[e,n],[w,n],[w,s]].map(toWGS84);
const bbox=[Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))];
const entry={type:'Feature',id:'montserrat',bbox,geometry:{type:'Polygon',coordinates:[ring]},properties:{
  kind:'terrain-overview',geometryType:'terrain',name:'Montserrat',place:'Montserrat, Catalonia, Spain',city:'Montserrat',country:'Spain',
  aliases:['Massís de Montserrat','Montserrat massif'],revision:'r1',anchor,height:overviewRange[1]-overviewBase,
  mesh:directory+'print.glb',byteLength:overviewFile.length,thumbnail:directory+'thumbnail.webp',
  license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0',attribution,sources:[metadata,park],
  terrainTiles:{epsg:25831,verticalDatum,tiles:report.tiles.map(({id,bounds,stepM,raster,rasterByteLength})=>
    ({id,bounds,step:stepM,data:directory+raster,byteLength:rasterByteLength}))}
}};
const index=new URL('catalog.geojson',root),catalog=JSON.parse(await readFile(index,'utf8')),at=catalog.features.findIndex(f=>f.id===entry.id);
if(at<0)catalog.features.push(entry);else catalog.features[at]=entry;
await writeFile(index,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
