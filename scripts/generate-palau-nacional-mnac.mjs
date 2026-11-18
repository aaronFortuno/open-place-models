import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {openSolids,printGlb} from './monument-solids.mjs';

const id='palau-nacional-mnac', path=`models/${id}/r1/`;
const directory=new URL(`../${path}`,import.meta.url);
const survey=JSON.parse(await readFile(new URL('survey.json',directory),'utf8'));
const {Manifold,CrossSection,prism,turned,mesh}=await openSolids();
const {referenceGround:ground,parameters:p}=survey;
const {footprintTolerance,detailTolerance}=p;
const parts=new Map(survey.parts.map(part=>[part.handle,part]));
const [u,v]=[survey.basis.across,survey.basis.depth];
const attribution='Open Place Models contributors · Ajuntament de Barcelona · ICGC · OpenStreetMap contributors';
const camera=[-.85,.70,-1.15];
const pieces=[];
function point(a,b,height){return [u[0]*a+v[0]*b,height-ground,-u[1]*a-v[1]*b];}
function local([east,north]){return [u[0]*east+u[1]*north,v[0]*east+v[1]*north];}
function section(polygons,tolerance=footprintTolerance){
 return CrossSection.ofPolygons(polygons.flat(),'EvenOdd').simplify(tolerance);
}
function building(polygons,bottom,top){
 const cross=section(polygons);
 const extrusion=cross.extrude(top-bottom).translate([0,0,bottom-ground]).rotate(-90,0,0);
 cross.delete();return extrusion;
}
function roofStrip(start,end,profile){
 const n=profile.length,da=end[0]-start[0],db=end[1]-start[1],length=Math.hypot(da,db);
 const normal=[-db/length,da/length];
 const vertices=[start,end].flatMap(([a,b])=>profile.flatMap(([offset,y])=>point(a+normal[0]*offset,b+normal[1]*offset,y)));
 const faces=[];
 for(let i=1;i<n-1;i++)faces.push(0,i,i+1,n,n+i+1,n+i);
 for(let i=0;i<n;i++){const next=(i+1)%n;faces.push(i,i+n,next+n,i,next+n,next);}
 const solid=mesh(vertices,faces);assert.equal(solid.status(),'NoError');assert(solid.volume()>0);return solid;
}
function loft(rings){
 const n=rings[0].ring.length,vertices=rings.flatMap(({ring,y})=>ring.flatMap(([a,b])=>point(a,b,y))),faces=[];
 for(let i=1;i<n-1;i++)faces.push(0,i,i+1,(rings.length-1)*n,(rings.length-1)*n+i+1,(rings.length-1)*n+i);
 for(let row=0;row<rings.length-1;row++)for(let i=0;i<n;i++){
  const a=row*n+i,b=row*n+(i+1)%n;faces.push(a,a+n,b+n,a,b+n,b);
 }
 const solid=mesh(vertices,faces);assert.equal(solid.status(),'NoError');assert(solid.volume()>0);return solid;
}
function radialRing(outline,centre,count=p.ovalRingSamples){
 const ring=outline.map(local),result=[];
 for(let i=0;i<count;i++){
  const angle=2*Math.PI*i/count,d=[Math.cos(angle),Math.sin(angle)],hits=[];
  for(let j=0;j<ring.length-1;j++){
   const a=ring[j].map((x,k)=>x-centre[k]),edge=ring[j+1].map((x,k)=>x-ring[j][k]);
   const det=d[0]*edge[1]-d[1]*edge[0];if(Math.abs(det)<1e-8)continue;
   const t=(a[0]*edge[1]-a[1]*edge[0])/det,s=(a[0]*d[1]-a[1]*d[0])/det;
   if(t>0&&s>=-1e-6&&s<=1+1e-6)hits.push(t);
  }
  assert(hits.length,'Ray must meet the measured roof outline');
  const radius=Math.min(...hits);result.push([centre[0]+radius*d[0],centre[1]+radius*d[1]]);
 }
 return result;
}
function column(a,b,profile,count){const [x,,z]=point(a,b,ground);return turned(x,z,profile.map(([y,r])=>[y-ground,r]),count);}

// The common buried foundation keeps the surveyed ground slope intact in the
// regional model. The two narrow mapped garden courts remain open to terrain.
const k=111320*Math.cos(survey.anchor[1]*Math.PI/180);
const baseRings=survey.osm.rings.map(ring=>ring.map(([lon,lat])=>[(lon-survey.anchor[0])*k,(lat-survey.anchor[1])*111320]));
pieces.push(building([baseRings],ground,p.lowerBodyTop));
const wingHandles=new Set(['17812C','17F999','17EE5C','177CD6']);
for(const part of parts.values()){
 if(part.roof>=110||part.area<p.omitRoofCapsBelowSquareMetres||wingHandles.has(part.handle)||part.handle==='17CFE6'||part.handle==='17B3E4')continue;
 pieces.push(building(part.polygons,p.lowerBodyTop-.2,Math.round(part.roof/p.roofHeightRounding)*p.roofHeightRounding));
}
// The four long wing roofs retain their actual CAD footprint and measured
// pitches. Broad source tiers supply the eaves; roof planes replace flat caps.
for(const handle of wingHandles){
 const part=parts.get(handle),left=handle==='17812C'||handle==='17F999';
 const front=handle==='17812C'||handle==='17EE5C';
 const ridge=part.roof,profile=[[-11,95.8],[11,95.8],[11,96.1],[0,ridge],[-11,97.7]];
 const a0=-88,a1=105,center=front?-38.6:-6.0;
 const main=roofStrip([a0,center-.045*a0],[a1,center-.045*a1],profile);
 const flank=roofStrip([left?-68.5:84.0,-50],[left?-68.5:84.0,5],
  [[-10,95.8],[10,95.8],[10,97.0],[0,ridge],[-10,97.0]]);
 const mask=building(part.polygons,95.7,ridge+.5);
 pieces.push(building(part.polygons,p.lowerBodyTop-.2,96.1),Manifold.union([main,flank]).intersect(mask));
}

// Raised front dome and lantern, reconstructed from radial LiDAR sections.
pieces.push(building(parts.get('17E4BF').polygons,p.lowerBodyTop-.2,113.392));
pieces.push(building(parts.get('17D8D1').polygons,p.lowerBodyTop-.2,123.072));
pieces.push(column(p.centralDome.a,p.centralDome.b,p.centralDome.profile,p.centralDomeSegments));

// Side cupolas have the smaller ogee outline visible above the end pavilions.
for(const dome of p.sideDomes){
 pieces.push(column(dome.a,dome.b,[[p.lowerBodyTop-.2,5.6],[110.1,5.6],[111.309,5],[114.583,4],
  [118.1,2.8],[120.252,1.8],[dome.top-1.2,.65],[dome.top,.50]],p.secondaryRotationalSegments));
}

// Four independent tower positions follow the measured CAD profiles. The
// bell-stage hoods are solid simplified envelopes without window tracery.
for(const tower of p.towers){
 const base=parts.get(tower.handle),cross=section(base.polygons,.80),ring=cross.toPolygons()[0].map(local);
 cross.delete();
 const shoulder=tower.shoulder;
 const centre=[tower.a,tower.b],shape=scale=>ring.map(q=>q.map((x,i)=>centre[i]+(x-centre[i])*scale));
 const signed=ring.reduce((sum,q,i)=>{const next=ring[(i+1)%ring.length];return sum+q[0]*next[1]-next[0]*q[1];},0);
 if(signed<0)ring.reverse();
 pieces.push(loft([{y:p.lowerBodyTop-.2,ring:shape(1.08)},{y:112.9,ring:shape(1.08)},
  {y:113.5,ring:shape(.92)},{y:shoulder-.16,ring:shape(.92)},{y:shoulder+.65,ring:shape(1.02)}]));
 pieces.push(column(tower.a,tower.b,[[shoulder+.30,3.65],[shoulder+2.8,2.8],[shoulder+5.4,2.4],
  [Math.min(shoulder+8.9,tower.top-3.4),2.3],[tower.top-2.7,1.5],[tower.top-1.0,.65],[tower.top,.45]],p.secondaryRotationalSegments));
}

// The Saló Oval's curved envelope meets the actual outer and raised inner CAD
// rings. Its longitudinal crown is a separate shallow cap, rather than a dome.
const centre=[7.77,30.30],outer=radialRing(parts.get('17CFE6').polygons[0][0],centre),
 inner=radialRing(parts.get('17EBD9').polygons[0][0],centre);
pieces.push(building(parts.get('17B3E4').polygons,p.lowerBodyTop-.2,105.8));
pieces.push(loft([[0,105.6],[.28,108.4],[.65,110.8],[1,113.2]].map(([t,y])=>({y,
 ring:outer.map((q,i)=>q.map((x,j)=>x+(inner[i][j]-x)*t))}))));
pieces.push(loft([{y:113.0,ring:inner},{y:115.2,ring:inner.map(([a,b])=>[centre[0]+(a-centre[0])*.95,centre[1]+(b-centre[1])*.65])},
 {y:117.176,ring:inner.map(([a,b])=>[centre[0]+(a-centre[0])*.78,centre[1]+(b-centre[1])*.20])}]));

const united=Manifold.union(pieces);for(const piece of pieces)piece.delete();
assert.equal(united.status(),'NoError');
const components=united.decompose(),substantial=components.filter(component=>component.volume()>1e-5);
assert.equal(substantial.length,1,'Palace must be one connected solid');
const reduced=substantial[0].simplify(detailTolerance);united.delete();for(const component of components)component.delete();
// A coarse simplification can close a tiny CAD pocket into an internal shell.
// Fill only sub-cubic-metre sealed pockets; retain the two exterior garden courts.
const shells=reduced.decompose(),positive=shells.filter(part=>part.volume()>1e-5);
const sealedPockets=shells.filter(part=>part.volume() < -1e-5);
assert.equal(positive.length,1,'Simplification must retain one connected palace');
assert(sealedPockets.reduce((sum,part)=>sum-part.volume(),0)<1,'Unexpected large sealed void');
const solid=positive[0];
const result=printGlb(solid,attribution,camera);
assert(result.glb.length<40000,'Retain a lightweight default reconstruction');
await writeFile(new URL('print.glb',directory),result.glb);
const feature={type:'Feature',id,bbox:[Math.min(...survey.osm.rings[0].map(q=>q[0])),Math.min(...survey.osm.rings[0].map(q=>q[1])),
 Math.max(...survey.osm.rings[0].map(q=>q[0])),Math.max(...survey.osm.rings[0].map(q=>q[1]))],geometry:{type:'Polygon',coordinates:survey.osm.rings},
 properties:{name:'Palau Nacional · MNAC',place:'Barcelona, Spain',city:'Barcelona',country:'Spain',aliases:['Museu Nacional d’Art de Catalunya','National Palace of Montjuïc'],revision:'r1',geometryType:'building',anchor:survey.anchor,anchorElevation:ground,
 height:+(result.max[1]-result.min[1]).toFixed(3),mesh:path+'print.glb',thumbnail:path+'thumbnail.webp',byteLength:result.glb.length,license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',attribution,sources:survey.sources,
 replacement:{featureIds:['osm-relation-21195792','osm-way-43995751','icgc-1175890']}}};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(feature,null,2)+'\n');
console.log({bytes:result.glb.length,vertices:result.vertices,triangles:result.triangles,bounds:[result.min,result.max],volume:solid.volume()});
