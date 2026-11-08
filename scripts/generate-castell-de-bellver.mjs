import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {openSolids,printGlb} from './monument-solids.mjs';

const id='castell-de-bellver',revision='r1',asset=`models/${id}/${revision}/`;
const directory=new URL('../'+asset,import.meta.url);
const survey=JSON.parse(await readFile(new URL('survey-layout.json',directory),'utf8'));
const {anchor,footprint,foundation,flankTowers,keep}=survey;
const {Manifold,turned,prism,box}=await openSolids();
const up=z=>z-foundation;
const turn=(x,south,profile,segments)=>turned(x,south,profile.map(([h,r])=>[up(h),r]),segments);

const drum=turn(0,0,[[foundation,25.1],[108.1,25.2],[124.6,24.77],[125.5,25.05],[127.2,25.05]],48);
const court=turn(0,0,[[foundation-1,13.58],[129,13.58]],48);
const terrace=turn(0,0,[[125.45,24.05],[129,24.05]],48)
  .subtract(turn(0,0,[[125,14.2],[130,14.2]],48));
const ring=drum.subtract(court).subtract(terrace);
const turrets=flankTowers.map(([x,south,top])=>turn(x,south,[
  [foundation+.45,4.1],[110,4.12],[top-1,3.78],[top-.7,4.07],[top,4.07]
],16));

const [kx,kz]=keep;
const tower=turn(kx,kz,[
  [foundation+.42,5.6],[108.1,5.6],[135.4,5.16],[137.95,5.16],
  [139.14,5.72],[140.6,5.72]
],24).subtract(turn(kx,kz,[[139.2,4.68],[142,4.68]],24));
const bridge=box(-1.8,.85,up(111.3),up(128.15),-33.25,-23.65);
const arch=prism([
  [-31.6,up(110.5)],[-25.32,up(110.5)],[-25.32,up(119.8)],[-26.2,up(122.3)],
  [-28.44,up(124.45)],[-30.7,up(122.3)],[-31.6,up(119.8)]
],-2,2.9).rotate(0,-90,0);

const loggia=Array.from({length:10},(_,i)=>prism([
  [-1.3,up(115.8)],[1.3,up(115.8)],[1.3,up(119)],[.8,up(120.1)],
  [0,up(120.75)],[-.8,up(120.1)],[-1.3,up(119)]
],12.72,14.58).rotate(0,18+i*36,0));
const wall=Manifold.union([ring,...turrets,tower,bridge]);
const model=wall.subtract(Manifold.union([arch,...loggia])).simplify(.035);
assert.equal(model.status(),'NoError');
assert.equal(model.decompose().length,1,'The bridge must join the keep to the main ring');
assert.equal(model.rayCast([0,up(132),0],[0,-1,0]).length,0,'The central courtyard stays open');
assert.equal(model.rayCast([-3,up(121),-28.4],[3,up(121),-28.4]).length,0,'The arch remains open');
assert(model.rayCast([-3,up(126.8),-28.4],[3,up(126.8),-28.4]).length>0,'The arch supports the deck');

const attribution='Open Place Models contributors (reconstruction); PNOA LiDAR and orthophoto © Instituto Geográfico Nacional de España; footprint © OpenStreetMap contributors (ODbL 1.0).';
const {glb,min,max,vertices,triangles}=printGlb(model,attribution,[1,.66,-.77]);
assert(Math.abs(min[1])<.001);
const points=footprint.flat(2);
const bbox=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),
  Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
const entry={type:'Feature',id,bbox,geometry:{type:'MultiPolygon',coordinates:footprint},properties:{
  name:'Castell de Bellver',place:'Palma, Mallorca, Spain',city:'Palma',country:'Spain',
  aliases:['Castillo de Bellver','Bellver Castle','Torre de l’Homenatge'],geometryType:'monument',
  revision,anchor,anchorElevation:foundation,height:Number(max[1].toFixed(3)),
  mesh:asset+'print.glb',thumbnail:asset+'thumbnail.webp',byteLength:glb.length,
  license:'CC-BY-4.0',spatialDataLicense:'ODbL-1.0',attribution,
  replacement:{featureIds:['osm-relation-6214762','osm-way-55170713']},
  sources:[
    'https://www.palmaeduca.cat/p_activitats/docs/Guia%20did%C3%A0ctica%20HCHC%20Edat%20Mitjana.pdf',
    'https://palmacultura.cat/documentos/D_2873.pdf',
    'https://www.illesbalears.travel/es/mallorca/castillo-bellver',
    'https://pnoa.ign.es/pnoa-lidar/productos-a-descarga',
    'https://www.ign.es/web/ign/portal/ide-area-nodo-ide-ign',
    'https://www.openstreetmap.org/relation/6214762',
    'https://www.openstreetmap.org/way/55170713'
  ]
}};
await writeFile(new URL('print.glb',directory),glb);
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(entry,null,2)+'\n');
console.log({bytes:glb.length,vertices,triangles,min,max,volume:model.volume()});
