import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {printGlb} from './monument-solids.mjs';
import {westminsterSolids} from './westminster-solids.mjs';

const id='palace-of-westminster',revision='r1',directory=`models/${id}/${revision}/`;
const root=new URL('../',import.meta.url);
const layout=JSON.parse(await readFile(new URL(directory+'survey-layout.json',root),'utf8'));
const {Manifold,CrossSection,box,prism,turned,height,section,rectangle,column,gable,geometry,bounds}=await westminsterSolids(layout);
const points=id=>layout.sourceWays[id].points;
const outline=id=>section([points(id)]).simplify(.46);
const courtRings=layout.palaceRelation.members.filter(member=>member.role==='inner').map(({ref})=>points(ref));
const bigBen=outline(123557148);
const core=section([points(367642719),...courtRings]).simplify(.87).subtract(bigBen);
const victoria=outline(367642689);
const hall=outline(367642704);
const stephen=CrossSection.union([outline(367642699),outline(367642700),rectangle(-42,-38,-7,6)]);
const hallJoin=rectangle(-59,-42,-11.5,-6.6);
const river=CrossSection.union(layout.waterfront.polygons.map(section)).offset(layout.waterfront.margin,'Miter');
const footprint=CrossSection.union([core,victoria,hall,stephen,hallJoin]).subtract(bigBen).subtract(river);
const envelope=column(footprint,126);

const roofParts=[
  gable(-9.8,11.6,-88,111,21.7,25.0,31.4,'v'),
  gable(25,47.9,-104.5,109.6,21.8,25.7,30.5,'v'),
  gable(-42.6,-24.1,8.3,111.7,21.7,26.6,34.0,'v'),
  gable(-11.8,5.4,-138.8,-83.2,21.7,24.5,29.2,'v'),
  gable(36.1,58.4,-133.5,-102.1,21.8,29.2,36.6,'v'),
  gable(35.7,59.2,106.3,136.6,21.8,27.5,35.0,'v'),
];
for(const [v0,v1,ridge] of [[-135,-122,28.2],[-90,-78,31.8],[-43,-32,32.4],[-9,8,33.8],
  [29,44,34.1],[77,89,30.9],[125,137,29.1]]){
  roofParts.push(gable(-46,58.5,v0,v1,21.7,24.6,ridge));
}
const roofs=Manifold.union(roofParts).intersect(column(core,44.5));
const palaceBase=column(core,22.8);

const hallRoof=gable(-12.6,12.6,-35.0,40.7,18.8,20.1,31.2,'v')
  .rotate(0,-4.8,0).translate([-49.4,0,-50.8]).intersect(column(hall,33));
const hallFront=gable(-62,-36,-89.0,-84.8,18.2,23.2,34.3,'v').intersect(column(hall,35));
const hallEndTowers=[[-59,-86],[-38.4,-85.7]].map(([u,v])=>box(u-2.5,u+2.5,0,height(29.5),v-2.4,v+2.4)
  .intersect(column(hall,30)));
const stephenRoof=gable(-75.0,-10.1,-8.6,8.0,22.1,30.4,37.8).intersect(column(stephen,39));

function riverEdge(v){
  const ring=points(367642719),hits=[];
  for(let i=0;i<ring.length;i++){
    const [a,z]=ring[i],[b,w]=ring[(i+1)%ring.length];
    if((z<=v&&w>v)||(w<=v&&z>v))hits.push(a+(b-a)*(v-z)/(w-z));
  }
  return Math.max(...hits);
}
const riverTurrets=[];
for(let v=-127.5;v<=132;v+=8.75){
  const u=riverEdge(v)-.84;
  const prominent=[-127.5,-101.25,-40,-5,38.75,100,126.25].some(key=>Math.abs(key-v)<3.2);
  const top=prominent?40.2:32.5;
  riverTurrets.push(turned(u,v,[[height(21.9),1.78],[height(27),1.78],[height(top-2.9),1.51],[height(top),.45]],4));
}

const central=[
  turned(1.65,1.15,[[height(20),11.3],[height(39.1),11.3],[height(47.8),8.25],[height(57),8.25]],8),
  turned(1.65,1.15,[[height(56),7.72],[height(63.8),7.5],[height(66.0),6.4],[height(95.8),.56]],8),
];
for(const angle of [0,90,180,270]){
  const a=angle*Math.PI/180,u=1.65+7.15*Math.cos(a),v=1.15+7.15*Math.sin(a);
  central.push(turned(u,v,[[height(45),1.98],[height(61.7),1.68],[height(66.4),.3]],4));
}
const [vu,vv]=[-29.0,123.55];
const victoriaTower=[
  column(victoria,78.5),
  box(vu-9.8,vu+9.8,height(75),height(86.8),vv-10,vv+10),
  turned(vu,vv,[[height(84.2),13.38],[height(88.5),12.8],[height(94.0),5.2],[height(96.5),2.3]],4),
  turned(vu,vv,[[height(95.5),1.2],[height(104.0),.94],[height(124.9),.5]],8),
];
for(const du of [-8.9,8.9])for(const dv of [-9.1,9.1]){
  victoriaTower.push(turned(vu+du,vv+dv,[
    [height(39),3.28],[height(82.5),3.28],[height(85.5),3.03],
    [height(94.1),2.28],[height(99.3),1.5],[height(102.9),.43],
  ],8));
}
function westRecess(u0,u1,v,width,sill,spring,tip){
  const [a,b]=[-v-width/2,-v+width/2];
  return prism([[a,height(sill)],[b,height(sill)],[b,height(spring)],[-v,height(tip)],[a,height(spring)]],u0,u1)
    .rotate(0,90,0);
}
const towerOpenings=[westRecess(-45,-32.6,vv,9.9,3.8,17.2,24.5)];
for(const v of [vv-4.0,vv+4.0])towerOpenings.push(westRecess(-44,-36.4,v,2.95,52.0,69.3,73.4));
const royalTower=Manifold.union(victoriaTower).subtract(Manifold.union(towerOpenings));

const parts=[palaceBase,roofs,column(hall,19.9),hallRoof,hallFront,...hallEndTowers,column(hallJoin,24),
  column(stephen,24.7),stephenRoof,...riverTurrets,...central,royalTower];
const assembled=Manifold.union(parts).intersect(envelope);
for(const part of parts)part.delete();
const simplified=assembled.simplify(.09);
assembled.delete();
const components=simplified.decompose();
assert.equal(components.length,1,`Disconnected components: ${JSON.stringify(components.map(part=>[part.volume(),part.boundingBox()]))}`);
for(const component of components)component.delete();
const finished=simplified.rotate(0,-layout.yaw,0);
simplified.delete();
const attribution='Open Place Models contributors (original reconstruction); © Environment Agency copyright and/or database right 2022 (OGL v3.0); footprint © OpenStreetMap contributors (ODbL 1.0).';
const {glb,min,max,vertices,triangles}=printGlb(finished,attribution,[1.3,.77,1.0]);
assert(Math.abs(min[1])<.001);
assert(Math.abs(max[1]-height(124.9))<.01);
await writeFile(new URL(directory+'print.glb',root),glb);

if(process.argv[2]){
  const modelPlan=geometry(footprint.simplify(.58).subtract(river));
  const replacement=['osm-relation-1567699','osm-way-367642689','osm-way-367642704','osm-way-367642699','osm-way-367642700'];
  const entry={
    type:'Feature',id,bbox:bounds(modelPlan,min,max),geometry:modelPlan,
    properties:{
      name:'Palace of Westminster',aliases:['Houses of Parliament','Victoria Tower','Palau de Westminster'],
      geometryType:'building',place:'London, United Kingdom',city:'London',country:'United Kingdom',revision,
      anchor:layout.anchor,anchorElevation:layout.anchorElevation,height:+max[1].toFixed(3),
      mesh:directory+'print.glb',thumbnail:directory+'thumbnail.webp',byteLength:glb.length,
      license:'CC-BY-4.0',spatialDataLicense:'ODbL-1.0',attribution,
      replacement:{featureIds:replacement,families:replacement},
      sources:[
        'https://www.parliament.uk/about/living-heritage/building/palace/architecture/the-palace-today/',
        'https://www.parliament.uk/about/living-heritage/building/palace/architecture/palacestructure/new-gothic-vision/',
        'https://www.parliament.uk/about/living-heritage/building/palace/architecture/palacestructure/victoria-tower-project/',
        'https://www.parliament.uk/about/living-heritage/building/palace/architecture/palacestructure/towers-of-parliament/',
        'https://www.parliament.uk/about/living-heritage/building/palace/westminsterhall/architecture/the-hammer-beam-roof-/',
        'https://www.data.gov.uk/dataset/cf3f1137-c12b-44a1-a835-e80fe4a60b92/lidar-composite-dsm-2022-1m',
        'https://www.data.gov.uk/dataset/01b3ee39-da3f-47b6-83da-dc98e73a461f/lidar-composite-digital-terrain-model-dtm-1m',
        'https://www.openstreetmap.org/relation/1567699',
      ],
    },
  };
  await writeFile(process.argv[2],JSON.stringify(entry,null,2)+'\n');
}
console.log({bytes:glb.length,vertices,triangles,min,max,volume:finished.volume(),
  sha256:createHash('sha256').update(glb).digest('hex')});
