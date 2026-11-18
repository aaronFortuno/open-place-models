import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {openSolids,printGlb} from './monument-solids.mjs';

const id='temple-sagrat-cor-tibidabo',path=`models/${id}/r2/`;
const directory=new URL(`../${path}`,import.meta.url);
const survey=JSON.parse(await readFile(new URL('survey.json',directory),'utf8'));
const {Manifold,CrossSection,turned,mesh,prism}=await openSolids();
const p=survey.parameters,q=p.r2,ground=survey.referenceGround;
const parts=new Map(survey.parts.map(part=>[part.handle,part]));
const attribution='Open Place Models contributors · Ajuntament de Barcelona · ICGC · OpenStreetMap contributors';
const camera=[.80,.55,1.20],pieces=[],cuts=[];
const c=p.central,u=p.across,v=p.depth;
const point=(east,north,elevation)=>[east,elevation-ground,-north];
const en=(a,b)=>[c.east+u[0]*a+v[0]*b,c.north+u[1]*a+v[1]*b];
const xy=(a,b,elevation)=>point(...en(a,b),elevation);
const angle=Math.atan2(u[1],u[0])*180/Math.PI;
const place=solid=>solid.rotate(0,angle,0).translate([c.east,0,-c.north]);

function building(polygons,bottom,top){
 const section=CrossSection.ofPolygons(polygons.flat(),'EvenOdd').simplify(p.planTolerance);
 const solid=section.extrude(top-bottom).translate([0,0,bottom-ground]).rotate(-90,0,0);
 section.delete();return solid;
}
const abBuilding=(ring,bottom,top)=>building([[ring.map(([a,b])=>en(a,b))]],bottom,top);
const rect=(a0,a1,b0,b1,bottom,top)=>abBuilding([[a0,b0],[a1,b0],[a1,b1],[a0,b1]],bottom,top);
function column(east,north,profile,count=8){return turned(east,-north,profile.map(([y,r])=>[y-ground,r]),count);}
const abColumn=(a,b,profile,count=8)=>column(...en(a,b),profile,count);
function beam(a,b,r0,r1,count=6){
 const direction=b.map((x,i)=>x-a[i]),length=Math.hypot(...direction),d=direction.map(x=>x/length);
 let first=[-d[1],d[0],0];if(Math.hypot(...first)<1e-6)first=[1,0,0];
 const norm=Math.hypot(...first),axis=first.map(x=>x/norm);
 const cross=[d[1]*axis[2]-d[2]*axis[1],d[2]*axis[0]-d[0]*axis[2],d[0]*axis[1]-d[1]*axis[0]];
 const vertices=[a,b].flatMap((center,row)=>Array.from({length:count},(_,i)=>{
  const t=2*Math.PI*i/count,r=row?r1:r0;
  return center.map((x,k)=>x+r*(axis[k]*Math.cos(t)+cross[k]*Math.sin(t)));
 }).flat()),faces=[];
 for(let i=1;i<count-1;i++)faces.push(0,i+1,i,count,count+i,count+i+1);
 for(let i=0;i<count;i++){const j=(i+1)%count;faces.push(i,j,j+count,i,j+count,i+count);}
 const solid=mesh(vertices,faces);assert.equal(solid.status(),'NoError');return solid;
}
function loft(rings){
 const n=rings[0].ring.length,vertices=rings.flatMap(({ring,y})=>ring.flatMap(([east,north])=>point(east,north,y)));
 const faces=[],last=(rings.length-1)*n;
 for(let i=1;i<n-1;i++)faces.push(0,i+1,i,last,last+i,last+i+1);
 for(let row=0;row<last;row+=n)for(let i=0;i<n;i++){
  const j=(i+1)%n;faces.push(row+i,row+j,row+j+n,row+i,row+j+n,row+i+n);
 }
 const solid=mesh(vertices,faces);assert.equal(solid.status(),'NoError');return solid;
}
function arch(center,width,bottom,spring,crown,steps=10){
 const half=width/2,rise=crown-spring,radius=(half*half+rise*rise)/(2*half),offset=radius-half;
 return [[center-half,bottom-ground],[center+half,bottom-ground],
  ...Array.from({length:steps+1},(_,i)=>{
   const x=half*Math.cos(Math.PI*i/steps);
   return [center+x,spring-ground+Math.sqrt(Math.max(0,radius*radius-(Math.abs(x)+offset)**2))];
  })];
}
function panel(profile,orientation,front,back){
 let solid=prism(profile,front,back);
 if(orientation==='a')solid=solid.rotate(0,90,0);
 return place(solid);
}
function gabledPanel({center,width,bottom,shoulder,crown,inner,outer}){
 const h=width/2;
 return panel([[center-h,bottom-ground],[center+h,bottom-ground],
  [center+h,shoulder-ground],[center,crown-ground],[center-h,shoulder-ground]],'b',inner,outer);
}

const k=111320*Math.cos(survey.anchor[1]*Math.PI/180);
const envelope=survey.footprint.coordinates.map(r=>r.map(([lon,lat])=>[(lon-survey.anchor[0])*k,(lat-survey.anchor[1])*111320]));
pieces.push(building([envelope],ground,p.buriedPlinthTop));
const towerIds=new Set(p.towers.map(t=>t.handle)),apseIds=new Set(q.apses.map(t=>t.handle));
const skipped=new Set([...towerIds,...apseIds,'177FBD','17A3A5','178752','179172','1793B2','17986E','17A447','17A693']);

// Front stair flights are cut into the crypt terrace, then rebuilt with broad
// treads. The western side access outside these flights keeps its CAD recess.
const stairCutters=[],stairSolids=[],stairRails=[];
for(const flight of q.stairs){
 const [a0,b0]=flight.from,[a1,b1]=flight.to,da=a1-a0,db=b1-b0,L=Math.hypot(da,db),normal=[-db/L,da/L];
 const ring=(t0,t1,offset,width)=>[[t0,-width/2],[t1,-width/2],[t1,width/2],[t0,width/2]].map(([t,o])=>[a0+da*t+normal[0]*(o+offset),b0+db*t+normal[1]*(o+offset)]);
 stairCutters.push(abBuilding(ring(-.02,1.02,0,flight.width),q.assumed.stairLowerLanding-.2,520));
 for(let i=0;i<flight.steps;i++)stairSolids.push(abBuilding(ring(i/flight.steps,(i+1)/flight.steps,0,flight.width),ground,
  q.assumed.stairLowerLanding+(q.assumed.stairUpperLanding-q.assumed.stairLowerLanding)*(i+1)/flight.steps));
 for(const side of [-1,1]){
  // A sloping solid parapet, bounded by the same measured crypt envelope.
  const corners=ring(0,1,side*(flight.width/2+.30),.60);
  const low=q.assumed.stairLowerLanding,high=q.assumed.stairUpperLanding;
  const vertices=[...corners.flatMap(([a,b])=>xy(a,b,ground)),
   ...corners.flatMap(([a,b],i)=>xy(a,b,(i===0||i===3?low:high)+1))];
  const faces=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7];
  const outward=faces.flatMap((_,i)=>i%3===0?[faces[i],faces[i+2],faces[i+1]]:[]);
  const rail=mesh(vertices,outward);assert.equal(rail.status(),'NoError');assert(rail.volume()>0);
  stairRails.push(rail);
 }
}
const crypt=building(parts.get('1776C4').polygons,ground,parts.get('1776C4').roof);
const flightMask=Manifold.union(stairCutters);
pieces.push(crypt.subtract(flightMask));
for(const solid of [...stairSolids,...stairRails]){pieces.push(solid.intersect(crypt));solid.delete();}
// A low stone parapet makes the separate terrace edge legible.
const cryptSection=CrossSection.ofPolygons(parts.get('1776C4').polygons.flat(),'EvenOdd').simplify(.25);
const cryptInner=cryptSection.offset(-.58,'Round',2,12);
const rim=cryptSection.subtract(cryptInner).extrude(1.12).translate([0,0,518.42-ground]).rotate(-90,0,0);
pieces.push(rim.subtract(flightMask));rim.delete();crypt.delete();flightMask.delete();cryptInner.delete();cryptSection.delete();
for(const part of parts.values()){
 if(skipped.has(part.handle)||part.handle==='1776C4')continue;
 pieces.push(building(part.polygons,ground,part.roof));
}

// Three semicircular apses keep their measured CAD outlines; a low radial roof
// rises towards the parent wall instead of repeating a flat extrusion.
for(const apse of q.apses){
 const part=parts.get(apse.handle),outline=CrossSection.ofPolygons(part.polygons.flat(),'EvenOdd').simplify(.12).toPolygons()[0];
 const join=en(apse.a,apse.b);
 pieces.push(building(part.polygons,ground,apse.eave));
 pieces.push(loft([{y:apse.eave-.15,ring:outline},{y:apse.crown,ring:outline.map(([x,y])=>[join[0]+(x-join[0])*.08,join[1]+(y-join[1])*.08])}]));
}

// A distinct triangular front gable sits above the measured walking terrace.
pieces.push(panel([[-6.8,538.9-ground],[6.8,538.9-ground],[0,q.frontGableCrown-ground]],'b',12.3,13.25));
// Crown drum follows the municipal octagonal footprint. Its narrower belfry has
// vertical faces; separate radial ribs and pinnacles replace r1's solid cone.
pieces.push(building(parts.get('17A3A5').polygons,ground,q.crown.drumTop));
pieces.push(column(c.east,c.north,[[547.55,3.45],[565.85,3.3],[566.35,3.60],[566.65,3.60],[567.85,1.55],[568.853,1.30]],8));
for(let i=0;i<8;i++){
 const theta=i*Math.PI/4,radial=[Math.cos(theta),Math.sin(theta)];
 const rpoint=(r,y)=>point(c.east+radial[0]*r,c.north+radial[1]*r,y);
 pieces.push(beam(rpoint(7.0,547.5),rpoint(3.6,558.2),.72,.52,6));
 pieces.push(column(c.east+radial[0]*6.8,c.north+radial[1]*6.8,[[547.5,.54],[554.5,.50],[556.0,.16]],8));
 // Shallow tall pointed belfry panels, measured relative to the flat faces.
 const local=prism(arch(0,1.45,555.4,563.6,565.1),2.66,3.65).rotate(0,theta*180/Math.PI,0).translate([c.east,0,-c.north]);
 cuts.push(local);
}

// The corner towers are thin upright octagonal belfries with pointed caps.
for(const tower of p.towers){
 pieces.push(building(parts.get(tower.handle).polygons,ground,539.5));
 pieces.push(column(tower.east,tower.north,[[539.2,2.65],[548.5,2.65],[548.9,2.85],[549.3,2.60],[tower.top-2.0,.70],[tower.top-1.0,.45],[tower.top,.29]],8));
 for(let i=0;i<4;i++){
  const theta=i*Math.PI/2;
  cuts.push(prism(arch(0,1.15,540.5,546.6,548.1),2.05,2.9).rotate(0,theta*180/Math.PI,0).translate([tower.east,0,-tower.north]));
 }
}

// Twelve perimeter buttresses and simplified apostle silhouettes are visible
// in the official front photo and the 547–548m surface returns.
const rimPositions=[];
for(const side of [-1,1])for(const t of [-13,-6.5,6.5,13])rimPositions.push([side*13.15,t]);
for(const side of [-1,1])for(const t of [-6.5,6.5])rimPositions.push([t,side*13.15]);
for(const [a,b] of rimPositions){
 pieces.push(rect(a-.55,a+.55,b-.55,b+.55,518.4,540.4));
 pieces.push(abColumn(a,b,[[540.2,.85],[543.4,.30],[544.0,.35]],8));
 pieces.push(abColumn(a,b,[[543.8,.38],[545.2,.55],[546.8,.30]],8));
 pieces.push(Manifold.sphere(.38,12).translate(xy(a,b,547.15)));
}
// Pointed portals and tall recessed windows describe the three façade bays.
// Raised gablets and window surrounds are part of the visible stone envelope,
// rather than relying on a flat recessed face to suggest the entire façade.
for(const frame of q.facadeFrames.portals)pieces.push(gabledPanel(frame));
const windowFrame=q.facadeFrames.window;
pieces.push(panel(arch(0,windowFrame.width,windowFrame.bottom,windowFrame.spring,windowFrame.crown),'b',windowFrame.inner,windowFrame.outer));
// Two broad vertical mullions and a small sill preserve the main window's
// subdivision at model scale. They are added after the recess subtraction.
const windowMullions=[];
for(const a of [-.85,.85])windowMullions.push(rect(a-.18,a+.18,12.05,13.55,529.1,535.35));
windowMullions.push(rect(-2.5,2.5,12.05,13.55,528.85,529.35));
for(const [center,width,spring,crown] of [[0,4.6,523.0,525.6],[-9.5,2.8,522.8,525.0],[9.5,2.8,522.8,525.0]])
 cuts.push(panel(arch(center,width,518.5,spring,crown),'b',11.85,14.05));
cuts.push(panel(arch(0,5.0,529.1,535.8,539.0),'b',12.05,14.05));
for(const center of [-9.5,9.5])cuts.push(panel(arch(center,2.0,531.0,535.4,537.6),'b',12.1,13.7));
for(const side of [-1,1])for(const center of [-6.4,6.4]){
 cuts.push(panel(arch(center,2.4,530.8,535.5,537.5),'a',side>0?12.5:-13.8,side>0?13.8:-12.5));
 cuts.push(panel(arch(center,2.4,530.8,535.5,537.5),'b',side>0?12.2:-13.9,side>0?13.8:-12.4));
}
// Main crypt portal and broad arch recess. The surrounding masonry remains solid.
cuts.push(panel(arch(0,3.6,507.0,511.4,513.5),'b',33.35,35.1));
cuts.push(panel(arch(0,12.5,512.5,512.6,518.0),'b',34.0,35.2));

// Crowning figure is an original geometric silhouette, independent of the
// sculptural detail. Preserve its measured summit and the open, raised arms.
pieces.push(column(c.east,c.north,[[568.6,.8],[570.8,1.15],[572.9,.8],[574.1,.38]],10));
pieces.push(Manifold.sphere(.65,12).scale([1,1.1,.8]).translate(point(c.east,c.north-.4,c.statueTop-.715)));
for(const side of [-1,1]){
 const arm=distance=>point(c.east+u[0]*distance,c.north+u[1]*distance,573.2+.13*Math.abs(distance));
 pieces.push(beam(arm(side*.55),arm(side*3.6),.38,.28));
}

const united=Manifold.union(pieces);for(const piece of pieces)piece.delete();
assert.equal(united.status(),'NoError');
const cutUnion=Manifold.union(cuts),carved=united.subtract(cutUnion);united.delete();cutUnion.delete();for(const cutter of cuts)cutter.delete();
assert.equal(carved.status(),'NoError');
const subdivided=Manifold.union([carved,...windowMullions]);carved.delete();for(const mullion of windowMullions)mullion.delete();
assert.equal(subdivided.status(),'NoError');
const reduced=subdivided.simplify(p.meshTolerance);subdivided.delete();
const shells=reduced.decompose(),positive=shells.filter(shell=>shell.volume()>1e-5);
assert.equal(positive.length,1,'Keep exterior envelope and summit figure connected');
const solid=positive[0],result=printGlb(solid,attribution,camera);
assert(result.glb.length<4*1024*1024,'Keep the model within the print-loader limit');
await writeFile(new URL('print.glb',directory),result.glb);
const footprint=survey.footprint,coordinates=footprint.coordinates.flat();
const feature={type:'Feature',id,bbox:[Math.min(...coordinates.map(p=>p[0])),Math.min(...coordinates.map(p=>p[1])),Math.max(...coordinates.map(p=>p[0])),Math.max(...coordinates.map(p=>p[1]))],geometry:footprint,
 properties:{name:'Temple del Sagrat Cor del Tibidabo',place:'Barcelona, Spain',city:'Barcelona',country:'Spain',aliases:['Temple Expiatori del Sagrat Cor','Sacred Heart of Tibidabo'],revision:'r2',geometryType:'building',anchor:survey.anchor,anchorElevation:ground,height:+(result.max[1]-result.min[1]).toFixed(3),mesh:path+'print.glb',thumbnail:path+'thumbnail.webp',byteLength:result.glb.length,license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',attribution,sources:survey.sources,replacement:{featureIds:['osm-way-486759610','icgc-1196281','icgc-1196284']}}};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(feature,null,2)+'\n');
console.log({bytes:result.glb.length,vertices:result.vertices,triangles:result.triangles,bounds:[result.min,result.max],volume:solid.volume(),shells:shells.length});
