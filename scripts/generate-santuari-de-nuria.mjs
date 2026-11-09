import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {openSolids,printGlb} from './monument-solids.mjs';

const id='santuari-de-nuria', revision='r1', path=`models/${id}/${revision}/`;
const folder=new URL(`../${path}`,import.meta.url);
const survey=JSON.parse(await readFile(new URL('survey.json',folder),'utf8'));
const {anchor,basis,footprint,foundation,tower}=survey;
const {Manifold,box,prism}=await openSolids();
const level=z=>z-foundation;
const block=([u0,u1,v0,v1],low,top)=>box(u0,u1,level(low),level(top),v0,v1);

function roofed({plan:[u0,u1,v0,v1],base,eaves,ridge,direction,peakAt,hips=[0,0]}) {
  const body=block([u0,u1,v0,v1],base,eaves);
  if(ridge===undefined)return body;
  const eave=level(eaves-.16),peak=level(ridge);
  const corners=[[u0-.23,eave,v0-.22],[u1+.23,eave,v0-.22],
    [u1+.23,eave,v1+.22],[u0-.23,eave,v1+.22]];
  const crown=direction==='u' ? [[u0+hips[0],peak,peakAt],[u1-hips[1],peak,peakAt]] :
    [[peakAt,peak,v0+hips[0]],[peakAt,peak,v1-hips[1]]];
  const roof=Manifold.hull([...corners,...crown]);
  return Manifold.union([body,roof]);
}

function arch(centre,width,spring,rise,foot,z0,z1) {
  const radius=width/2;
  const curve=Array.from({length:9},(_,i)=>{
    const angle=i*Math.PI/8;
    return [centre+radius*Math.cos(angle),level(spring+rise*Math.sin(angle))];
  });
  return prism([[centre-radius,level(foot)],[centre+radius,level(foot)],...curve],z0,z1);
}

const towerBlocks=[
  block([-3.34,1.68,-1.58,3.44],tower.base,1977.5),
  block([-3.13,1.49,-1.38,3.25],1977.34,1983.03),
  block([-2.94,1.29,-1.20,3.08],1982.90,tower.masonryTop-.31),
  block([-3.08,1.44,-1.33,3.21],tower.masonryTop-.55,tower.masonryTop),
  block([-3.28,1.64,-1.48,3.4],1982.55,1983.06),
];
const openings=[
  arch(-.68,2.37,1965.6,1.19,1962.48,2.48,4.0),
  ...[-1.55,.01].flatMap(c=>[
    arch(c,.80,1985.43,.39,1984.03,-2.5,3.75),
    arch(c+1.26,.80,1985.43,.39,1984.03,-2.25,3.95).rotate(0,-90,0),
  ]),
];
const clockCentre=[-.73,1978.97],clockRadius=.71;
const dial=prism(Array.from({length:14},(_,i)=>{
  const a=i*2*Math.PI/14;
  return [clockCentre[0]+clockRadius*Math.cos(a),level(clockCentre[1]+clockRadius*Math.sin(a))];
}),3.15,3.53);
const carillon=[
  block([-1.26,-.53,-.43,.42],tower.masonryTop-.16,1991.87),
  block([.52,1.25,-.43,.42],tower.masonryTop-.16,1991.87),
  block([-1.26,1.25,-.43,.42],1991.19,1991.87),
  block([-.34,.34,-.35,.35],1991.64,tower.apex),
];
const masonry=Manifold.difference([Manifold.union(towerBlocks),...openings]);
const ensemble=Manifold.union([...survey.bodies.map(roofed),...survey.frontage.map(roofed),masonry,dial,...carillon]);
assert.equal(ensemble.status(),'NoError');
assert.equal(ensemble.decompose().length,1);
const [[eu,su],[ev,sv]]=basis;
const positioned=ensemble.transform([eu,0,su,0,0,1,0,0,ev,0,sv,0,0,0,0,1]);
const attribution='Open Place Models contributors · ICGC · OpenStreetMap contributors';
const {glb,min,max,vertices,triangles}=printGlb(positioned,attribution,[.43,.37,1]);
const height=+(max[1]-min[1]).toFixed(3);
assert(Math.abs(min[1])<.001&&Math.abs(height-(tower.apex-foundation))<.002);

const sources=[
  'https://ajqueralbs.cat/coneix/llocs-dinteres/el-santuari-de-nuria/',
  'https://agenda.cultura.gencat.cat/ca/activitat.html/20200525004/santuari-de-la-mare-de-deu-de-nuria-el-ripolles',
  'https://xac.gencat.cat/ca/detalls/ActivitatAgenda/exposicio_Nuria1923',
  'https://contractaciopublica.cat/portal-api/descarrega-document/1329761/3012731EB8F1723B79458A0AB5903822',
  'https://turistren.cat/es/trenes/cremallera-de-nuria/',
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions',
  'https://www.openstreetmap.org/way/33115436',
];
const ring=footprint.coordinates[0], lon=ring.map(p=>p[0]),lat=ring.map(p=>p[1]);
const entry={type:'Feature',id,bbox:[Math.min(...lon),Math.min(...lat),Math.max(...lon),Math.max(...lat)],
  geometry:footprint,properties:{
    name:'Santuari de Núria',geometryType:'building',place:'Queralbs, Spain',city:'Queralbs',country:'Spain',
    aliases:['Santuari de la Mare de Déu de Núria','Basílica de Núria','Vall de Núria','Santuario de Nuria'],
    revision,anchor,anchorElevation:foundation,height,mesh:path+'print.glb',byteLength:glb.length,
    thumbnail:path+'thumbnail.webp',attribution,license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',sources,
    replacement:{featureIds:survey.replacement,families:['osm-way-33115436']},
  }};
await writeFile(new URL('print.glb',folder),glb);
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(entry,null,2)+'\n');
console.log({bytes:glb.length,vertices,triangles,height,min,max});
