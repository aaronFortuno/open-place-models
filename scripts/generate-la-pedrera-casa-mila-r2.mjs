import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{ShapeUtils,Vector2}from'three';
import{openSolids,printGlb}from'./monument-solids.mjs';

const id='la-pedrera-casa-mila',path=`models/${id}/r2/`,directory=new URL(`../${path}`,import.meta.url);
const survey=JSON.parse(await readFile(new URL('survey.json',directory),'utf8'));
const{Manifold,CrossSection,turned,mesh}=await openSolids(),p=survey.parameters,ground=survey.referenceGround;
const attribution='Open Place Models contributors · Ajuntament de Barcelona · ICGC · OpenStreetMap contributors';
const camera=[-.15,.48,1.45],point=(east,north,elevation)=>[east,elevation-ground,-north];
const area=r=>r.reduce((s,q,i)=>{const b=r[(i+1)%r.length];return s+q[0]*b[1]-b[0]*q[1];},0)/2;
const withinRing=([x,y],r)=>r.reduce((a,[b,c],i)=>{const[e,f]=r[(i+1)%r.length];return(c>y)!=(f>y)&&x<(e-b)*(y-c)/(f-c)+b?!a:a;},false);
function roofHeight(east,north){
 const near=survey.roofSamples.map(q=>({q,d:Math.hypot(east-q.east,north-q.north)})).sort((a,b)=>a.d-b.d).slice(0,p.roofNeighbours);
 if(near[0].d<.01)return near[0].q.elevation;
 const weights=near.map(q=>1/Math.max(.35,q.d)**2),total=weights.reduce((a,b)=>a+b,0);
 return near.reduce((sum,q,i)=>sum+q.q.elevation*weights[i],0)/total;
}
const facade=survey.facade;
function interpolate(x,xs,ys){
 if(x<=xs[0])return ys[0];if(x>=xs.at(-1))return ys.at(-1);
 const i=xs.findIndex((v,j)=>j&&v>=x),t=(x-xs[i-1])/(xs[i]-xs[i-1]);
 const smooth=t*t*(3-2*t);return ys[i-1]*(1-smooth)+ys[i]*smooth;
}
const sourceS=facade.pathDistances,frontLength=sourceS.at(-1),stations=facade.stations.map(q=>q.distance);
function rawFront(s){
 const i=Math.max(1,sourceS.findIndex(v=>v>=Math.min(frontLength,s))),a=facade.sourcePath[i-1],b=facade.sourcePath[i],t=(s-sourceS[i-1])/(sourceS[i]-sourceS[i-1]);
 return[a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t];
}
function frontAt(s){
 s=Math.max(0,Math.min(frontLength,s));
 const radius=Math.min(facade.sampling.sourceSmoothingRadius,s/2,(frontLength-s)/2);
 const sum=[0,0];let weights=0;
 for(let k=-6;k<=6;k++){const weight=7-Math.abs(k),q=rawFront(s+k*radius/6);sum[0]+=q[0]*weight;sum[1]+=q[1]*weight;weights+=weight;}
 return sum.map(v=>v/weights);
}
function frontNormal(s){const a=frontAt(s-.6),b=frontAt(s+.6),d=Math.hypot(b[0]-a[0],b[1]-a[1]);return[(b[1]-a[1])/d,-(b[0]-a[0])/d];}
const windowRadius=w=>Math.min(facade.sampling.windowRoundRadiusLimit,w.width*.30,(w.top-w.bottom)*.24);
function sampledStations(start,end,step,controls,minimumGap){
 const count=Math.ceil((end-start)/step),samples=Array.from({length:count+1},(_,i)=>start+(end-start)*i/count);
 for(const value of controls){
  if(value<start||value>end||samples.some(q=>Math.abs(q-value)<minimumGap))continue;
  samples.push(value);
 }
 return samples.sort((a,b)=>a-b);
}
const horizontalControls=facade.windows.flatMap(w=>{
 const half=w.width/2,r=windowRadius(w);
 return[-half,-half+r/2,-half+r,half-r,half-r/2,half].map(q=>w.distance+q);
});
const frontSamples=sampledStations(0,frontLength,facade.sampling.streetStep,horizontalControls,.12).map(s=>({s,q:frontAt(s)}));
const heightControls=facade.windows.flatMap(w=>{
 const r=windowRadius(w);return[w.bottom,w.bottom+r/2,w.bottom+r,w.top-r,w.top-r/2,w.top];
});
heightControls.push(...facade.corniceLevels.flatMap(h=>[h-.8,h-.4,h,h+.35,h+.7]));
const wallLevels=[ground,37,...sampledStations(37.4,64.4,facade.sampling.wallStep,heightControls,.09)];
const back=survey.footprintLocal[0].slice(0,45).reverse().map(q=>({q:q.slice(),s:null}));
const perimeter=[...frontSamples,...back.slice(1,-1)];
assert(area(perimeter.map(q=>q.q))>0,'Facade path must run counterclockwise');
function facadePoint(s,h){
 const q=frontAt(s),normal=frontNormal(s),blend=Math.min(1,s/2.5,(frontLength-s)/2.5);
 const band=facade.corniceLevels,radial=facade.radialOffsets.map(row=>interpolate(s,stations,row));
 let offset=interpolate(h,band,radial)-.20,crest=0;
 const wave=interpolate(s,stations,facade.corniceWave);
 for(let i=0;i<band.length;i++){
  const center=band[i]+wave*(.75+i*.07),delta=h-center;
  crest=Math.max(crest,facade.sampling.corniceOutset*Math.exp(-((delta/(delta<0?facade.sampling.corniceLowerSpread:facade.sampling.corniceUpperSpread))**2)));
 }
 offset+=crest;
 let recess=0;
 for(const w of facade.windows){
  const dx=Math.abs(s-w.distance)-w.width/2,half=(w.top-w.bottom)/2,cy=(w.top+w.bottom)/2;
  const arch=windowRadius(w),dy=Math.abs(h-cy)-(half-arch),rx=dx+arch;
  const signed=Math.min(Math.max(rx,dy),0)+Math.hypot(Math.max(rx,0),Math.max(dy,0))-arch;
  const t=Math.max(0,Math.min(1,-signed/facade.sampling.windowRevealBevel));
  recess=Math.max(recess,w.depth*t*t*(3-2*t));
 }
 offset-=recess;
 // Preserve the measured roof interface and the buried foundation exactly.
 const vertical=Math.max(0,Math.min(1,(h-37)/1.0,(65-h)/.7));offset*=blend*vertical;
 return[q[0]+normal[0]*offset,q[1]+normal[1]*offset];
}
function roofBody(){
 let rings=[perimeter.map(q=>q.q),...survey.footprintLocal.slice(1).map(r=>{const section=CrossSection.ofPolygons([r],'EvenOdd').simplify(p.planTolerance),result=section.toPolygons()[0];section.delete();return result;})];
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
 const count=vertices.length,coordinates=vertices.flatMap(([e,n])=>point(e,n,roofHeight(e,n)));
 const indices=faces.flat(),bottomOffset=count;
 coordinates.push(...vertices.flatMap(([e,n])=>point(e,n,ground)));
 indices.push(...faces.flatMap(([a,b,c])=>[bottomOffset+a,bottomOffset+c,bottomOffset+b]));
 // Independent horizontal rings: the changing stone bands and recessed windows
 // are modelled in the surface, rather than texture or repeated vertical walls.
 let outerPrevious=bottomOffset;
 for(const h of wallLevels.slice(1)){
  const start=coordinates.length/3;
  for(const item of perimeter){const q=item.s===null?item.q:facadePoint(item.s,h);coordinates.push(...point(...q,h));}
  for(let i=0;i<perimeter.length;i++){const j=(i+1)%perimeter.length;indices.push(outerPrevious+i,outerPrevious+j,start+j,outerPrevious+i,start+j,start+i);}
  outerPrevious=start;
 }
 for(let i=0;i<perimeter.length;i++){const j=(i+1)%perimeter.length;indices.push(outerPrevious+i,outerPrevious+j,j,outerPrevious+i,j,i);}
 let offset=rings[0].length;
 for(const ring of rings.slice(1)){
  for(let i=0;i<ring.length;i++){const a=offset+i,b=offset+(i+1)%ring.length;indices.push(bottomOffset+a,bottomOffset+b,b,bottomOffset+a,b,a);}
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
const result=printGlb(positive[0],attribution,camera);assert(result.glb.length<4*1024*1024,'Catalogue hard limit');
await writeFile(new URL('print.glb',directory),result.glb);
const envelopes=[];
for(const h of wallLevels){
 const ring=perimeter.map(item=>item.s===null?item.q:facadePoint(item.s,h));envelopes.push(CrossSection.ofPolygons([ring],'EvenOdd'));
}
// RTT generalises the street frontage and can leave a very thin wall in front
// of the reconstructed stone. These retained 2D fragments extend only the
// replacement envelope along the street, bounded by the party-wall planes.
// They never participate in the physical solid or alter its exported GLB.
for(const polygon of survey.replacementEnvelope?.streetAdditionLocal??[])
 envelopes.push(CrossSection.ofPolygons(polygon,'EvenOdd'));
const envelope=CrossSection.union(envelopes),outer=envelope.toPolygons().sort((a,b)=>Math.abs(area(b))-Math.abs(area(a)))[0];
if(survey.replacementEnvelope){
 const retained=CrossSection.union(envelopes.slice(wallLevels.length));
 const selected=CrossSection.ofPolygons([outer,...survey.footprintLocal.slice(1)],'EvenOdd');
 const missing=retained.subtract(selected),missingArea=missing.area();
 assert(missingArea<1e-6,'The chosen replacement envelope must retain every street registration fragment');
 assert(Math.abs(selected.area()-survey.replacementEnvelope.expectedEnvelopeAreaSquareMetres)<1e-5,
  'The replacement envelope must not acquire unintended exterior area');
 console.log({replacementEnvelopeArea:selected.area(),uncoveredRegistrationArea:missingArea});
 missing.delete();selected.delete();retained.delete();
}
for(const e of envelopes)e.delete();envelope.delete();
const k=111320*Math.cos(survey.anchor[1]*Math.PI/180),geographic=([e,n])=>[survey.anchor[0]+e/k,survey.anchor[1]+n/111320];
const geometry={type:'Polygon',coordinates:[outer,...survey.footprintLocal.slice(1)].map(r=>{const q=r.map(geographic);q.push(q[0]);return q;})};
const coordinates=geometry.coordinates.flat(),feature={type:'Feature',id,bbox:[Math.min(...coordinates.map(p=>p[0])),Math.min(...coordinates.map(p=>p[1])),Math.max(...coordinates.map(p=>p[0])),Math.max(...coordinates.map(p=>p[1]))],geometry,
 properties:{name:'La Pedrera · Casa Milà',place:'Barcelona, Spain',city:'Barcelona',country:'Spain',aliases:['Casa Milà','La Pedrera','Casa Mila'],revision:'r2',geometryType:'building',anchor:survey.anchor,anchorElevation:ground,
 height:+(result.max[1]-result.min[1]).toFixed(3),mesh:path+'print.glb',thumbnail:path+'thumbnail.webp',byteLength:result.glb.length,license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',attribution,sources:survey.sources.map(source=>typeof source==='string'?source:source.url),
 replacement:{featureIds:['osm-relation-8974896','osm-way-124190212']}}};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(feature,null,2)+'\n');
console.log({bytes:result.glb.length,vertices:result.vertices,triangles:result.triangles,bounds:[result.min,result.max],roofBoundary:body.boundary,roofPoints:body.vertices,
 lowRoof:[[-2,-12],[-7,8],[3,-22]].map(([e,n])=>({east:e,north:n,elevation:body.elevationAt(e,n)}))});
