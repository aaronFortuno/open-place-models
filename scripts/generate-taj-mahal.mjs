import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const id='taj-mahal',revision='r1',directory=`models/${id}/${revision}/`;
const root=new URL('../',import.meta.url),catalogue=new URL('catalog.geojson',root);
const layout=JSON.parse(await readFile(new URL(directory+'layout.json',root),'utf8'));
const {anchor,footprint,minarets,azimuth,baseElevation,replacement}=layout;
const [lon,lat]=anchor,k=111320*Math.cos(lat*Math.PI/180);
const groundPoint=([x,y])=>[(x-lon)*k,(lat-y)*111320];
const baseHeight=6.1,roof=31.2,height=73.1;
const api=await ManifoldModule();
api.setup();
const {Manifold,CrossSection,Mesh}=api;

function box(x0,x1,y0,y1,z0,z1){
  return Manifold.cube([x1-x0,y1-y0,z1-z0]).translate([x0,y0,z0]);
}
function extrude(points,depth){
  return CrossSection.ofPolygons([points],'EvenOdd').extrude(depth);
}
function plate(outline,h){
  return extrude(outline.map(([x,z])=>[x,-z]),h).rotate(-90,0,0);
}
function turned(x,z,profile,segments){
  const vertices=[],faces=[];
  for(const [y,radius] of profile)for(let i=0;i<segments;i++){
    const angle=(i+.5)*Math.PI*2/segments;
    vertices.push(x+radius*Math.cos(angle),y,z+radius*Math.sin(angle));
  }
  const top=(profile.length-1)*segments,centre=vertices.length/3;
  vertices.push(x,profile[0][0],z,x,profile.at(-1)[0],z);
  for(let i=0;i<segments;i++){
    const next=(i+1)%segments;
    faces.push(centre,i,next,centre+1,top+next,top+i);
    for(let row=0;row<top;row+=segments){
      const a=row+i,b=row+next;
      faces.push(a,a+segments,b,b,a+segments,b+segments);
    }
  }
  return new Manifold(new Mesh({numProp:3,vertProperties:Float32Array.from(vertices),triVerts:Uint32Array.from(faces)}));
}
function recess(x,floor,shoulder,peak,width,back){
  return extrude([[x-width,floor],[x+width,floor],[x+width,shoulder],
    [x+width*.69,shoulder+(peak-shoulder)*.56],[x,peak],
    [x-width*.69,shoulder+(peak-shoulder)*.56],[x-width,shoulder]],31-back).translate([0,0,back]);
}

const half=28.65,chamfer=7.3,edge=half-chamfer;
const octagon=[[-edge,-half],[edge,-half],[half,-edge],[half,edge],
  [edge,half],[-edge,half],[-half,edge],[-half,-edge]];
const body=plate(octagon,roof-baseHeight+.14).translate([0,baseHeight-.14,0]);
const portal=box(-8.75,8.75,baseHeight-.11,34.4,27.75,29.35);
const arch=recess(0,baseHeight+.12,23.55,32.15,6.65,23.2);
const sideArches=[-15.65,15.65].flatMap(x=>[
  recess(x,7.6,15.25,19.05,3.2,27.33),recess(x,20.25,25.85,28.9,3.2,27.33)
]);
const orientations=[0,90,180,270];
const walls=Manifold.union([body,...orientations.map(degrees=>portal.rotate(0,degrees,0))])
  .subtract(Manifold.union(orientations.flatMap(degrees=>
    [arch,...sideArches].map(opening=>opening.rotate(0,degrees,0)))));

const dome=turned(0,0,[
  [roof-.16,11.55],[39.95,11.72],[40.45,13.5],[46,14.65],[50.5,13.9],
  [55.55,10.05],[59.6,5.7],[63.3,1.75]
],24);
const finial=turned(0,0,[
  [63.12,1.21],[65.3,1.27],[66.5,.82],[68.1,1.04],[69.4,.63],[height,.62]
],8);

const chhatris=[];
for(const x of [-15.2,15.2])for(const z of [-15.2,15.2]){
  for(const dx of [-1.82,1.82])for(const dz of [-1.82,1.82]){
    chhatris.push(box(x+dx-.66,x+dx+.66,roof-.14,38.63,z+dz-.66,z+dz+.66));
  }
  chhatris.push(turned(x,z,[
    [38.45,3.36],[39.21,3.79],[40.08,3.65],[42.18,2.29],[43.7,.92],[44.72,.61]
  ],10));
}
const mausoleum=Manifold.union([walls,dome,finial,...chhatris]).rotate(0,180-azimuth,0);
const towers=minarets.map(point=>{
  const [x,z]=groundPoint(point);
  return turned(x,z,[
    [baseHeight-.15,2.92],[baseHeight+.78,2.88],[18.26,2.35],[18.62,2.91],[19.29,2.91],
    [19.51,2.23],[30.62,1.97],[30.96,2.57],[31.62,2.57],[31.86,1.87],
    [40.8,1.71],[41.14,2.27],[42.04,2.27],[42.32,1.72],[44.6,1.69],
    [45.37,1.92],[46.45,1.22],[47.1,.64]
  ],8);
});
const platform=plate(footprint.slice(0,-1).map(groundPoint),baseHeight);
const monument=Manifold.union([platform,mausoleum,...towers]).simplify(.035);
assert.equal(monument.status(),'NoError');
assert.equal(monument.decompose().length,1,'The four minarets and the tomb are attached to the platform');
assert(monument.volume()>60000);
for(const point of minarets){
  const [x,z]=groundPoint(point);
  assert(monument.rayCast([x,38,z-5],[x,38,z+5]).length>0,'A separate corner minaret is present');
}
assert.equal(monument.rayCast([0,20,34],[0,20,24.1]).length,0,'The main portal has a recess');
assert(monument.rayCast([0,20,24.1],[0,20,22]).length>0,'The portal has a back');
const {vertProperties:positions,triVerts:indices,mergeFromVert}=monument.getMesh();
assert.equal(mergeFromVert.length,0);
assert(positions.length/3<=65536);
const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
for(let i=0;i<positions.length;i++){
  min[i%3]=Math.min(min[i%3],positions[i]);
  max[i%3]=Math.max(max[i%3],positions[i]);
}
assert(Math.abs(min[1])<1e-5&&Math.abs(max[1]-height)<1e-5);
const shortIndices=Uint16Array.from(indices);
const binary=Buffer.concat([Buffer.from(positions.buffer),Buffer.from(shortIndices.buffer)]);
const attribution='Open Place Models contributors. Footprint and registration © OpenStreetMap contributors.';
const sources=[
  'https://ignca.gov.in/Asi_data/82052.pdf',
  'https://www.tajmahal.gov.in/the-taj-exteriors.aspx',
  'https://whc.unesco.org/en/list/252',
  'https://www.openstreetmap.org/way/375257537',
  'https://registry.opendata.aws/terrain-tiles/'
];
const document={
  asset:{version:'2.0',generator:'Open Place Models',copyright:attribution,extras:{previewDirection:[.45,.3,1]}},
  scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
  buffers:[{byteLength:binary.length}],
  bufferViews:[{buffer:0,byteLength:positions.byteLength,target:34962},
    {buffer:0,byteOffset:positions.byteLength,byteLength:shortIndices.byteLength,target:34963}],
  accessors:[{bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3',min,max},
    {bufferView:1,componentType:5123,count:indices.length,type:'SCALAR'}]
};
const json=Buffer.from(JSON.stringify(document)),jsonSize=(json.length+3)&~3,binSize=(binary.length+3)&~3;
const glb=Buffer.alloc(28+jsonSize+binSize);
glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
glb.writeUInt32LE(jsonSize,12);glb.write('JSON',16);glb.fill(0x20,20,20+jsonSize);json.copy(glb,20);
glb.writeUInt32LE(binSize,20+jsonSize);glb.write('BIN\0',24+jsonSize);binary.copy(glb,28+jsonSize);

const coordinates=[0,1].map(axis=>footprint.map(p=>p[axis]));
const bbox=[...coordinates.map(values=>Math.min(...values)),...coordinates.map(values=>Math.max(...values))];
const entry={type:'Feature',id,bbox,geometry:{type:'Polygon',coordinates:[footprint]},properties:{
  name:'Taj Mahal',place:'Agra, India',city:'Agra',country:'India',geometryType:'monument',aliases:['ताज महल','Tāj Maḥal'],
  revision,anchor,height,mesh:directory+'print.glb',thumbnail:directory+'thumbnail.webp',byteLength:glb.length,
  terrainBaseElevation:baseElevation,license:'CC-BY-4.0',spatialDataLicense:'ODbL-1.0',attribution,sources,
  replacement:{featureIds:replacement.map(String),families:[String(layout.platform)]}
}};
const index=JSON.parse(await readFile(catalogue,'utf8')),i=index.features.findIndex(feature=>feature.id===id);
if(i<0)index.features.push(entry);
else index.features[i]=entry;
await writeFile(new URL(entry.properties.mesh,root),glb);
await writeFile(catalogue,JSON.stringify(index,null,2)+'\n');
console.log(`${positions.length/3} vertices · ${indices.length/3} triangles · ${glb.length} bytes · ${monument.volume().toFixed(2)} m³`);
