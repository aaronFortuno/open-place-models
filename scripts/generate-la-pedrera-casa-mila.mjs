import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{ShapeUtils,Vector2}from'three';
import{openSolids,printGlb}from'./monument-solids.mjs';

const id='la-pedrera-casa-mila',path=`models/${id}/r1/`,directory=new URL(`../${path}`,import.meta.url);
const survey=JSON.parse(await readFile(new URL('survey.json',directory),'utf8'));
const{Manifold,CrossSection,turned,mesh}=await openSolids(),p=survey.parameters,ground=survey.referenceGround;
const attribution='Open Place Models contributors · Ajuntament de Barcelona · ICGC · OpenStreetMap contributors';
const camera=[.85,1.10,1.20],point=(east,north,elevation)=>[east,elevation-ground,-north];
const area=r=>r.reduce((s,q,i)=>{const b=r[(i+1)%r.length];return s+q[0]*b[1]-b[0]*q[1];},0)/2;
const withinRing=([x,y],r)=>r.reduce((a,[b,c],i)=>{const[e,f]=r[(i+1)%r.length];return(c>y)!=(f>y)&&x<(e-b)*(y-c)/(f-c)+b?!a:a;},false);
function roofHeight(east,north){
 const near=survey.roofSamples.map(q=>({q,d:Math.hypot(east-q.east,north-q.north)})).sort((a,b)=>a.d-b.d).slice(0,p.roofNeighbours);
 if(near[0].d<.01)return near[0].q.elevation;
 const weights=near.map(q=>1/Math.max(.35,q.d)**2),total=weights.reduce((a,b)=>a+b,0);
 return near.reduce((sum,q,i)=>sum+q.q.elevation*weights[i],0)/total;
}
function roofBody(){
 const section=CrossSection.ofPolygons(survey.footprintLocal,'EvenOdd').simplify(p.planTolerance);
 let rings=section.toPolygons();section.delete();
 rings.sort((a,b)=>Math.abs(area(b))-Math.abs(area(a)));
 rings=rings.map((r,i)=>(area(r)>0)===(i===0)?r:r.slice().reverse());
 const vertices=rings.flat().map(q=>q.slice()),boundary=vertices.length;
 let faces=ShapeUtils.triangulateShape(rings[0].map(q=>new Vector2(...q)),rings.slice(1).map(r=>r.map(q=>new Vector2(...q))));
 faces=faces.map(([a,b,c])=>area([vertices[a],vertices[b],vertices[c]])>0?[a,b,c]:[a,c,b]);
 const inside=q=>withinRing(q,rings[0])&&!rings.slice(1).some(r=>withinRing(q,r));
 const forced=['roof-grid--2--12','roof-grid--7-8','roof-grid-3--22'];
 const candidates=survey.roofSamples.slice().sort((a,b)=>Number(forced.includes(b.source))-Number(forced.includes(a.source)));
 const barycentric=(q,face)=>{
  const[a,b,c]=face.map(i=>vertices[i]),cross=(u,v)=>u[0]*v[1]-u[1]*v[0],den=cross([b[0]-a[0],b[1]-a[1]],[c[0]-a[0],c[1]-a[1]]);
  if(Math.abs(den)<1e-9)return null;
  const wb=cross([q[0]-a[0],q[1]-a[1]],[c[0]-a[0],c[1]-a[1]])/den,wc=cross([b[0]-a[0],b[1]-a[1]],[q[0]-a[0],q[1]-a[1]])/den;
  return[1-wb-wc,wb,wc];
 };
 for(const sample of candidates){
  const q=[sample.east,sample.north],force=forced.includes(sample.source);
  if(!inside(q)||vertices.some(v=>Math.hypot(q[0]-v[0],q[1]-v[1])<(force?.2:p.roofPointSpacing)))continue;
  const index=faces.findIndex(f=>{const w=barycentric(q,f);return w&&Math.min(...w)>1e-5;});
  if(index<0)continue;
  const[a,b,c]=faces[index],n=vertices.length;vertices.push(q);
  faces.splice(index,1,[a,b,n],[b,c,n],[c,a,n]);
 }
 // Improve interior diagonals while keeping every measured boundary/control.
 // Convex flips preserve the constrained courtyard edges and avoid long fans.
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const angle=(c,a,b)=>{
  const u=[a[0]-c[0],a[1]-c[1]],v=[b[0]-c[0],b[1]-c[1]];
  return Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)))));
 };
 for(let pass=0;pass<30;pass++){
  const edges=new Map();
  faces.forEach((face,t)=>{for(let i=0;i<3;i++){
   const a=face[i],b=face[(i+1)%3],key=a<b?`${a},${b}`:`${b},${a}`;
   const list=edges.get(key)??[];list.push({t,a,b,c:face[(i+2)%3]});edges.set(key,list);
  }});
  const changed=new Set();let flips=0;
  for(const pair of edges.values()){
   if(pair.length!==2||pair.some(q=>changed.has(q.t)))continue;
   const[{t,a,b,c},{t:t2,c:d}]=pair,A=vertices[a],B=vertices[b],C=vertices[c],D=vertices[d];
   if(cross(A,B,C)*cross(A,B,D)>=-1e-8||cross(C,D,A)*cross(C,D,B)>=-1e-8)continue;
   if(angle(C,A,B)+angle(D,A,B)<=Math.PI+1e-5)continue;
   const orient=face=>cross(...face.map(i=>vertices[i]))>0?face:[face[0],face[2],face[1]];
   faces[t]=orient([c,d,a]);faces[t2]=orient([d,c,b]);changed.add(t);changed.add(t2);flips++;
  }
  if(!flips)break;
 }
 const count=vertices.length,coordinates=[...vertices.flatMap(([e,n])=>point(e,n,roofHeight(e,n))),...vertices.flatMap(([e,n])=>point(e,n,ground))];
 const indices=faces.flatMap(([a,b,c])=>[a,b,c,count+a,count+c,count+b]);
 let offset=0;
 for(const ring of rings){
  for(let i=0;i<ring.length;i++){
   const a=offset+i,b=offset+(i+1)%ring.length;
   indices.push(count+a,count+b,b,count+a,b,a);
  }
  offset+=ring.length;
 }
 const solid=mesh(coordinates,indices);assert.equal(solid.status(),'NoError');assert(solid.volume()>0);
 const elevationAt=(east,north)=>{
  for(const face of faces){const w=barycentric([east,north],face);if(w&&Math.min(...w)>=-1e-6)return face.reduce((sum,index,i)=>sum+coordinates[index*3+1]*w[i],0)+ground;}
  return roofHeight(east,north);
 };
 return{solid,elevationAt,vertices:vertices.length,boundary};
}
function loft(centre,outline,rows){
 let ring=outline.slice();if(ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1])ring.pop();
 if(area(ring)<0)ring.reverse();
 const count=ring.length,vertices=rows.flatMap(([height,scale])=>ring.flatMap(q=>point(centre[0]+(q[0]-centre[0])*scale,centre[1]+(q[1]-centre[1])*scale,height))),faces=[];
 for(let i=1;i<count-1;i++)faces.push(0,i+1,i,(rows.length-1)*count,(rows.length-1)*count+i,(rows.length-1)*count+i+1);
 for(let r=0;r<rows.length-1;r++)for(let i=0;i<count;i++){
  const a=r*count+i,b=r*count+(i+1)%count;faces.push(a,b,b+count,a,b+count,a+count);
 }
 const solid=mesh(vertices,faces);assert.equal(solid.status(),'NoError');assert(solid.volume()>0);return solid;
}

const body=roofBody(),pieces=[body.solid];
for(const tower of survey.towers){
 const section=CrossSection.ofPolygons([tower.profile],'EvenOdd').simplify(.24),ring=section.toPolygons()[0];section.delete();
 const bottom=Math.min(tower.base-.25,...ring.map(([e,n])=>body.elevationAt(e,n)-.25));
 pieces.push(loft([tower.east,tower.north],ring,[[bottom,1.0],[tower.base+1.0,1.1],[tower.top-1.2,.62],[tower.top,.28]]));
}
for(const chimney of survey.chimneyPeaks){
 const bottom=Math.min(chimney.base-.2,body.elevationAt(chimney.east,chimney.north)-.25);
 pieces.push(turned(chimney.east,-chimney.north,[[bottom-ground,.55],[chimney.top-ground-1.25,.43],
  [chimney.top-ground-.75,.80],[chimney.top-ground,.50]],6));
}
for(const vent of survey.vents){
 const bottom=Math.min(vent.base-.25,body.elevationAt(vent.east,vent.north)-.25);
 pieces.push(turned(vent.east,-vent.north,[[bottom-ground,.75],[vent.top-ground-1.5,.48],[vent.top-ground-.7,.75],[vent.top-ground,.55]],8));
}
const united=Manifold.union(pieces);for(const q of pieces)q.delete();assert.equal(united.status(),'NoError');
const reduced=united.simplify(p.meshTolerance);united.delete();
const shells=reduced.decompose(),positive=shells.filter(q=>q.volume()>1e-5);assert.equal(positive.length,1,'Keep the mapped building and roof structures connected');
const result=printGlb(positive[0],attribution,camera);assert(result.glb.length<30000,'Keep the default reconstruction below 30 kB');
await writeFile(new URL('print.glb',directory),result.glb);
const coordinates=survey.footprint.coordinates.flat(),feature={type:'Feature',id,bbox:[Math.min(...coordinates.map(p=>p[0])),Math.min(...coordinates.map(p=>p[1])),Math.max(...coordinates.map(p=>p[0])),Math.max(...coordinates.map(p=>p[1]))],geometry:survey.footprint,
 properties:{name:'La Pedrera · Casa Milà',place:'Barcelona, Spain',city:'Barcelona',country:'Spain',aliases:['Casa Milà','La Pedrera','Casa Mila'],revision:'r1',geometryType:'building',anchor:survey.anchor,anchorElevation:ground,
 height:+(result.max[1]-result.min[1]).toFixed(3),mesh:path+'print.glb',thumbnail:path+'thumbnail.webp',byteLength:result.glb.length,license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',attribution,sources:survey.sources,
 replacement:{featureIds:['osm-relation-8974896','osm-way-124190212']}}};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(feature,null,2)+'\n');
console.log({bytes:result.glb.length,vertices:result.vertices,triangles:result.triangles,bounds:[result.min,result.max],roofBoundary:body.boundary,roofPoints:body.vertices,
 lowRoof:[[-2,-12],[-7,8],[3,-22]].map(([e,n])=>({east:e,north:n,elevation:body.elevationAt(e,n)}))});
