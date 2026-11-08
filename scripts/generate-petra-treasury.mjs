import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const id='petra-treasury',revision='r1';
const root=new URL('../',import.meta.url),directory=`models/${id}/${revision}/`;
const revisionURL=new URL(directory,root),catalogue=new URL('catalog.geojson',root);
const reference=JSON.parse(await readFile(new URL('reference-ground.json',revisionURL),'utf8'));
const {anchor}=reference,[lon,lat]=anchor,longitudeMetres=111320*Math.cos(lat*Math.PI/180);
const azimuth=65*Math.PI/180,east=Math.sin(azimuth),north=Math.cos(azimuth);
const plaza=1011,side=97,step=1,half=(side-1)*step/2;
const toWorld=(across,forward)=>[-north*across+east*forward,-east*across-north*forward];
const toGeo=(x,z)=>[lon+x/longitudeMetres,lat-z/111320];
const smooth=(low,high,value)=>{
  const t=Math.max(0,Math.min(1,(value-low)/(high-low)));
  return t*t*(3-2*t);
};

function referenceHeight(x,z){
  const {side,step,elevations}=reference,half=(side-1)*step/2;
  const u=(x+half)/step,v=(z+half)/step,col=Math.min(Math.floor(u),side-2),row=Math.min(Math.floor(v),side-2);
  const a=u-col,b=v-row,i=row*side+col;
  return (1-b)*((1-a)*elevations[i]+a*elevations[i+1])+b*((1-a)*elevations[i+side]+a*elevations[i+side+1]);
}

function cliffHeight(x,z){
  const across=-north*x-east*z,forward=east*x-north*z;
  const lip=3.5+.005*across*across+.45*Math.sin(across/6);
  const floor=plaza+.025*forward-.018*across;
  const crest=43+.035*across+1.8*Math.cos(across/9);
  const cliff=floor+crest*(1-smooth(lip-1.8,lip+2.4,forward));
  const blend=1-smooth(25,46,Math.max(Math.abs(x),Math.abs(z)));
  const background=referenceHeight(x,z);
  return Math.round((background+(cliff-background)*blend)*100)/100;
}

const api=await ManifoldModule();
api.setup();
const {Manifold,CrossSection,Mesh}=api;
const union=solids=>Manifold.union(solids);
function solid(vertices,faces){
  const mesh=new Mesh({numProp:3,vertProperties:Float32Array.from(vertices),triVerts:Uint32Array.from(faces)});
  const model=new Manifold(mesh);
  assert.equal(model.status(),'NoError');
  assert(model.volume()>0);
  return model;
}
function box(x0,x1,y0,y1,z0,z1){
  return Manifold.cube([x1-x0,y1-y0,z1-z0]).translate([x0,y0,z0]);
}
function extrude(profile,z0,z1){
  return CrossSection.ofPolygons([profile],'EvenOdd').extrude(z1-z0).translate([0,0,z0]);
}
function turned(x,z,profile,segments){
  const vertices=[],faces=[];
  for(const [y,radius] of profile)for(let i=0;i<segments;i++){
    const angle=(i+.5)*Math.PI*2/segments;
    vertices.push(x+radius*Math.cos(angle),y,z+radius*Math.sin(angle));
  }
  const top=(profile.length-1)*segments,baseCentre=vertices.length/3;
  vertices.push(x,profile[0][0],z,x,profile.at(-1)[0],z);
  for(let i=0;i<segments;i++){
    const next=(i+1)%segments;
    faces.push(baseCentre,i,next,baseCentre+1,top+next,top+i);
    for(let row=0;row<top;row+=segments){
      const a=row+i,b=row+next;
      faces.push(a,a+segments,b,b,a+segments,b+segments);
    }
  }
  return solid(vertices,faces);
}

// Newton's plates XV–XVII set the column axes and the depths. The modern
// left inner column is present, whereas the 1910 elevation draws it dashed.
const lowerColumns=[-11.2,-6.75,-2.9,2.9,6.75,11.2].map(x=>turned(x,-.6,[
  [.42,.96],[.84,.96],[1.06,.75],[11.65,.68],[12.23,.94],[13.26,1.12]
],8));
const upperColumns=[-11.35,-6.63,-3.05,3.05,6.63,11.35].map(x=>turned(x,Math.abs(x)<4?-3.45:-1.4,[
  [18.93,.83],[19.38,.67],[26.85,.57],[27.52,.8],[28.37,.93]
],8));
const splitPediment=[[5.55,31.12],[12.6,31.12],[5.55,34.22]];
const stone=union([
  box(-13.2,13.2,-.12,.55,-6.2,1.1),
  ...lowerColumns,
  box(-12.55,12.55,12.98,15.86,-5.8,.41),
  box(-12.65,12.65,13.62,14.05,-4.35,.63),
  box(-12.91,12.91,15.56,16.21,-4.3,1.03),
  extrude([[-8.35,16.03],[8.35,16.03],[0,18.79]],-3.65,.86),
  box(-12.45,12.45,18.56,19.49,-5.9,.12),
  ...upperColumns,
  box(-12.16,12.16,28.05,30.75,-4.1,-.45),
  box(-12.38,12.38,28.75,29.13,-4.2,-.21),
  box(-12.65,12.65,30.62,31.32,-4.45,.02),
  extrude(splitPediment,-4.5,-.06),
  extrude(splitPediment.map(([x,y])=>[-x,y]),-4.5,-.06),
  turned(0,-3.75,[[19.14,2.8],[28.44,2.65],[30.82,3.46],[31.26,3.46],
    [33.9,1.2],[35.15,.81],[35.63,1.22],[36.02,1.22]],12),
  turned(0,-3.75,[[35.92,.62],[36.36,.7],[36.7,.87],[37.43,.91],
    [37.93,.53],[38.35,.59],[38.65,.29],[39.08,.23]],10)
]);

const clearing=union([
  extrude([[-13.15,.08],[13.22,.08],[13.8,17],[13.35,34.8],[12.2,40.3],
    [4.8,41.8],[-5.1,41.55],[-12.25,39.2],[-13.7,32.3],[-13.75,15.5]],-1.42,14),
  box(-5.45,5.45,.52,13.08,-6.55,-1.22),
  box(-2.14,2.14,1.08,10.64,-9.0,-6.40),
  box(-10.8,10.8,19.15,31.04,-4.5,-1.21),
  box(-5.25,5.25,30.81,40.61,-4.78,-1.22)
]);
const localVoid=clearing.subtract(stone);
assert.equal(localVoid.status(),'NoError');
assert(localVoid.volume()<clearing.volume());
const cutter=localVoid.rotate(0,115,0).translate([0,plaza,0]);
const {vertProperties:voidVertices,triVerts:voidFaces,mergeFromVert}=cutter.getMesh();
assert.equal(mergeFromVert.length,0);
assert(voidVertices.length<=3072&&voidFaces.length<=6144,
  `The cutter has ${voidVertices.length/3} vertices and ${voidFaces.length/3} triangles`);

function heightfield(side,step,elevations){
  const half=(side-1)*step/2,base=Math.floor(Math.min(...elevations))-3;
  const vertices=elevations.flatMap((height,i)=>[i%side*step-half,height,Math.floor(i/side)*step-half]),faces=[];
  for(let row=0;row<side-1;row++)for(let col=0;col<side-1;col++){
    const a=row*side+col,b=a+1,c=a+side;
    faces.push(a,c,b,b,c,c+1);
  }
  const edge=Array.from({length:side-1},(_,i)=>i),boundary=[
    ...edge,...edge.map(row=>row*side+side-1),...edge.map(col=>side*side-1-col),...edge.map(row=>(side-1-row)*side)
  ];
  for(const i of boundary)vertices.push(vertices[i*3],base,vertices[i*3+2]);
  const centre=vertices.length/3;
  vertices.push(0,base,0);
  for(let i=0;i<boundary.length;i++){
    const j=(i+1)%boundary.length,a=boundary[i],b=boundary[j],c=elevations.length+i,d=elevations.length+j;
    faces.push(a,b,c,b,d,c,c,d,centre);
  }
  return {terrain:solid(vertices,faces),base};
}
const samples=(side,step,project=(x,z)=>[x,z])=>{
  const half=(side-1)*step/2;
  return Array.from({length:side*side},(_,i)=>cliffHeight(...project(i%side*step-half,Math.floor(i/side)*step-half)));
};
const elevations=samples(side,step);
const {terrain,base}=heightfield(51,1,samples(51,1,toWorld));
const relief=terrain.rotate(0,115,0).subtract(cutter).simplify(.07);
assert.equal(relief.status(),'NoError');
assert(relief.volume()<terrain.volume());
assert.equal(relief.decompose().length,1,'The façade, cliff and floor are connected');
const at=(across,height,forward)=>{
  const [x,z]=toWorld(across,forward);
  return [x,plaza+height,z];
};
assert.equal(relief.rayCast(at(0,5,11),at(0,5,-7.5)).length,0,'Open portico and doorway');
assert(relief.rayCast(at(0,5,-7.5),at(0,5,-11)).length>0,'Closed interior');
assert(relief.rayCast(at(2.9,6,11),at(2.9,6,-2)).length>0,'Surviving foreground column');
assert(relief.rayCast(at(0,38.9,11),at(0,38.9,-4)).length>0,'Urn');
assert(relief.rayCast(at(0,39.6,0),at(0,46,0)).length>0,'Rock above the façade');

const attribution='Open Place Models contributors. Terrain reference: Mapzen Terrain Tiles, NASA SRTM. Placement © OpenStreetMap contributors.';
const {vertProperties:positions,triVerts:faces,mergeFromVert:unwelded}=relief.getMesh();
assert.equal(unwelded.length,0);
assert(positions.length/3<=65536);
const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
for(let i=0;i<positions.length;i++){
  if(i%3===1)positions[i]-=base;
  min[i%3]=Math.min(min[i%3],positions[i]);
  max[i%3]=Math.max(max[i%3],positions[i]);
}
const indices=Uint16Array.from(faces);
const binary=Buffer.concat([Buffer.from(positions.buffer),Buffer.from(indices.buffer)]);
const gltf={
  asset:{version:'2.0',generator:'Open Place Models',copyright:attribution,extras:{previewDirection:[1,.24,.04]}},
  scene:0,scenes:[{nodes:[0]}],
  nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],buffers:[{byteLength:binary.length}],
  bufferViews:[{buffer:0,byteLength:positions.byteLength,target:34962},
    {buffer:0,byteOffset:positions.byteLength,byteLength:indices.byteLength,target:34963}],
  accessors:[{bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3',min,max},
    {bufferView:1,componentType:5123,count:indices.length,type:'SCALAR'}]
};
const json=Buffer.from(JSON.stringify(gltf)),jsonSize=(json.length+3)&~3,binSize=(binary.length+3)&~3;
const glb=Buffer.alloc(28+jsonSize+binSize);
glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
glb.writeUInt32LE(jsonSize,12);glb.write('JSON',16);glb.fill(0x20,20,20+jsonSize);json.copy(glb,20);
glb.writeUInt32LE(binSize,20+jsonSize);glb.write('BIN\0',24+jsonSize);binary.copy(glb,28+jsonSize);

const bbox=[...toGeo(-half,half),...toGeo(half,-half)];
const footprint=[[-13,-8],[13,-8],[13,2],[-13,2],[-13,-8]].map(point=>toGeo(...toWorld(...point)));
const sources=[
  'https://archive.org/details/excavationsatain00mackrich',
  'https://www.loc.gov/item/2019698216/',
  'https://doi.org/10.1007/s00004-013-0164-6',
  'https://doi.org/10.1016/j.jhydrol.2021.126583',
  'https://registry.opendata.aws/terrain-tiles/',
  'https://www.openstreetmap.org/way/488848937'
];
const entry={type:'Feature',id,bbox,geometry:{type:'Polygon',coordinates:[footprint]},properties:{
  kind:'landform',geometryType:'monument',name:'Al-Khazneh',place:'Petra, Jordan',city:'Petra',country:'Jordan',
  aliases:['The Treasury','Al-Khazna','الخزنة'],revision,anchor,height:max[1],
  mesh:directory+'print.glb',byteLength:glb.length,thumbnail:directory+'thumbnail.webp',
  license:'CC-BY-4.0',spatialDataLicense:'ODbL-1.0',attribution,sources,
  replacement:{featureIds:['488848937','way/488848937']},
  landform:{data:directory+'terrain.json',verticalDatum:'EGM96 (approximate site registration)',minimumWidth:4.28}
}};
const terrainJSON=JSON.stringify({grid:{side,step,elevations},void:{
  vertices:Array.from(voidVertices,value=>Math.round(value*100000)/100000),faces:Array.from(voidFaces)
}})+'\n';
assert(Buffer.byteLength(terrainJSON)<256*1024);
const index=JSON.parse(await readFile(catalogue,'utf8')),i=index.features.findIndex(feature=>feature.id===id);
if(i<0)index.features.push(entry);
else index.features[i]=entry;
await writeFile(new URL('terrain.json',revisionURL),terrainJSON);
await writeFile(new URL('print.glb',revisionURL),glb);
await writeFile(catalogue,JSON.stringify(index,null,2)+'\n');
console.log(`${faces.length/3} triangles · ${glb.length} bytes · ${voidFaces.length/3} cutter triangles`);
