import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {openSolids,printGlb} from './monument-solids.mjs';

const id='temple-sagrat-cor-tibidabo',path=`models/${id}/r1/`;
const directory=new URL(`../${path}`,import.meta.url);
const survey=JSON.parse(await readFile(new URL('survey.json',directory),'utf8'));
const {Manifold,CrossSection,turned,mesh}=await openSolids();
const p=survey.parameters,ground=survey.referenceGround;
const parts=new Map(survey.parts.map(part=>[part.handle,part]));
const attribution='Open Place Models contributors · Ajuntament de Barcelona · ICGC · OpenStreetMap contributors';
const camera=[-.85,.65,1.20],pieces=[];
const point=(east,north,elevation)=>[east,elevation-ground,-north];
function building(polygons,bottom,top){
 const section=CrossSection.ofPolygons(polygons.flat(),'EvenOdd').simplify(p.planTolerance);
 const solid=section.extrude(top-bottom).translate([0,0,bottom-ground]).rotate(-90,0,0);
 section.delete();return solid;
}
function column(east,north,profile,count=12){return turned(east,-north,profile.map(([y,r])=>[y-ground,r]),count);}
function beam(a,b,r0,r1,count=6){
 const direction=b.map((x,i)=>x-a[i]),length=Math.hypot(...direction),d=direction.map(x=>x/length);
 const first=[-d[1],d[0],0],norm=Math.hypot(...first),u=first.map(x=>x/norm);
 const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];
 const vertices=[a,b].flatMap((center,row)=>Array.from({length:count},(_,i)=>{
  const t=2*Math.PI*i/count,r=row?r1:r0;
  return center.map((x,k)=>x+r*(u[k]*Math.cos(t)+v[k]*Math.sin(t)));
 }).flat());
 const faces=[];
 for(let i=1;i<count-1;i++)faces.push(0,i+1,i,count,count+i,count+i+1);
 for(let i=0;i<count;i++){const j=(i+1)%count;faces.push(i,j,j+count,i,j+count,i+count);}
 const solid=mesh(vertices,faces);assert.equal(solid.status(),'NoError');assert(solid.volume()>0);return solid;
}

// The RTT envelope includes crypt structures beneath the recessed west access.
// Only this buried plinth spans that envelope; visible terraces follow the CAD.
const k=111320*Math.cos(survey.anchor[1]*Math.PI/180);
const envelope=survey.footprint.coordinates.map(r=>r.map(([lon,lat])=>[(lon-survey.anchor[0])*k,(lat-survey.anchor[1])*111320]));
pieces.push(building([envelope],ground,p.buriedPlinthTop));
const towerIds=new Set(p.towers.map(t=>t.handle));
for(const part of parts.values()){
 if(towerIds.has(part.handle)||part.handle==='177FBD')continue;
 pieces.push(building(part.polygons,ground,part.roof));
}

// Four distinct tower positions, with pointed upper stages and solid finials.
for(const tower of p.towers){
 pieces.push(building(parts.get(tower.handle).polygons,ground,544.5));
 pieces.push(column(tower.east,tower.north,[[543.9,2.65],[548.0,2.65],[550.9,2.1],
  [554.5,1.45],[tower.top-1.1,.52],[tower.top,.35]],10));
}

// Main octagonal roof and tapered crown follow the sampled radial section.
const c=p.central;
pieces.push(column(c.east,c.north,c.profile,12));
pieces.push(column(c.east,c.north,[[567.8,1.30],[568.85,1.30]],12));

// A compact, original human silhouette preserves the raised open arms. The
// detailed face, hands, drapery and other sculptural surface detail are omitted.
pieces.push(column(c.east,c.north,[[568.6,.80],[570.8,1.15],[572.9,.80],[574.1,.38]],10));
pieces.push(Manifold.sphere(.65,12).scale([1,1.1,.8])
 .translate(point(c.east,c.north-.4,c.statueTop-.715)));
for(const side of [-1,1]){
 const arm=distance=>point(c.east+p.across[0]*distance,c.north+p.across[1]*distance,573.2+.13*Math.abs(distance));
 pieces.push(beam(arm(side*.55),arm(side*3.6),.38,.28));
}

const united=Manifold.union(pieces);for(const piece of pieces)piece.delete();
assert.equal(united.status(),'NoError');
const reduced=united.simplify(p.meshTolerance);united.delete();
const shells=reduced.decompose(),positive=shells.filter(shell=>shell.volume()>1e-5);
assert.equal(positive.length,1,'Keep the temple and its crowning figure connected');
// This exterior model has no internal rooms: fill sealed CAD/roof cavities.
// Exterior access recesses remain part of the connected outer boundary.
const filledSealedVoidsCubicMetres=shells.filter(s=>s.volume()<0).reduce((sum,s)=>sum-s.volume(),0);
const solid=positive[0],result=printGlb(solid,attribution,camera);
assert(result.glb.length<30000,'Keep the default model below 30 kB');
await writeFile(new URL('print.glb',directory),result.glb);
const footprint=survey.footprint,coordinates=footprint.coordinates.flat();
const feature={type:'Feature',id,bbox:[Math.min(...coordinates.map(p=>p[0])),Math.min(...coordinates.map(p=>p[1])),
 Math.max(...coordinates.map(p=>p[0])),Math.max(...coordinates.map(p=>p[1]))],geometry:footprint,
 properties:{name:'Temple del Sagrat Cor del Tibidabo',place:'Barcelona, Spain',city:'Barcelona',country:'Spain',
 aliases:['Temple Expiatori del Sagrat Cor','Sacred Heart of Tibidabo'],revision:'r1',geometryType:'building',anchor:survey.anchor,anchorElevation:ground,
 height:+(result.max[1]-result.min[1]).toFixed(3),mesh:path+'print.glb',thumbnail:path+'thumbnail.webp',byteLength:result.glb.length,
 license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',attribution,sources:survey.sources,
 replacement:{featureIds:['osm-way-486759610','icgc-1196281','icgc-1196284']}}};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(feature,null,2)+'\n');
console.log({bytes:result.glb.length,vertices:result.vertices,triangles:result.triangles,bounds:[result.min,result.max],volume:solid.volume(),filledSealedVoidsCubicMetres});
