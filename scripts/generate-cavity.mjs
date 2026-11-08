import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {openSolids,printGlb} from './monument-solids.mjs';

const [id,input]=process.argv.slice(2);
assert(/^[a-z0-9-]+$/.test(id??''),'Pass the catalogue id of a cavity');
const revision='r1',directory=`models/${id}/${revision}/`;
const root=new URL('../',import.meta.url),catalogue=new URL('catalog.geojson',root),sidecar=new URL(directory+'terrain.json',root);
const layout=JSON.parse(await readFile(new URL(directory+'profile.json',root),'utf8'));
const terrainInput=JSON.parse(await readFile(input??sidecar,'utf8'));
const grid=terrainInput.grid??terrainInput,{side,step,elevations}=grid;
assert(Number.isInteger(side)&&side>=3&&side<=129&&side%2===1);
assert(Number.isFinite(step)&&step>=.25&&step<=10);
assert(elevations.length===side*side&&elevations.every(Number.isFinite));
if(terrainInput.anchor)assert.deepEqual(terrainInput.anchor,layout.anchor);
const {anchor,azimuth,galleryHalf,galleryTop,minimumWidth,profiles,lofts,rays}=layout;
const half=(side-1)*step/2,trim=(galleryHalf/step);
assert(Number.isInteger(trim)&&trim>=2&&trim<=half/step);
const angle=(180-azimuth)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
const at=([x,y,depth])=>[c*x-s*depth,y,-s*x-c*depth];
const {Manifold,box,mesh}=await openSolids();

function loft(stations){
  const rings=stations.map(([depth,centre,floor,height,width,profile])=>
    profiles[profile].map(([x,y])=>at([centre+x*width/2,floor+y*height,depth])));
  const vertices=rings.flat(2),faces=[],n=rings[0].length,last=(rings.length-1)*n;
  assert(rings.every(ring=>ring.length===n));
  for(let row=0;row<last;row+=n)for(let i=0;i<n;i++){
    const a=row+i,b=row+(i+1)%n;
    faces.push(a,a+n,b+n,a,b+n,b);
  }
  for(const [index,row] of [[0,0],[stations.length-1,last]]){
    const [depth,centre,floor,height]=stations[index],middle=vertices.length/3;
    vertices.push(...at([centre,floor+height/2,depth]));
    for(let i=0;i<n;i++){
      const a=row+i,b=row+(i+1)%n;
      faces.push(middle,row?b:a,row?a:b);
    }
  }
  const result=mesh(vertices,faces);
  assert.equal(result.status(),'NoError');
  assert(result.volume()>0);
  return result;
}
const cutter=Manifold.union(lofts.map(loft));
assert.equal(cutter.status(),'NoError');
const {vertProperties:voidVertices,triVerts:voidFaces,mergeFromVert}=cutter.getMesh();
assert.equal(mergeFromVert.length,0);
assert(voidVertices.length<=3072&&voidFaces.length<=6144);

function terrainSolid(){
  const width=trim*2+1,start=(side-width)/2,heights=Array.from({length:width*width},(_,i)=>
    elevations[(Math.floor(i/width)+start)*side+i%width+start]);
  const base=Math.floor(Math.min(...heights))-2,vertices=heights.flatMap((y,i)=>[
    i%width*step-galleryHalf,y,Math.floor(i/width)*step-galleryHalf
  ]),faces=[];
  for(let row=0;row<width-1;row++)for(let col=0;col<width-1;col++){
    const a=row*width+col,b=a+1,d=a+width;
    faces.push(a,d,b,b,d,d+1);
  }
  const edge=Array.from({length:width-1},(_,i)=>i),boundary=[
    ...edge,...edge.map(row=>row*width+width-1),...edge.map(col=>width*width-1-col),
    ...edge.map(row=>(width-1-row)*width)
  ];
  for(const i of boundary)vertices.push(vertices[i*3],base,vertices[i*3+2]);
  const centre=vertices.length/3;
  vertices.push(0,base,0);
  for(let i=0;i<boundary.length;i++){
    const j=(i+1)%boundary.length,a=boundary[i],b=boundary[j],d=heights.length+i,e=heights.length+j;
    faces.push(a,b,d,b,e,d,d,e,centre);
  }
  return {base,ground:mesh(vertices,faces)};
}
const {base,ground}=terrainSolid(),edge=galleryHalf+1;
assert.equal(ground.status(),'NoError');
const terrain=Number.isFinite(galleryTop)?ground.intersect(box(-edge,edge,base-1,galleryTop,-edge,edge)):ground;
const relief=terrain.subtract(cutter).simplify(.055);
assert.equal(relief.status(),'NoError');
assert(relief.volume()<terrain.volume());
assert.equal(relief.decompose().length,1,'The roof and floor stay connected to the hillside');
for(const [name,ray] of Object.entries(rays)){
  const count=relief.rayCast(...ray.map(at)).length;
  if(name==='entry'){
    assert(terrain.rayCast(...ray.map(at)).length>0,'The source terrain fills the entrance');
    assert.equal(count,0,'The approach and entrance are open');
  }else assert(count>0,`The ${name} is present`);
}

const attribution='Open Place Models contributors. Terrain elevations © Institut Cartogràfic i Geològic de Catalunya, CC BY 4.0.';
const {glb,min,max,vertices,triangles}=printGlb(relief.translate([0,-base,0]),attribution,layout.camera);
assert(Math.abs(min[1])<1e-5);
const [lon,lat]=anchor,dx=half/(111320*Math.cos(lat*Math.PI/180)),dy=half/111320;
const bbox=[lon-dx,lat-dy,lon+dx,lat+dy],[w,south,e,n]=bbox;
const entry={type:'Feature',id,bbox,geometry:{type:'Polygon',coordinates:[[[w,south],[e,south],[e,n],[w,n],[w,south]]]},properties:{
  kind:'landform',geometryType:'terrain',name:layout.name,place:layout.place,city:layout.city,country:layout.country,
  aliases:layout.aliases,revision,anchor,height:Number(max[1].toFixed(4)),mesh:directory+'print.glb',
  byteLength:glb.length,thumbnail:directory+'thumbnail.webp',license:'CC-BY-4.0',
  spatialDataLicense:'CC-BY-4.0',attribution,sources:layout.sources,
  landform:{data:directory+'terrain.json',verticalDatum:'EGM08D595',minimumWidth}
}};
const terrainJSON=JSON.stringify({grid:{side,step,elevations},void:{
  vertices:Array.from(voidVertices,value=>Math.round(value*100000)/100000),faces:Array.from(voidFaces)
}})+'\n';
assert(Buffer.byteLength(terrainJSON)<256*1024);
const index=JSON.parse(await readFile(catalogue,'utf8')),existing=index.features.findIndex(feature=>feature.id===id);
if(existing<0)index.features.push(entry);
else index.features[existing]=entry;
await writeFile(sidecar,terrainJSON);
await writeFile(new URL(entry.properties.mesh,root),glb);
await writeFile(catalogue,JSON.stringify(index,null,2)+'\n');
console.log(`${vertices} vertices · ${triangles} triangles · ${glb.length} bytes · ${voidFaces.length/3} cutter triangles`);
