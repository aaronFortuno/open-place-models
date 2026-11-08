import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const id='balma-de-can-sola',revision='r1',directory=`models/${id}/${revision}/`;
const root=new URL('../',import.meta.url),catalogue=new URL('catalog.geojson',root);
const sidecar=new URL(directory+'terrain.json',root);
const anchor=[1.748989,41.599378],side=129,step=1.5,half=(side-1)*step/2;
const input=JSON.parse(await readFile(process.argv[2]||sidecar,'utf8'));
const grid=input.grid??input;
assert.equal(grid.side,side);
assert.equal(grid.step,step);
assert.equal(grid.elevations.length,side*side);
assert(grid.elevations.every(Number.isFinite));
if(input.anchor)assert.deepEqual(input.anchor,anchor);
const {elevations}=grid,base=Math.floor(Math.min(...elevations))-5;

const api=await ManifoldModule();
api.setup();
function solid(vertices,faces){
  const mesh=new api.Mesh({numProp:3,vertProperties:Float32Array.from(vertices),triVerts:Uint32Array.from(faces)});
  const result=new api.Manifold(mesh);
  assert.equal(result.status(),'NoError');
  assert(result.volume()>0);
  return result;
}

const ground=elevations.flatMap((y,i)=>[i%side*step-half,y,Math.floor(i/side)*step-half]),faces=[];
for(let row=0;row<side-1;row++)for(let col=0;col<side-1;col++){
  const a=row*side+col,b=a+1,c=a+side,d=c+1;
  faces.push(a,c,b,b,c,d);
}
const edge=Array.from({length:side-1},(_,i)=>i),boundary=[
  ...edge,...edge.map(row=>row*side+side-1),...edge.map(col=>side*side-1-col),
  ...edge.map(row=>(side-1-row)*side)
];
for(const index of boundary)ground.push(ground[index*3],base,ground[index*3+2]);
const center=ground.length/3;
ground.push(0,base,0);
for(let i=0;i<boundary.length;i++){
  const j=(i+1)%boundary.length,a=boundary[i],b=boundary[j],c=elevations.length+i,d=elevations.length+j;
  faces.push(a,b,c,b,d,c,c,d,center);
}

// South, east at the cliff lip, floor elevation, mouth height and depth.
// The lip follows the surveyed terrain break. The inner profiles are modelled
// within the published dimensions, using the exterior foot to place the floor.
const stations=[
  [-56,36,573.5,.3,1],[-49,29,573.4,5,12],[-39,19.5,572,8,20],
  [-28,11.4,570,11.4,26],[-18,4.5,568.8,13.4,33],[-8,-3.6,567.8,15,34],
  [1,-7.6,566.5,15,33],[11,-9,565.5,15,33],[21,-8.3,569,13,30],
  [32,-10.5,574,10.5,22],[43,-10.5,577,8,14],[55,-10.5,577.5,.3,1]
];
const profile=[[0,0],[.2,.01],[.65,.08],[.9,.18],[1,.30],[.99,.43],
  [.93,.56],[.72,.76],[.4,.90],[.12,.98],[0,1]];
const rings=stations.map(([south,lip,floor,height,depth])=>{
  const outside=Math.min(22,depth);
  return [[lip+outside,floor-.2,south],...profile.map(([t,z])=>[
    lip-t*depth,floor+height*z,south
  ]),[lip+outside,floor+height,south]];
});
const cutterVertices=rings.flat(2),cutterFaces=[],ring=rings[0].length,end=(rings.length-1)*ring;
for(let row=0;row<end;row+=ring)for(let i=0;i<ring;i++){
  const a=row+i,b=row+(i+1)%ring;
  cutterFaces.push(a,a+ring,b+ring,a,b+ring,b);
}
// Use a point strictly inside the cross-section to triangulate the end caps.
for(const [index,offset,reverse] of [[0,0,false],[stations.length-1,end,true]]){
  const [south,lip,floor,height]=stations[index],middle=cutterVertices.length/3;
  cutterVertices.push(lip,floor+height*.5,south);
  for(let i=0;i<ring;i++){
    const a=offset+i,b=offset+(i+1)%ring;
    cutterFaces.push(middle,reverse?b:a,reverse?a:b);
  }
}

const original=solid(ground,faces),cutter=solid(cutterVertices,cutterFaces);
const rock=original.subtract(cutter);
assert.equal(rock.status(),'NoError');
assert(rock.volume()<original.volume());
const components=rock.decompose();
assert.equal(components.length,1,'The roof stays attached to the hillside');
assert.equal(rock.genus(),0,'The recess is open at the front and closed at the back');
for(const index of [5,6,7]){
  const [south,lip,floor,height,depth]=stations[index],testY=floor+height*.45;
  const start=[lip+15,testY,south],inside=[lip-depth*.45,testY,south];
  assert(original.rayCast(start,inside).length>0,'The elevation grid fills the recess before the cut');
  assert.equal(rock.rayCast(start,inside).length,0,'Access from open air into the recess');
  assert(rock.rayCast(inside,[lip-depth-4,testY,south]).length>0,'Back wall');
  assert(rock.rayCast(inside,[inside[0],testY+40,south]).length>0,'Roof');
  assert(rock.rayCast(inside,[inside[0],floor-8,south]).length>0,'Floor');
}
const {vertProperties:positions,triVerts:indices,mergeFromVert}=rock.getMesh();
const {vertProperties:voidVertices,triVerts:voidFaces}=cutter.getMesh();
assert.equal(mergeFromVert.length,0,'Welded output');
assert(positions.length/3<=65536,'16-bit index budget');
for(const item of [...components,rock,original,cutter])item.delete();
const coordinates=[0,1,2].map(axis=>positions.filter((_,i)=>i%3===axis));
for(let i=1;i<positions.length;i+=3)positions[i]-=base;
const min=[Math.min(...coordinates[0]),0,Math.min(...coordinates[2])];
const max=[Math.max(...coordinates[0]),Math.max(...coordinates[1])-base,Math.max(...coordinates[2])];
const shortIndices=Uint16Array.from(indices),vertexBytes=positions.byteLength;
const binary=Buffer.concat([Buffer.from(positions.buffer),Buffer.from(shortIndices.buffer)]);
const attribution='Open Place Models contributors. Surface elevations © Institut Cartogràfic i Geològic de Catalunya, CC BY 4.0.';
const document={
  asset:{version:'2.0',generator:'Open Place Models',copyright:attribution,extras:{baseElevation:base,verticalDatum:'EGM08D595'}},
  scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
  buffers:[{byteLength:binary.length}],bufferViews:[
    {buffer:0,byteLength:vertexBytes,target:34962},
    {buffer:0,byteOffset:vertexBytes,byteLength:shortIndices.byteLength,target:34963}
  ],
  accessors:[{bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3',min,max},
    {bufferView:1,componentType:5123,count:indices.length,type:'SCALAR'}]
};
const json=Buffer.from(JSON.stringify(document)),jsonSize=(json.length+3)&~3,binSize=(binary.length+3)&~3;
const glb=Buffer.alloc(28+jsonSize+binSize);
glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
glb.writeUInt32LE(jsonSize,12);glb.write('JSON',16);glb.fill(0x20,20,20+jsonSize);json.copy(glb,20);
glb.writeUInt32LE(binSize,20+jsonSize);glb.write('BIN\0',24+jsonSize);binary.copy(glb,28+jsonSize);

const [lon,lat]=anchor,dx=half/(111320*Math.cos(lat*Math.PI/180)),dy=half/111320;
const bbox=[lon-dx,lat-dy,lon+dx,lat+dy],[w,s,e,n]=bbox;
const sources=[
  'https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat',
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-cartografica/Noms-geografics',
  'https://patrimonicultural.diba.cat/print/pdf/node/74391',
  'https://espeleoindex.com/cavitat/can-sola-balma-de-1518/'
];
const entry={type:'Feature',id,bbox,geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]},properties:{
  kind:'landform',geometryType:'terrain',name:'Balma de Can Solà',place:'El Bruc, Catalonia, Spain',city:'El Bruc',country:'Spain',
  aliases:['Bauma de Can Solà','Balma de Can Solà del Pla'],revision,anchor,height:max[1],
  mesh:directory+'print.glb',byteLength:glb.length,thumbnail:directory+'thumbnail.webp',
  license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0',attribution,sources,
  landform:{data:directory+'terrain.json',verticalDatum:'EGM08D595',minimumWidth:12}
}};
const index=JSON.parse(await readFile(catalogue,'utf8')),i=index.features.findIndex(feature=>feature.id===id);
if(i<0)index.features.push(entry);
else index.features[i]=entry;
const terrain=JSON.stringify({grid:{side,step,elevations},void:{
  vertices:Array.from(voidVertices,value=>Math.round(value*10000)/10000),faces:Array.from(voidFaces)
}})+'\n';
assert(Buffer.byteLength(terrain)<256*1024);
await mkdir(new URL(directory,root),{recursive:true});
await writeFile(sidecar,terrain);
await writeFile(new URL(entry.properties.mesh,root),glb);
await writeFile(catalogue,JSON.stringify(index,null,2)+'\n');
console.log(`${indices.length/3} triangles · ${glb.length} bytes · clear approach at three cross-sections`);
