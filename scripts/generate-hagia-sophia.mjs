import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {openSolids,printGlb} from './monument-solids.mjs';

const id='hagia-sophia',revision='r1',directory=`models/${id}/${revision}/`;
const root=new URL('../',import.meta.url),catalogue=new URL('catalog.geojson',root);
const layout=JSON.parse(await readFile(new URL(directory+'layout.json',root),'utf8'));
const {anchor,azimuth,baseElevation,footprint,minarets,replacement}=layout;
const [lon,lat]=anchor,k=111320*Math.cos(lat*Math.PI/180);
const project=([x,y])=>[(x-lon)*k,(lat-y)*111320];
const {Manifold,box,prism,plate,turned}=await openSolids();

// The building axis points toward the apse. The broad, lower aisles support
// the nave, the two half-domes and the much shallower main dome.
const lower=prism([[-37.1,.28],[37.2,.28],[37.2,20.5],[24.7,24.8],
  [-24.7,24.8],[-37.1,20.5]],-38.6,38.5);
const crossing=prism([[-22.6,29.6],[22.6,29.6],[22.6,37.4],[18.7,41.6],
  [-18.7,41.6],[-22.6,37.4]],-19.4,19.2);
const highNave=box(-22.8,22.8,23.6,30.95,-37.9,37.9);
const drum=turned(0,0,[[40.95,16.65],[43.4,16.65]],24,.965);
const mainDome=turned(0,0,[[43.13,16.35],[46.04,15.96],[49.08,14.46],
  [52.12,11.68],[54.68,7.7],[56.05,3.05],[56.32,.66],[58.15,.49]],24,.965);
const halfDomes=[];
for(const direction of [-1,1]){
  const z=direction*17.5;
  const half=turned(0,z,[[24.1,16.55],[28.9,16.55],[31.95,15.7],[35.3,12.1],
    [38.12,6.6],[39.1,.72]],18);
  halfDomes.push(half.intersect(direction>0?box(-20,20,22,40,z-.8,z+18):box(-20,20,22,40,z-18,z+.8)));
  for(const x of [-12.5,12.5]){
    halfDomes.push(turned(x,z+direction*9.8,[[25.8,6.3],[28.1,6.3],[31.15,4.8],[33.35,.72]],10));
  }
}
const apse=turned(0,37.1,[[.28,7.06],[28.4,7.06],[31.0,6.6],[33.2,4.0],[34.25,.64]],12,1.04);
const outerNarthex=prism([[-30,.28],[35.6,.28],[35.6,8.1],[-30,9.2]],-57.2,-49.05);
const innerNarthex=prism([[-36.35,.28],[37.25,.28],[37.25,20.25],[25.8,24.4],
  [-25.8,24.4],[-36.35,20.25]],-49.5,-38.28);
const buttresses=[];
for(const side of [-1,1]){
  for(const [z0,z1,reach,height] of [[-48.3,-39.7,44.5,17],[-21.8,-11.35,49.75,28],
    [-4,2.2,47.1,19.5],[10.4,19.4,48,29],[26.1,32.2,45.4,16.5]]){
    const section=[[33.8,.28],[reach,.28],[reach,height*.57],[43.1,height*.83],[33.8,height]];
    buttresses.push(prism(section.map(([x,y])=>[x*side,y]),z0,z1));
  }
}
const cornerRoofs=[
  box(-50.8,-33.5,.28,13.4,-56.1,-38),
  box(31.6,52.2,.28,14.8,-55.5,-39.2),
  box(-42,-25.2,.28,13.1,31.7,45.5),
  box(16.1,39.2,.28,10.1,37.3,55.6),
  box(-60.2,-45.3,.28,11.8,-33.2,-19.1)
];
const basilica=Manifold.union([lower,crossing,highNave,drum,mainDome,...halfDomes,apse,
  outerNarthex,innerNarthex,...buttresses,...cornerRoofs]).rotate(0,180-azimuth,0);

const towerSolids=minarets.flatMap(({anchor,height,radius,base})=>{
  const [x,z]=project(anchor),short=height<50,slender=radius<1.6;
  const podium=short?17.8:slender?18.5:21;
  const neck=short?22.8:slender?27.3:29.4;
  const balcony=height-(short?8.9:13.0);
  return [
    plate(base.slice(0,-1).map(project),podium),
    turned(x,z,[[podium-.2,radius+1.3],[podium+1.3,radius+1.06],[neck,radius],
      [balcony-1.3,radius*.92],[balcony-.4,radius+1.1],[balcony+.76,radius+1.1],
      [balcony+1.02,radius*.78],[height-(short?4.85:8.25),radius*.76],
      [height-(short?4.6:8.0),radius*.92],[height,.57]],10)
  ];
});
const foundation=plate(footprint.slice(0,-1).map(project),.52);
const model=Manifold.union([foundation,basilica,...towerSolids]).simplify(.055);
assert.equal(model.status(),'NoError');
assert.equal(model.decompose().length,1,'The complex and minarets must stay attached');
assert(model.rayCast([0,70,0],[0,50,0]).length>0,'Main dome');
for(const {anchor,height} of minarets){
  const [x,z]=project(anchor);
  assert(model.rayCast([x,height+1,z],[x,height-1,z]).length>0,'Four minaret tips');
}

const attribution='Open Place Models contributors. Footprint and registration © OpenStreetMap contributors.';
const sources=[
  'https://www.ktb.gov.tr/EN-113776/ayasofya-hagia-sophia.html',
  'https://projects.mcah.columbia.edu/medieval-architecture/htm/or/ma_or_discuss_hs_plan.htm',
  'https://repository.edition-topoi.org/collection/HASO/overview',
  'https://doi.org/10.1002/eqe.1115',
  'https://www.avanti-journals.com/index.php/ijaet/article/download/786/437',
  'https://www.openstreetmap.org/way/109862851',
  'https://registry.opendata.aws/terrain-tiles/'
];
const {glb,min,max,vertices,triangles}=printGlb(model,attribution,[1,.4,1.1]);
const height=Number(max[1].toFixed(2));
assert(Math.abs(min[1])<1e-5&&height===66.55);
const coords=[0,1].map(axis=>footprint.map(p=>p[axis]));
const bbox=[...coords.map(values=>Math.min(...values)),...coords.map(values=>Math.max(...values))];
const entry={type:'Feature',id,bbox,geometry:{type:'Polygon',coordinates:[footprint]},properties:{
  name:'Hagia Sophia',place:'Istanbul, Türkiye',city:'Istanbul',country:'Türkiye',geometryType:'monument',
  aliases:['Santa Sofia','Ayasofya','Ayasofya-i Kebir Cami-i Şerifi','Hagia Sophia Grand Mosque'],
  revision,anchor,height,mesh:directory+'print.glb',thumbnail:directory+'thumbnail.webp',byteLength:glb.length,
  terrainBaseElevation:baseElevation,license:'CC-BY-4.0',spatialDataLicense:'ODbL-1.0',attribution,sources,
  replacement:{featureIds:replacement.map(String),families:[String(layout.outline)]}
}};
const index=JSON.parse(await readFile(catalogue,'utf8')),i=index.features.findIndex(feature=>feature.id===id);
if(i<0)index.features.push(entry);
else index.features[i]=entry;
await writeFile(new URL(entry.properties.mesh,root),glb);
await writeFile(catalogue,JSON.stringify(index,null,2)+'\n');
console.log(`${vertices} vertices · ${triangles} triangles · ${glb.length} bytes · ${model.volume().toFixed(2)} m³`);
