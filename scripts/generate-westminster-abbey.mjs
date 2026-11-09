import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {printGlb} from './monument-solids.mjs';
import {westminsterSolids} from './westminster-solids.mjs';

const id='westminster-abbey',revision='r1',directory=`models/${id}/${revision}/`;
const root=new URL('../',import.meta.url);
const layout=JSON.parse(await readFile(new URL(directory+'survey-layout.json',root),'utf8'));
const {Manifold,CrossSection,box,prism,turned,height,section,rectangle,column,gable,geometry,bounds}=await westminsterSolids(layout);
const outline=id=>section([layout.sourceWays[id].points]).simplify(.38);
const abbey=outline(364313092),cloister=outline(1149648663),chapter=outline(363961396);
const weston=outline(979748251);
const vestibule=rectangle(-3.7,7.8,24.0,34.8).subtract(weston);
const chapterEnvelope=column(chapter,39.8);
const churchEnvelope=column(abbey,73);
const olderChurch=abbey.intersect(rectangle(-100,32.85,-44,43));
const ladyChapel=abbey.intersect(rectangle(32.55,72,-20,25));
const nave=[
  gable(-88.8,21,-7,7.6,24.3,38.4,47.1),
  gable(-15.7,-1.3,-31.5,31.8,24.3,38.5,47.1,'v'),
  gable(10.7,25.7,-6.3,7.6,24.3,36.0,44.0),
  box(-15.45,-1.45,height(40),height(49.4),-6.8,7.8),
  gable(-15.55,-1.35,-6.85,7.9,48.8,49.7,53.6,'v'),
];
const chapelRoof=Manifold.union([
  gable(32.4,60.6,-5.1,7.65,20.5,27.6,29.9),
  turned(59.45,1.25,[[height(20.5),7.15],[height(27.6),7.15],[height(29.8),1.7]],8,.92),
]).intersect(column(ladyChapel,32));

const towers=[];
const pinnacles=[];
const westRecesses=[];
function westOpening(u0,u1,v,halfWidth,sill,spring,tip){
  return prism([
    [-v-halfWidth,height(sill)],[-v+halfWidth,height(sill)],[-v+halfWidth,height(spring)],
    [-v,height(tip)],[-v-halfWidth,height(spring)],
  ],u0,u1).rotate(0,90,0);
}
for(const [u,v] of [[-84.25,-10.55],[-84.45,9.70]]){
  towers.push(box(u-6.45,u+6.45,0,height(44),v-6.0,v+6.0));
  towers.push(box(u-5.45,u+5.45,height(42.5),height(59.9),v-5.1,v+5.1));
  towers.push(box(u-4.58,u+4.58,height(58.4),height(64.2),v-4.45,v+4.45));
  towers.push(box(u-5.72,u+5.72,height(58.1),height(59.1),v-5.34,v+5.34));
  for(const offset of [-1.8,1.8]){
    westRecesses.push(westOpening(u-7.5,u-4.2,v+offset,1.08,46.8,54.0,56.9));
  }
  for(const dx of [-4.6,4.6])for(const dz of [-4.35,4.35]){
    pinnacles.push(turned(u+dx,v+dz,[
      [height(37),2.45],[height(55),2.36],[height(59),2.06],
      [height(64.7),1.57],[height(69.3),1.13],[height(72.4),.22],
    ],4));
  }
}
westRecesses.push(westOpening(-96,-89.2,.45,2.65,5.0,11.4,14.6));
westRecesses.push(westOpening(-94,-87.1,.45,3.1,16.6,22.4,25.0));
const main=Manifold.union([column(olderChurch,25.5),column(ladyChapel,21.8),chapelRoof,...nave,...towers,...pinnacles])
  .intersect(churchEnvelope).subtract(Manifold.union(westRecesses));

const flyers=[];
for(const u of [-73.5,-67.5,-61.5,-55.5,-49.5,-43.5,-37.5,-31.5,-25.5]){
  for(const side of [-1,1]){
    const profile=[
      [15.8,24.5],[15.8,28.6],[6.15,38.5],[5.4,35.5],[8.4,32.0],[11.8,27.4],
    ].map(([v,elevation])=>[-v*side,height(elevation)]);
    flyers.push(prism(profile,u-1.03,u+1.03).rotate(0,90,0));
    const pier=15.55*side;
    flyers.push(box(u-1.24,u+1.24,height(21.7),height(28.8),pier-1.14,pier+1.14));
    flyers.push(turned(u,pier,[[height(28.1),1.58],[height(30.9),1.2],[height(34.2),.24]],4));
  }
}

const chapterRoof=turned(12.6,41.3,[
  [height(23.8),10.75],[height(26.6),10.75],[height(35.7),3.65],[height(39.7),.8],
],8,.96);
const chapterWalls=Manifold.union([
  column(chapter,11),turned(12.6,41.3,[[0,11.3],[height(25.6),11.3]],8,.96),chapterRoof,
]).intersect(chapterEnvelope);
const garthJoin=rectangle(-19.1,-16.3,27.4,33.8);
const parts=[main,...flyers,chapterWalls,column(vestibule,13),column(cloister,10.6),column(garthJoin,10.6)];
const assembled=Manifold.union(parts);
for(const part of parts)part.delete();
const simplified=assembled.simplify(.035);
assembled.delete();
const components=simplified.decompose();
assert.equal(components.length,1,`Disconnected components: ${JSON.stringify(components.map(part=>[part.volume(),part.boundingBox()]))}`);
for(const component of components)component.delete();
const finished=simplified.rotate(0,-layout.yaw,0);
simplified.delete();
const attribution='Open Place Models contributors (original reconstruction); © Environment Agency copyright and/or database right 2022 (OGL v3.0); footprint © OpenStreetMap contributors (ODbL 1.0).';
const {glb,min,max,vertices,triangles}=printGlb(finished,attribution,[-1.2,.48,-1.0]);
assert(Math.abs(min[1])<.001);
assert(Math.abs(max[1]-height(72.4))<.01);
await writeFile(new URL(directory+'print.glb',root),glb);

if(process.argv[2]){
  const modelPlan=CrossSection.union([abbey,cloister,chapter,vestibule,garthJoin]).simplify(.53);
  const footprint=geometry(modelPlan);
  const entry={
    type:'Feature',id,bbox:bounds(footprint,min,max),geometry:footprint,
    properties:{
      name:'Westminster Abbey',aliases:['Collegiate Church of St Peter at Westminster','Abadia de Westminster'],
      geometryType:'building',place:'London, United Kingdom',city:'London',country:'United Kingdom',revision,
      anchor:layout.anchor,anchorElevation:layout.anchorElevation,height:+max[1].toFixed(3),
      mesh:directory+'print.glb',thumbnail:directory+'thumbnail.webp',byteLength:glb.length,
      license:'CC-BY-4.0',spatialDataLicense:'ODbL-1.0',attribution,
      replacement:{
        featureIds:['osm-way-364313092','osm-way-1149648663','osm-way-363961396'],
        families:['osm-way-364313092','osm-way-1149648663','osm-way-363961396'],
      },
      sources:[
        'https://www.westminster-abbey.org/history/explore-our-history/architecture',
        'https://www.westminster-abbey.org/media/lnbl3alq/abbey-dimensions-for-web.pdf',
        'https://www.westminster-abbey.org/history/explore-our-history/chapter-house',
        'https://www.westminster-abbey.org/history/explore-our-history/the-cloisters',
        'https://www.data.gov.uk/dataset/cf3f1137-c12b-44a1-a835-e80fe4a60b92/lidar-composite-dsm-2022-1m',
        'https://www.data.gov.uk/dataset/01b3ee39-da3f-47b6-83da-dc98e73a461f/lidar-composite-digital-terrain-model-dtm-1m',
        'https://www.openstreetmap.org/way/364313092',
      ],
    },
  };
  await writeFile(process.argv[2],JSON.stringify(entry,null,2)+'\n');
}
console.log({bytes:glb.length,vertices,triangles,min,max,volume:finished.volume(),
  sha256:createHash('sha256').update(glb).digest('hex')});
