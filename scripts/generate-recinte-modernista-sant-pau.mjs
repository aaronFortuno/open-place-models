import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openSolids,printGlb,printIndexedGlb} from './monument-solids.mjs';

const root=new URL('../',import.meta.url),id='recinte-modernista-sant-pau';
const directory=new URL(`models/${id}/r1/`,root),survey=JSON.parse(await readFile(new URL('survey.json',directory),'utf8'));
const {Manifold,CrossSection,mesh,prism,turned}=await openSolids();
const scale=lat=>111320*Math.cos(lat*Math.PI/180),k=scale(survey.anchor[1]);
const geo=([e,n])=>[survey.anchor[0]+e/k,survey.anchor[1]+n/111320];
const attribution='Open Place Models contributors · Ajuntament de Barcelona · ICGC · OpenStreetMap contributors';
const controls={contacts:[],surfaceControls:[],airControls:[],facadeControls:[],expectedReplacements:[],sourceComparisons:[]},features=[],allPositions=[],allIndices=[];
const bounds=ps=>{const q=ps.flat(2);return[Math.min(...q.map(p=>p[0])),Math.min(...q.map(p=>p[1])),Math.max(...q.map(p=>p[0])),Math.max(...q.map(p=>p[1]))];};
const inside=([x,y],r)=>r.reduce((a,[b,c],i)=>{const[e,f]=r[(i+1)%r.length];return(c>y)!=(f>y)&&x<(e-b)*(y-c)/(f-c)+b?!a:a;},false);
const within=(q,ps)=>ps.some(p=>inside(q,p[0])&&!p.slice(1).some(r=>inside(q,r)));
const mean=r=>r.reduce((s,q)=>s.map((x,i)=>x+q[i]/r.length),[0,0]);
function polygons(section){
 const rings=section.toPolygons(),area=r=>r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;
 const ps=rings.filter(r=>area(r)>0).map(r=>[r]);for(const r of rings.filter(r=>area(r)<0)){const p=ps.find(p=>inside(r[0],p[0]));assert(p);p.push(r);}return ps;
}
function audit(result,componentCount){
 const glb=result.glb,head=20+glb.readUInt32LE(12),offset=head+8,pos=new Float32Array(glb.buffer,glb.byteOffset+offset,result.vertices*3),idx=new Uint16Array(glb.buffer,glb.byteOffset+offset+pos.byteLength,result.triangles*3),edges=new Map(),parent=Array.from({length:result.vertices},(_,i)=>i);let volume=0;
 const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
 for(let t=0;t<idx.length;t+=3){const[a,b,c]=[idx[t],idx[t+1],idx[t+2]],A=Array.from(pos.subarray(a*3,a*3+3)),B=Array.from(pos.subarray(b*3,b*3+3)),C=Array.from(pos.subarray(c*3,c*3+3));volume+=(A[0]*(B[1]*C[2]-B[2]*C[1])+A[1]*(B[2]*C[0]-B[0]*C[2])+A[2]*(B[0]*C[1]-B[1]*C[0]))/6;
  for(const[x,y]of[[a,b],[b,c],[c,a]]){parent[find(x)]=find(y);const key=Math.min(x,y)+','+Math.max(x,y),v=edges.get(key)||[0,0];v[0]++;v[1]+=x<y?1:-1;edges.set(key,v);}}
 const boundary=[...edges.values()].filter(q=>q[0]===1).length,nonManifold=[...edges.values()].filter(q=>q[0]!==2).length,orientationConflicts=[...edges.values()].filter(q=>q[1]!==0).length;
 const components=new Set(parent.map((_,i)=>find(i))).size;
 assert.equal(boundary+nonManifold+orientationConflicts,0);assert.equal(components,componentCount);assert(volume>0);assert([...pos].every(Number.isFinite));
 return{errors:[],closed:true,finite:true,vertices:result.vertices,triangles:result.triangles,components,byteLength:glb.length,sha256:createHash('sha256').update(glb).digest('hex'),signedVolume:volume,edges:{total:edges.size,boundary,nonManifold,orientationConflicts},bbox:{min:result.min,max:result.max},dimensions:result.max.map((x,i)=>x-result.min[i])};
}
for(const c of survey.components){
 const g=c.anchorElevation,parts=c.parts,solids=[],cuts=[],plans=[],omitted=[],rawOpenings=[],frames=[],framePlans=[];
 const point=(e,n,h)=>[e,h-g,-n];
 function building(ps,z0,z1,record=true){const s=CrossSection.ofPolygons(ps.flat(),'EvenOdd').simplify(.025);if(record)plans.push(s);const m=s.extrude(z1-z0).translate([0,0,z0-g]).rotate(-90,0,0);if(!record)s.delete();return m;}
 function panel(profile,centre,u,t0,t1){const angle=Math.atan2(u[1],u[0])*180/Math.PI;return prism(profile.map(([a,h])=>[a,h-g]),t0,t1).scale([1,1,-1]).rotate(0,angle,0).translate([centre[0],0,-centre[1]]);}
 const arch=(a,w,bottom,top)=>[[a-w/2,bottom],[a+w/2,bottom],...Array.from({length:13},(_,i)=>[a+w/2*Math.cos(i*Math.PI/12),top-w/2+w/2*Math.sin(i*Math.PI/12)])];
 function roof(ps,eave,ridge,axis=[1,0],hip=false){
  const u=axis,v=[-u[1],u[0]],points=ps.flat(2),projected=points.map(q=>[q[0]*u[0]+q[1]*u[1],q[0]*v[0]+q[1]*v[1]]),b=bounds([[projected]]),width=b[3]-b[1],length=b[2]-b[0],centre=(b[1]+b[3])/2;
  // A clipped height-field wedge replaces cartographic flat ZMAX caps.
  const xs=hip?[b[0],b[0]+Math.min(width*.5,length*.22),b[2]-Math.min(width*.5,length*.22),b[2]]:[b[0]-.03,b[2]+.03],ys=[b[1]-.03,centre,b[3]+.03],vs=[],fs=[];
  for(const a of xs)for(const t of ys){const f=Math.max(0,1-Math.abs(t-centre)/(width/2)),h=eave+(ridge-eave)*Math.min(f,hip?Math.min((a-b[0])/(xs[1]-b[0]),(b[2]-a)/(b[2]-xs.at(-2)),1):1);vs.push(...point(u[0]*a+v[0]*t,u[1]*a+v[1]*t,h));}
  const count=vs.length/3;for(let i=0;i<count;i++)vs.push(vs[i*3],g-g,vs[i*3+2]);
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<2;j++){const a=i*3+j,b=a+3;fs.push(a,a+1,b,a+1,b+1,b,count+a,count+b,count+a+1,count+a+1,count+b,count+b+1);}
  const boundary=[...Array.from({length:xs.length},(_,i)=>i*3),...Array.from({length:2},(_,j)=>(xs.length-1)*3+j+1),...Array.from({length:xs.length-1},(_,i)=>(xs.length-2-i)*3+2),1];
  for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length];fs.push(a,b,count+a,b,count+b,count+a);}
  for(let i=0;i<fs.length;i+=3)[fs[i+1],fs[i+2]]=[fs[i+2],fs[i+1]];
  const wedge=mesh(vs,fs);assert(wedge.volume()>0,'Roof winding must be positive');const mask=building(ps,g,ridge+.1),clipped=wedge.intersect(mask);wedge.delete();mask.delete();assert.equal(clipped.status(),'NoError');return clipped;
 }
 const roofHandles=new Set(c.roofSections.flatMap(s=>s.handles));
 const dome=c.domeHandle&&parts.find(p=>p.handle===c.domeHandle),domeBox=dome&&bounds(dome.polygons),domeCentre=domeBox&&[(domeBox[0]+domeBox[2])/2,(domeBox[1]+domeBox[3])/2];
 const tower=parts.find(p=>p.handle==='17D502');
 for(const part of parts){
  if(roofHandles.has(part.handle)||part===dome||part===tower)continue;
  const b=bounds(part.polygons),width=b[2]-b[0],depth=b[3]-b[1],centre=[(b[0]+b[2])/2,(b[1]+b[3])/2];
  const onDome=dome&&part.area<12&&Math.hypot(centre[0]-domeCentre[0],centre[1]-domeCentre[1])<1.2;
  if(onDome){solids.push(turned(centre[0],-centre[1],[[dome.roof-g-.5,Math.min(width,depth)*.43],[part.roof-g-.4,Math.min(width,depth)*.43],[part.roof-g,Math.min(width,depth)*.17]],12));continue;}
  if(c.kind==='administration'&&part.handle==='1784A1'){solids.push(building(part.polygons,g,90.615));continue;}
  if(c.kind==='administration'&&part.handle==='17E114'){solids.push(roof(part.polygons,81.4,part.roof,[0,1]));continue;}
  if(c.kind==='administration'&&part.area>45){
   const u=centre[0]<0?[Math.SQRT1_2,Math.SQRT1_2]:[Math.SQRT1_2,-Math.SQRT1_2];solids.push(roof(part.polygons,part.roof-2.6,part.roof,u));continue;
  }
  if(c.kind==='porter'){solids.push(roof(part.polygons,part.roof-1.7,part.roof,[Math.SQRT1_2,Math.SQRT1_2],part.area<80));continue;}
  if(c.kind==='operations'&&part.area>30){solids.push(roof(part.polygons,part.roof-2.2,part.roof,[0,1]));continue;}
  // Secondary source roof tiers stay separate. Round high stair caps receive
  // a short helmet rather than a full-height flat cylinder.
  const round=part.area/(width*depth)<.85&&part.area<12&&part.roof>Math.min(...parts.map(p=>p.roof))+6;
  if(round){const r=Math.min(width,depth)*.47;solids.push(turned(centre[0],-centre[1],[[0,r],[part.roof-g-2.1,r],[part.roof-g-1.7,r*1.12],[part.roof-g-.7,r*.7],[part.roof-g,.12]],12));plans.push(CrossSection.ofPolygons([Array.from({length:12},(_,i)=>[centre[0]+r*1.12*Math.cos((i+.5)*Math.PI/6),centre[1]+r*1.12*Math.sin((i+.5)*Math.PI/6)])],'EvenOdd'));}
  else solids.push(building(part.polygons,g,part.roof));
 }
 for(const sec of c.roofSections){const ps=parts.filter(p=>sec.handles.includes(p.handle)).flatMap(p=>p.polygons);solids.push(roof(ps,sec.eaveEstimate,sec.ridgeMeasuredCAD,sec.axis));}
 if(dome){
  const r=Math.min(domeBox[2]-domeBox[0],domeBox[3]-domeBox[1])*.48,eave=dome.roof-3.4;
  solids.push(turned(domeCentre[0],-domeCentre[1],[[0,r],[eave-g-.3,r],[eave-g,r*1.04],[eave-g+.6,r*1.01],[eave-g+1.7,r*.83],[dome.roof-g-.4,r*.30],[dome.roof-g,r*.13]],24));
  plans.push(CrossSection.ofPolygons([Array.from({length:24},(_,i)=>[domeCentre[0]+r*1.04*Math.cos((i+.5)*Math.PI/12),domeCentre[1]+r*1.04*Math.sin((i+.5)*Math.PI/12)])],'EvenOdd'));
 }
 if(c.kind==='north'){
  const q=survey.northCourtyard.location,en=[(q[0]-survey.anchor[0])*k,(q[1]-survey.anchor[1])*111320],hole=c.localFootprint.flatMap(p=>p.slice(1)).find(r=>inside(en,r));assert(hole,'Measured north court must correspond to a source hole');
  solids.push(building([[hole]],g,69.3));
 }
 if(tower){
  const b=bounds(tower.polygons),cx=(b[0]+b[2])/2,cn=(b[1]+b[3])/2;
  // Open belfry and narrowing clock stage. Stages are photographic estimates,
  // the source fixes the position, 90.615m shoulder and 112.473m LiDAR tip.
  solids.push(turned(cx,-cn,[[90.35-g,3.1],[91.1-g,3.1],[96.1-g,2.65],[96.6-g,2.85]],8));
  for(let i=0;i<8;i++){const a=i*Math.PI/4,e=cx+2.45*Math.cos(a),n=cn+2.45*Math.sin(a);solids.push(turned(e,-n,[[89.9-g,.38],[97.8-g,.32],[99-g,.10]],8));}
  solids.push(turned(cx,-cn,[[96.2-g,1.45],[103.2-g,1.25],[104-g,.9],[106.2-g,.65],[110.8-g,.22],[112.473-g,.08]],12));
  const stage=parts.find(p=>p.handle==='1784A1');
  for(let i=0;i<4;i++){const a=i*Math.PI/2,u=[Math.cos(a),Math.sin(a)],v=[-u[1],u[0]];cuts.push(panel(arch(0,1.5,91.2,95.5),[cx,cn],u,-3.4,3.4));}
  // Cross finial, deliberately thickened; clocks are broad circular relief.
  for(let i=0;i<4;i++){const a=i*Math.PI/2;const disk=Manifold.cylinder(.40,.80,.80,20).translate([0,101.2-g,-1.50]).rotate(0,a*180/Math.PI,0).translate([cx,0,-cn]);solids.push(disk);}
  solids.push(building([[[[cx-.85,cn-.12],[cx+.85,cn-.12],[cx+.85,cn+.12],[cx-.85,cn+.12]]]],110.9,111.15));
 }
 // A footprint-confined subgrade connection does not bridge the gardens.
 plans.push(CrossSection.ofPolygons(c.localFootprint.flat(),'EvenOdd').simplify(.025));
 let physical=CrossSection.union(plans);const base=physical.extrude(1.0).rotate(-90,0,0);solids.push(base);for(const p of plans)p.delete();
 let solid=Manifold.union(solids);for(const p of solids)p.delete();assert.equal(solid.status(),'NoError');
 function recess(name,centre,u,a,w,bottom,top,outside=-12,depth=.9){
  const v=[-u[1],u[0]],h=(bottom+top)/2,start=point(centre[0]+u[0]*a+v[0]*outside,centre[1]+u[1]*a+v[1]*outside,h),end=point(centre[0]+u[0]*a-v[0]*outside,centre[1]+u[1]*a-v[1]*outside,h),hits=solid.rayCast(start,end).sort((x,y)=>Math.hypot(...x.position.map((z,i)=>z-start[i]))-Math.hypot(...y.position.map((z,i)=>z-start[i])));
  const above=solid.rayCast(start,[start[0],140,start[2]]),crossings=[...new Set(above.map(q=>q.position[1].toFixed(4)))];
  if(crossings.length%2){omitted.push(name+' (adjoining volume covers this facade)');return;}
  if(!hits.length){omitted.push(name);return;}
  const hit=hits[0].position,t=(hit[0]-centre[0])*v[0]+(-hit[2]-centre[1])*v[1],sign=outside<0?1:-1;
  cuts.push(panel(arch(a,w,bottom,top),centre,u,Math.min(t-sign*.85,t+sign*depth),Math.max(t-sign*.85,t+sign*depth)));
  if(c.kind==='administration'||name.startsWith('dayroom')){
   const outer=panel(arch(a,w+.48,bottom-.15,top+.24),centre,u,Math.min(t-sign*.30,t+sign*.5),Math.max(t-sign*.30,t+sign*.5)),inner=panel(arch(a,w,bottom,top),centre,u,t-1,t+1);frames.push(outer.subtract(inner));outer.delete();inner.delete();
   const rectangle=[[a-(w+.48)/2,t-sign*.30],[a+(w+.48)/2,t-sign*.30],[a+(w+.48)/2,t+sign*.5],[a-(w+.48)/2,t+sign*.5]].map(([s,d])=>[centre[0]+u[0]*s+v[0]*d,centre[1]+u[1]*s+v[1]*d]);framePlans.push(CrossSection.ofPolygons([rectangle],'EvenOdd'));
  }
  rawOpenings.push({name,centre,u,a,h,t,sign,depth});
 }
 if(c.kind==='ward'){
  const sec=c.roofSections[0],u=sec.axis,b=sec.bounds,v=sec.normal,edge=(b[1]+b[3])/2,eave=sec.eaveEstimate;
  for(const side of[-1,1])for(let i=0;i<6;i++){const a=b[0]+(b[2]-b[0])*(i+.5)/6;recess('ward-'+side+'-'+i,[0,0],u,a,2.2,eave-6.5,eave-1.0,side*100,.8);}
  const top=dome.roof-3.65,bottom=top-6.4,r=Math.min(domeBox[2]-domeBox[0],domeBox[3]-domeBox[1])*.48;
  for(let i=0;i<8;i++){const a=i*Math.PI/4,u=[Math.cos(a),Math.sin(a)];recess('dayroom-'+i,domeCentre,u,0,2.15,bottom,top,-r-2,1.0);}
 }
 if(c.kind==='administration'){
  // Central three-bay pointed facade and both diagonal gallery wings.
  for(const[a,w]of[[-5.2,3.1],[.5,4.2],[6.1,3.1]])for(const[bottom,top]of[[60,66.8],[70.5,76.8],[78,82.1]])recess('central-'+a+'-'+bottom,[.5,-111.5],[1,0],a,w,bottom,top,-14,1.1);
  for(const side of[-1,1]){const u=[Math.SQRT1_2,-side*Math.SQRT1_2],centre=side<0?[-25,-112]:[25,-112];for(let i=-2;i<=2;i++)for(const[bottom,top]of[[61,68.5],[70,76]])recess('wing-'+side+'-'+i+'-'+bottom,centre,u,i*5.8,3.25,bottom,top,-20,.9);}
 }
 if(c.kind==='operations')for(const a of[-3,0,3])recess('operations-'+a,[0,-15.7],[1,0],a,2,66,72.5,-18,1.0);
 if(cuts.length){const cut=Manifold.union(cuts),next=solid.subtract(cut);solid.delete();cut.delete();for(const p of cuts)p.delete();solid=next;}
 if(frames.length){const framed=Manifold.union([solid,...frames]);solid.delete();for(const q of frames)q.delete();solid=framed;}
 const simplified=solid.simplify(.018);solid.delete();solid=simplified;assert.equal(solid.status(),'NoError');
 const decomposed=solid.decompose(),positive=decomposed.filter(p=>p.volume()>1e-4),physicalCount=positive.length;if(physicalCount!==1)console.log('COMPONENTS',c.id,JSON.stringify(decomposed.map(p=>({volume:p.volume(),bounds:p.boundingBox()}))));assert.equal(physicalCount,1,c.id+' must be one physical piece');
 const filledInternalCavities=decomposed.filter(p=>p.volume()<0).map(p=>-p.volume());solid.delete();solid=positive[0];for(const p of decomposed)if(p!==solid)p.delete();
 if(framePlans.length){const next=CrossSection.union([physical,...framePlans]);physical.delete();for(const p of framePlans)p.delete();physical=next;}
 // Stored component frame uses its own geographic scale and elevation.
 const offset=[(c.anchor[0]-survey.anchor[0])*k,(c.anchor[1]-survey.anchor[1])*111320],ratio=scale(c.anchor[1])/k;
 const local=solid.translate([-offset[0],0,offset[1]]).scale([ratio,1,1]),result=printGlb(local,attribution,[0,.55,1]);
 const path=`models/${c.id}/r1/`,out=new URL(path,root);await mkdir(out,{recursive:true});await writeFile(new URL('print.glb',out),result.glb);
 const report={id:c.id,name:c.name,...audit(result,1),anchor:c.anchor,anchorElevation:g,omittedOpenings:omitted,filledInternalCavitiesCubicMetres:filledInternalCavities};
 // Contacts are deliberately within the roof projection, below local ground.
 const candidates=parts.slice().sort((a,b)=>b.area-a.area).slice(0,4);
 for(const p of candidates){const b=bounds(p.polygons),points=p.polygons.flat(2);let q=mean(points);if(!within(q,p.polygons))q=points[0].map((x,i)=>x*.9+mean(points)[i]*.1);const location=geo(q),record={modelId:c.id,name:'footing-'+p.handle,location,elevation:g};controls.contacts.push(record);}
 const desired=[...c.roofSections.map(s=>({name:'ridge-'+s.index,q:[s.axis[0]*(s.bounds[0]+s.bounds[2])/2+s.normal[0]*(s.bounds[1]+s.bounds[3])/2,s.axis[1]*(s.bounds[0]+s.bounds[2])/2+s.normal[1]*(s.bounds[1]+s.bounds[3])/2],measured:s.ridgeMeasuredCAD})),...c.samples.filter(s=>s.kind==='roof-section'&&s.along===.15&&[.08,.5,.92].includes(s.across)).map(s=>({name:'pitch-'+s.section+'-'+s.across,q:[s.east,s.north],measured:s.elevation})),...c.samples.filter(s=>s.kind==='part-centre').sort((a,b)=>b.cadRoof-a.cadRoof).slice(0,3).map(s=>({name:'roof-'+s.handle,q:[s.east,s.north],measured:s.elevation}))];
 if(c.kind==='north'){const q=survey.northCourtyard.location;desired.push({name:'courtyard-deck',q:[(q[0]-survey.anchor[0])*k,(q[1]-survey.anchor[1])*111320],measured:69.3});}
 for(const d of desired){const hits=solid.rayCast(point(...d.q,130),point(...d.q,g-1)).sort((a,b)=>b.position[1]-a.position[1]);if(!hits.length)continue;const h=hits[0].position[1]+g;controls.surfaceControls.push({modelId:c.id,name:d.name,location:geo(d.q),expectedElevation:h,toleranceMetres:.015});controls.sourceComparisons.push({modelId:c.id,name:d.name,location:geo(d.q),meshElevation:h,referenceElevation:d.measured,differenceMetres:h-d.measured,note:d.name.startsWith('ridge')?'Mid-roof may intersect a source dormer or lantern; source main ridge is also preserved away from it.':'DSM is a1m surface cell; curved/ornamented surfaces may differ at subcell positions.'});}
 if(c.kind==='north'){const q=survey.northCourtyard.location;controls.airControls.push({modelId:c.id,name:'open-upper-courtyard',location:q,minElevation:69.5,maxElevation:89});}
 if(c.kind==='administration'){
  const b=bounds(tower.polygons),q=[(b[0]+b[2])/2,(b[1]+b[3])/2];controls.airControls.push({modelId:c.id,name:'open-clock-belfry',location:geo(q),minElevation:91.4,maxElevation:94.6});
  controls.airControls.push({modelId:c.id,name:'open-forecourt',location:geo([0,-126]),minElevation:54,maxElevation:89});
 }
 for(const a of controls.airControls.filter(q=>q.modelId===c.id)){const q=[(a.location[0]-survey.anchor[0])*k,(a.location[1]-survey.anchor[1])*111320];assert.equal(solid.rayCast(point(...q,a.minElevation),point(...q,a.maxElevation)).length,0,a.name+' must be open');}
 const openingDepthChecks=[];
 for(const [openingIndex,r] of rawOpenings.entries()){
  const v=[-r.u[1],r.u[0]],en=t=>[r.centre[0]+r.u[0]*r.a+v[0]*t,r.centre[1]+r.u[1]*r.a+v[1]*t],from=en(r.t-r.sign*2),to=en(r.t+r.sign*3),hits=solid.rayCast(point(...from,r.h),point(...to,r.h));
  if(!hits.length)continue;const hit=hits.sort((a,b)=>Math.hypot(a.position[0]-from[0],-a.position[2]-from[1])-Math.hypot(b.position[0]-from[0],-b.position[2]-from[1]))[0],actualDepth=((hit.position[0]-r.centre[0])*v[0]+(-hit.position[2]-r.centre[1])*v[1]-r.t)*r.sign;
  openingDepthChecks.push({name:r.name,expected:r.depth,actual:actualDepth});
  assert(actualDepth>r.depth-.08,c.id+' '+r.name+' must remain an exterior recess');
  if(openingIndex%5===0&&controls.facadeControls.filter(q=>q.modelId===c.id).length<4)controls.facadeControls.push({modelId:c.id,name:r.name,from:geo(from),to:geo(to),elevation:r.h,expectedLocation:geo([hit.position[0],-hit.position[2]]),depthMetres:actualDepth});
 }
 const fp=polygons(physical),coordinates=fp.map(p=>p.map(r=>{const out=r.map(geo);out.push(out[0]);return out;}));physical.delete();
 const q=coordinates.flat(2),bbox=[Math.min(...q.map(p=>p[0])),Math.min(...q.map(p=>p[1])),Math.max(...q.map(p=>p[0])),Math.max(...q.map(p=>p[1]))];
 features.push({type:'Feature',id:c.id,bbox,geometry:{type:'MultiPolygon',coordinates},properties:{name:c.name,place:'Barcelona, Spain',country:'Spain',city:'Barcelona',geometryType:'building',galleryParent:id,revision:'r1',anchor:c.anchor,anchorElevation:g,height:+result.max[1].toFixed(3),mesh:path+'print.glb',thumbnail:`models/${id}/r1/thumbnail.webp`,byteLength:result.glb.length,license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',attribution,sources:survey.sources,aliases:c.aliases,replacement:{featureIds:c.replacementIds}}});
 controls.expectedReplacements.push({modelId:c.id,featureIds:c.replacementIds});
 report.openingDepthChecks=openingDepthChecks;
 const projection=solid.getMesh().vertProperties,segmentDistance=(p,a,b)=>{const d=b.map((x,i)=>x-a[i]),l=d[0]**2+d[1]**2,t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/l));return Math.hypot(p[0]-a[0]-d[0]*t,p[1]-a[1]-d[1]*t);};let outsideDistance=0;
 for(let i=0;i<projection.length;i+=3){const p=[projection[i],-projection[i+2]];if(!within(p,fp))outsideDistance=Math.max(outsideDistance,Math.min(...fp.flat().flatMap(r=>r.map((a,j)=>segmentDistance(p,a,r[(j+1)%r.length])))));}
 report.maximumProjectionOutsideFootprintMetres=outsideDistance;assert(outsideDistance<.001,'Mask must cover physical projections');
 await writeFile(new URL('audit.json',out),JSON.stringify(report,null,2)+'\n');
 const m=solid.getMesh(),offsetIndex=allPositions.length/3;for(let i=0;i<m.vertProperties.length;i+=3)allPositions.push(m.vertProperties[i],m.vertProperties[i+1]+g-survey.anchorElevation,m.vertProperties[i+2]);for(const v of m.triVerts)allIndices.push(v+offsetIndex);
 console.log(c.id,result.glb.length,result.vertices,result.triangles,'closed',report.closed);local.delete();solid.delete();
}
assert(allPositions.length/3<65536);const group=printIndexedGlb(Float32Array.from(allPositions),Uint16Array.from(allIndices),attribution,[0,.65,1]);
await writeFile(new URL('print.glb',directory),group.glb);await writeFile(new URL('audit.json',directory),JSON.stringify({id,...audit(group,13),anchor:survey.anchor,anchorElevation:survey.anchorElevation,componentIds:features.map(f=>f.id)},null,2)+'\n');
const coordinates=features.flatMap(f=>f.geometry.coordinates),q=coordinates.flat(2),bbox=[Math.min(...q.map(p=>p[0])),Math.min(...q.map(p=>p[1])),Math.max(...q.map(p=>p[0])),Math.max(...q.map(p=>p[1]))];
features.unshift({type:'Feature',id,bbox,geometry:{type:'MultiPolygon',coordinates},properties:{name:survey.name,kind:'group',revision:'r1',anchor:survey.anchor,anchorElevation:survey.anchorElevation,height:+group.max[1].toFixed(3),mesh:`models/${id}/r1/print.glb`,thumbnail:`models/${id}/r1/thumbnail.webp`,place:'Barcelona, Spain',country:'Spain',city:'Barcelona',geometryType:'building',aliases:['Hospital de Sant Pau','Hospital de la Santa Creu i Sant Pau','Sant Pau Art Nouveau Site'],attribution,license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',sources:survey.sources,byteLength:group.glb.length}});
await writeFile(new URL('controls.json',directory),JSON.stringify(controls,null,2)+'\n');
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify({type:'FeatureCollection',features},null,2)+'\n');
console.log('GROUP',group.glb.length,group.vertices,group.triangles);
