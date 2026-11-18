import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import{openSolids,printIndexedGlb}from'./monument-solids.mjs';
import{cleanPrintMesh,readPrintMesh,auditPrintMesh,rawMeshRayCast}from'./clean-print-mesh.mjs';

const id='santa-maria-del-mar',path=`models/${id}/r1/`,dir=new URL(`../${path}`,import.meta.url),s=JSON.parse(await readFile(new URL('survey.json',dir),'utf8'));
const {Manifold,CrossSection,mesh,prism,turned}=await openSolids(),g=s.anchorElevation,o=s.frame.originLocal,u=s.frame.across,v=s.frame.depth;
const k=111320*Math.cos(s.anchor[1]*Math.PI/180),en=(a,b)=>[o[0]+u[0]*a+v[0]*b,o[1]+u[1]*a+v[1]*b],ab=q=>[(q[0]-o[0])*u[0]+(q[1]-o[1])*u[1],(q[0]-o[0])*v[0]+(q[1]-o[1])*v[1]],geo=q=>[s.anchor[0]+q[0]/k,s.anchor[1]+q[1]/111320],world=(q,h)=>[q[0],h-g,-q[1]];
const attribution='Open Place Models contributors · Ajuntament de Barcelona · ICGC · OpenStreetMap contributors',pieces=[],cuts=[],plans=[],frames=[],openingRecords=[],omitted=[];
const signed=r=>r.reduce((a,p,i)=>{const q=r[(i+1)%r.length];return a+p[0]*q[1]-q[0]*p[1];},0)/2;
const inside=([x,y],r)=>r.reduce((a,[b,c],i)=>{const[e,f]=r[(i+1)%r.length];return(c>y)!=(f>y)&&x<(e-b)*(y-c)/(f-c)+b?!a:a;},false);
const within=(q,ps)=>ps.some(p=>inside(q,p[0])&&!p.slice(1).some(r=>inside(q,r)));
function building(ps,bottom,top,record=true){const section=CrossSection.ofPolygons(ps.flat(),'EvenOdd').simplify(.015);if(record)plans.push(section);const solid=section.extrude(top-bottom).translate([0,0,bottom-g]).rotate(-90,0,0);if(!record)section.delete();return solid;}
function panel(profile,centre,along,t0,t1){return prism(profile.map(([a,h])=>[a,h-g]),t0,t1).scale([1,1,-1]).rotate(0,Math.atan2(along[1],along[0])*180/Math.PI,0).translate([centre[0],0,-centre[1]]);}
const inFrame=(profile,b0,b1)=>panel(profile,o,u,b0,b1);
function pointed(a,w,bottom,top,spring=top-w*.72){const r=w/2;return[[a-r,bottom],[a+r,bottom],...Array.from({length:9},(_,i)=>{const x=r-i*w/8;return[a+x,spring+(top-spring)*Math.sqrt(Math.max(0,4*r*r-(Math.abs(x)+r)**2))/(Math.sqrt(3)*r)];})];}
const circle=(a,h,r,n=32)=>Array.from({length:n},(_,i)=>[a+r*Math.cos(i*2*Math.PI/n),h+r*Math.sin(i*2*Math.PI/n)]);
const rect=(a0,a1,b0,b1)=>[[[en(a0,b0),en(a1,b0),en(a1,b1),en(a0,b1)]]];
function beam(a,b,r,count=8){const d=b.map((x,i)=>x-a[i]),L=Math.hypot(...d),n=d.map(x=>x/L);let axis=[-n[1],n[0],0];if(Math.hypot(...axis)<1e-6)axis=[1,0,0];const size=Math.hypot(...axis);axis=axis.map(x=>x/size);const w=[n[1]*axis[2]-n[2]*axis[1],n[2]*axis[0]-n[0]*axis[2],n[0]*axis[1]-n[1]*axis[0]],verts=[a,b].flatMap(c=>Array.from({length:count},(_,i)=>c.map((x,j)=>x+r*(axis[j]*Math.cos(i*2*Math.PI/count)+w[j]*Math.sin(i*2*Math.PI/count)))).flat()),faces=[];for(let i=1;i<count-1;i++)faces.push(0,i+1,i,count,count+i,count+i+1);for(let i=0;i<count;i++){const j=(i+1)%count;faces.push(i,j,j+count,i,j+count,i+count);}return mesh(verts,faces);}

// Fit the shallow weathering roof to real transverse rows. Local fixtures
// above the municipal envelope do not raise an entire roof plane.
const roofPoints=s.roofSamples.map(p=>({...p,a:Math.round(ab([p.east,p.north])[0]*1000)/1000,b:Math.round(ab([p.east,p.north])[1]*1000)/1000})).filter(p=>Math.abs(p.a)<=6.05&&p.b>=.9&&p.b<=69.2&&p.elevation>35);
const linear=(a,b,t)=>a+(b-a)*t;
function interpolate(points,x){const p=points.slice().sort((a,b)=>a[0]-b[0]);if(x<=p[0][0])return p[0][1];if(x>=p.at(-1)[0])return p.at(-1)[1];for(let i=1;i<p.length;i++)if(x<=p[i][0])return linear(p[i-1][1],p[i][1],(x-p[i-1][0])/(p[i][0]-p[i-1][0]));}
// Axis-only samples constrain the ridge, never a complete transverse row.
// The bulk roof slopes use inner +/-3m cells; edge parapets remain separate.
const sectionDepths=[...new Set(roofPoints.filter(p=>Math.abs(Math.abs(p.a)-3)<.02).map(p=>p.b))].sort((a,b)=>a-b);
const ridgePoints=roofPoints.filter(p=>Math.abs(p.a)<.02).map(p=>[p.b,p.elevation>37.82?37.45:p.elevation]);
const slopeRows=sectionDepths.map(b=>{const points=roofPoints.filter(p=>p.b===b),ridge=interpolate(ridgePoints,b);return{b,left:Math.min(-.005,(points.find(p=>Math.abs(p.a+3)<.02).elevation-ridge)/3),right:Math.min(-.005,(points.find(p=>Math.abs(p.a-3)<.02).elevation-ridge)/3)};});
const xs=[-8,-4,0,4,8],ys=[1.1,...sectionDepths.filter(b=>b>1.1),67,69.3].sort((a,b)=>a-b);
function roofHeight(a,b){const ridge=Math.min(37.818,interpolate(ridgePoints,b)),slope=interpolate(slopeRows.map(p=>[p.b,a<0?p.left:p.right]),b);return Math.max(35.5,ridge+slope*Math.abs(a));}
function roofField(){const verts=[],faces=[];for(const b of ys)for(const a of xs)verts.push(...world(en(a,b),roofHeight(a,b)));const N=verts.length/3;for(let i=0;i<N;i++)verts.push(verts[i*3],0,verts[i*3+2]);for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++){const a=j*xs.length+i,b=a+xs.length;faces.push(a,a+1,b,a+1,b+1,b,N+a,N+b,N+a+1,N+a+1,N+b,N+b+1);}const ring=[...Array.from({length:xs.length},(_,i)=>i),...Array.from({length:ys.length-1},(_,j)=>(j+1)*xs.length+xs.length-1),...Array.from({length:xs.length-1},(_,i)=>(ys.length-1)*xs.length+xs.length-2-i),...Array.from({length:ys.length-2},(_,j)=>(ys.length-2-j)*xs.length)];for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];faces.push(a,N+a,b,b,N+a,N+b);}const field=mesh(verts,faces);assert(field.volume()>0);return field;}
const replaced=new Set(['17D9FC','17BEE4',...s.towers.map(t=>t.handle),...s.towers.map(t=>t.lowerHandle)]);
for(const p of s.parts)if(!replaced.has(p.handle)){const body=building(p.polygons,g,p.roof);pieces.push(body);}
const nave=s.parts.find(p=>p.handle==='17D9FC'),field=roofField(),mask=building(nave.polygons,g,39),weathering=field.intersect(mask);field.delete();mask.delete();pieces.push(weathering);

// The photographed front screen is lower than the nave roof immediately
// behind it. Added DSM points locate that distinction at the front line.
const f=s.facade;
pieces.push(inFrame([[-f.halfFull,g],[f.halfFull,g],[f.halfFull,f.shoulder],[f.halfCentral,f.centralTop],[-f.halfCentral,f.centralTop],[-f.halfFull,f.shoulder]],f.plane,f.back));
plans.push(CrossSection.ofPolygons(rect(-f.halfFull,f.halfFull,f.plane,f.back).flat(),'EvenOdd'));
for(const[handle,top]of[['17D6B7',f.buttressTops[0]],['17BD1F',f.buttressTops[1]]]){const p=s.parts.find(p=>p.handle===handle),q=p.polygons[0][0],centre=q.slice(0,-1).reduce((a,p)=>a.map((x,i)=>x+p[i]/(q.length-1)),[0,0]);pieces.push(turned(centre[0],-centre[1],[[p.roof-g-.1,.55],[top-g-.3,.48],[top-g,.24]],8));}
const portal=f.portal;
pieces.push(inFrame(pointed(0,9.0,g,19.2,13.5),-3.15,.35));
pieces.push(inFrame([[-4.8,14.5],[4.8,14.5],[0,portal.gableTop]],-3.55,-2.70));
pieces.push(building(rect(-5.7,-3.6,-3.35,.3),g,14.5),building(rect(3.6,5.7,-3.35,.3),g,14.5));
plans.push(CrossSection.ofPolygons(rect(-5.7,5.7,-3.55,.35).flat(),'EvenOdd'));
cuts.push(inFrame(pointed(0,7.2,4.65,18.15,12.9),-3.7,-1.55),inFrame(pointed(0,4,4.65,11.1,8.5),-3.7,.25));
for(const[width,top,depth]of[[8.5,18.95,-3.30],[7.9,18.55,-3.46]]){const outer=inFrame(pointed(0,width,4.65,top,13.25),depth,-2.7),inner=inFrame(pointed(0,width-.30,4.65,top-.25,13.1),depth-.1,-2.5);frames.push(outer.subtract(inner));outer.delete();inner.delete();}

// The attached chapel is clipped to the verified physical OSM footprint;
// no unassigned northern strip is incorporated to simplify replacement.
pieces.push(building(s.chapel.polygons,g,s.chapel.mainRoof));
for(const p of s.chapel.parts)if(p.roof>s.chapel.mainRoof+.05)pieces.push(building(p.polygons,g,p.roof));

function outline(p){const raw=CrossSection.ofPolygons(p.polygons.flat(),'EvenOdd'),cs=raw.simplify(.04),r=cs.toPolygons().filter(r=>signed(r)>0).sort((a,b)=>Math.abs(signed(b))-Math.abs(signed(a)))[0];cs.delete();raw.delete();return r;}
function octagonalEnvelope(points,upper){const lines=upper.map((a,i)=>{const b=upper[(i+1)%upper.length],d=[b[0]-a[0],b[1]-a[1]],L=Math.hypot(...d),n=[d[1]/L,-d[0]/L];return{n,h:Math.max(...points.map(p=>p[0]*n[0]+p[1]*n[1]))};});return lines.map((b,i)=>{const a=lines[(i+lines.length-1)%lines.length],D=a.n[0]*b.n[1]-a.n[1]*b.n[0];return[(a.h*b.n[1]-a.n[1]*b.h)/D,(a.n[0]*b.h-a.h*b.n[0])/D];});}
const towerAir=[];
for(const t of s.towers){
 const low=s.parts.find(p=>p.handle===t.lowerHandle),high=s.parts.find(p=>p.handle===t.handle),upper=outline(high),lower=octagonalEnvelope(outline(low),upper),lowerSection=CrossSection.ofPolygons([lower],'EvenOdd'),upperSection=CrossSection.ofPolygons([upper],'EvenOdd');
 pieces.push(building([[lower]],g,44.253),building([[upper]],g,49.25));
 for(const h of[37.75,44.253]){const ledge=lowerSection.offset(.13,'Miter',2),p=ledge.toPolygons();pieces.push(building([p],h-.12,h+.20));ledge.delete();}
 const rimOuter=upperSection.offset(.18,'Miter',2),rimInner=upperSection.offset(-.22,'Miter',2),ring=rimOuter.subtract(rimInner);pieces.push(ring.extrude(t.rimTop-49.15).translate([0,0,49.15-g]).rotate(-90,0,0));plans.push(rimOuter);rimInner.delete();ring.delete();
 for(const[stageIndex,stage]of t.openStages.entries()){
  const r=stageIndex<2?lower:upper;
  for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]),along=[(b[0]-a[0])/L,(b[1]-a[1])/L],c=[(a[0]+b[0])/2,(a[1]+b[1])/2];cuts.push(panel(pointed(0,Math.min(stage.width,L*.74),stage.bottom,stage.top),c,along,-.20,2.65));}
  towerAir.push({name:t.name+'-belfry-'+stageIndex,location:geo(t.centre),minElevation:stage.bottom+.15,maxElevation:stage.top-.4});
 }
 for(let i=0;i<upper.length;i++){const a=upper[i],b=upper[(i+1)%upper.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]),along=[(b[0]-a[0])/L,(b[1]-a[1])/L],c=[(a[0]+b[0])/2,(a[1]+b[1])/2];cuts.push(panel([[ -.35,49.42],[.35,49.42],[.35,t.rimTop-.18],[-.35,t.rimTop-.18]],c,along,-.35,.55));}
 if(t.crownTop){const profile=[[49.17,.78],[t.rimTop-.04,.78],[t.rimTop+.38,.74],[t.rimTop+.82,.45],[t.rimTop+1.12,.12]];for(let i=0;i<4;i++){const a=i*Math.PI/2;for(let j=0;j<profile.length-1;j++){const p=([h,r])=>world([t.centre[0]+r*Math.cos(a),t.centre[1]+r*Math.sin(a)],h);pieces.push(beam(p(profile[j]),p(profile[j+1]),.15,6));}}pieces.push(turned(t.centre[0],-t.centre[1],[[t.rimTop+1.0-g,.13],[t.crownTop-g,.06]],8));pieces.push(beam(world([t.centre[0]-.35,t.centre[1]],t.crownTop-.7),world([t.centre[0]+.35,t.centre[1]],t.crownTop-.7),.065,6));}
 lowerSection.delete();upperSection.delete();
}

plans.push(CrossSection.ofPolygons([...s.basilicaOSM,...s.chapel.polygons].flat(),'EvenOdd'));
let physical=CrossSection.union(plans);for(const p of plans)p.delete();pieces.push(physical.extrude(.75).rotate(-90,0,0));
let solid=Manifold.union(pieces);for(const p of pieces)p.delete();assert.equal(solid.status(),'NoError');
function recess(name,centre,along,width,bottom,top,depth=.9,shape=null){const inward=[-along[1],along[0]],h=(bottom+top)/2,at=t=>world([centre[0]+inward[0]*t,centre[1]+inward[1]*t],h),from=at(-6),to=at(16),hits=solid.rayCast(from,to).sort((a,b)=>Math.hypot(...a.position.map((x,i)=>x-from[i]))-Math.hypot(...b.position.map((x,i)=>x-from[i])));if(!hits.length){omitted.push(name);return;}const above=solid.rayCast(from,[from[0],80,from[2]]),crossings=[...new Set(above.map(q=>q.position[1].toFixed(4)))];if(crossings.length%2){omitted.push(name+' (adjoining volume covers this face)');return;}const hit=hits[0].position,t=(hit[0]-centre[0])*inward[0]+(-hit[2]-centre[1])*inward[1];cuts.push(panel(shape||pointed(0,width,bottom,top),centre,along,t-.35,t+depth));openingRecords.push({name,centre,along,inward,h,t,depth});}
recess('rose',en(f.rose.a,0),u,f.rose.radius*2,f.rose.centre-f.rose.radius,f.rose.centre+f.rose.radius,f.rose.depth,circle(0,f.rose.centre,f.rose.radius));
const roseOuter=inFrame(circle(f.rose.a,f.rose.centre,f.rose.rim),-.32,.25),roseInner=inFrame(circle(f.rose.a,f.rose.centre,f.rose.radius),-.5,.5);frames.push(roseOuter.subtract(roseInner));roseOuter.delete();roseInner.delete();
for(const a of[-10.8,10.8])recess('front-upper-'+a,en(a,0),u,2.45,21.0,28.8);
for(const a of[-11,-8.5,8.5,11])recess('front-lower-'+a,en(a,0),u,1.9,7.3,16.3);
for(const side of[-1,1]){
 const along=side<0?v.map(x=>-x):v;
 for(const b of[7.6,21.5,35,48.5,58.7])recess('side-upper-'+side+'-'+b,en(side*14.3,b),along,3.1,22.1,30.0);
 for(const b of[4.8,10.6,18.8,25,32.5,38.5,45.5,51.5,58.7,65.7])recess('side-lower-'+side+'-'+b,en(side*17.8,b),along,2.15,7.5,17.7);
}
// Upper and low radial apse faces retain the real direction changes.
for(const p of s.parts.filter(p=>p.roof===20.272&&p.area<25)){
 const r=outline(p),centre=ab(r.reduce((a,q)=>a.map((x,i)=>x+q[i]/r.length),[0,0]));if(centre[1]<68)continue;let chosen;
 for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],q=[(a[0]+b[0])/2,(a[1]+b[1])/2],d=Math.hypot(...ab(q).map((x,i)=>x-(i?61.8:0)));if(!chosen||d>chosen.d)chosen={a,b,q,d};}
 const{a,b,q}=chosen,L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L>2)recess('apse-'+p.handle,q,[(b[0]-a[0])/L,(b[1]-a[1])/L],Math.min(2.0,L*.65),7.5,17.8);
}
const cutter=Manifold.union(cuts),carved=solid.subtract(cutter);solid.delete();cutter.delete();for(const p of cuts)p.delete();solid=carved;
const framed=Manifold.union([solid,...frames]);solid.delete();for(const p of frames)p.delete();solid=framed;
assert.equal(solid.status(),'NoError');
const shells=solid.decompose(),positive=shells.filter(p=>p.volume()>1e-4),filled=shells.filter(p=>p.volume()<0).map(p=>-p.volume());assert.equal(positive.length,1,'Basilica and verified chapel must be one connected physical structure');solid.delete();solid=positive[0];for(const p of shells)if(p!==solid)p.delete();

// Clean the actual Float32 export before auditing or deriving controls.
// Keep nonadjacent coincident surface fans separate; no global simplifier.
const sourceMesh=solid.getMesh(),cleaned=cleanPrintMesh(sourceMesh.vertProperties,sourceMesh.triVerts);
const result=printIndexedGlb(cleaned.positions,cleaned.indices,attribution,[-v[0],.45,v[1]]);assert(result.glb.length<2*1024*1024);
const exported=readPrintMesh(result.glb),exportAudit=auditPrintMesh(exported.positions,exported.indices);assert(exportAudit.passed);assert.equal(exportAudit.components,1);
const exportedRay=(from,to)=>rawMeshRayCast(exported.positions,exported.indices,from,to);
await writeFile(new URL('print.glb',dir),result.glb);
const controls={contacts:[],surfaceControls:[],facadeControls:[],airControls:towerAir,sourceComparisons:[],expectedReplacements:{mode:'footprint',featureIds:['osm-way-51260215','osm-way-217516630']}};
for(const[a,b]of[[0,6],[-11,20],[11,40],[0,62],[-14,52],[0,82]]){const q=en(a,b),hits=exportedRay(world(q,g-1),world(q,60));if(hits.length)controls.contacts.push({name:`footing-${a}-${b}`,location:geo(q),elevation:g});}
const sourceChecks=[...s.sourceSamples.filter(p=>p.name.startsWith('section-')&&Math.abs(ab([p.east,p.north])[0])<=17),...s.extraSamples.filter(p=>[1,3,14,26,40,61].includes(p.b)&&[0,-6,6,-10,10].includes(p.a))];
for(const p of sourceChecks){const q=[p.east,p.north],hits=exportedRay(world(q,70),world(q,g-1)).sort((a,b)=>b.position[1]-a.position[1]);if(!hits.length)continue;const elevation=hits[0].position[1]+g;controls.surfaceControls.push({name:p.name,location:geo(q),expectedElevation:elevation,toleranceMetres:.015});controls.sourceComparisons.push({name:p.name,location:geo(q),meshElevation:elevation,sourceElevation:p.elevation,differenceMetres:elevation-p.elevation,source:'ICGC DSM1m2021–2023; local cell may include fittings or parapet'});}
const frontCornice=en(0,.2),frontHits=exportedRay(world(frontCornice,60),world(frontCornice,g-1)).sort((a,b)=>b.position[1]-a.position[1]);assert(frontHits.length);const frontHeight=frontHits[0].position[1]+g;assert(Math.abs(frontHeight-f.centralTop)<.02);controls.surfaceControls.push({name:'frontal-cornice-interior',location:geo(frontCornice),expectedElevation:frontHeight,toleranceMetres:.015});controls.sourceComparisons.push({name:'frontal-cornice-interior',location:geo(frontCornice),sourceLocation:geo(en(0,0)),meshElevation:frontHeight,sourceElevation:34.628,differenceMetres:frontHeight-34.628,source:'ICGC DSM1m front cell; control moved0.2m inward to avoid a facade-edge ray'});
for(const t of s.towers){const p=s.parts.find(p=>p.handle===t.handle),r=outline(p),q=r[0].map((x,i)=>x*.88+t.centre[i]*.12),hits=exportedRay(world(q,70),world(q,45)).sort((a,b)=>b.position[1]-a.position[1]);if(hits.length)controls.surfaceControls.push({name:t.name+'-parapet',location:geo(q),expectedElevation:hits[0].position[1]+g,toleranceMetres:.015});}
controls.airControls.push({name:'outside-front-court',location:geo(en(0,-6)),minElevation:5.5,maxElevation:45});
for(const p of controls.airControls){const q=[(p.location[0]-s.anchor[0])*k,(p.location[1]-s.anchor[1])*111320];assert.equal(exportedRay(world(q,p.minElevation),world(q,p.maxElevation)).length,0,p.name+' must remain open');}
const sourceGuardResults=[];
for(const p of s.sourceGuards){if(p.role==='measured-terrace-plane')assert(Math.abs(p.dsmElevation-p.cadElevation)<.25,'DSM corroborates the lateral CAD tier');const q=[(p.location[0]-s.anchor[0])*k,(p.location[1]-s.anchor[1])*111320],hits=exportedRay(world(q,60),world(q,g-1)).sort((a,b)=>b.position[1]-a.position[1]);assert(hits.length,p.name+' has a source roof');const elevation=hits[0].position[1]+g,difference=elevation-p.cadElevation;assert(Math.abs(difference)<=p.toleranceMetres,p.name+' must preserve the31.826m CAD terrace plane');sourceGuardResults.push({...p,meshElevation:elevation,differenceMetres:difference,passed:true});}
controls.sourceGuards=sourceGuardResults;
const depthChecks=[];
for(const[i,r]of openingRecords.entries()){
 const at=t=>[r.centre[0]+r.inward[0]*t,r.centre[1]+r.inward[1]*t],from=at(r.t-2),to=at(r.t+3),hits=exportedRay(world(from,r.h),world(to,r.h)).sort((a,b)=>Math.hypot(a.position[0]-from[0],-a.position[2]-from[1])-Math.hypot(b.position[0]-from[0],-b.position[2]-from[1]));if(!hits.length)continue;const hit=hits[0].position,depth=(hit[0]-r.centre[0])*r.inward[0]+(-hit[2]-r.centre[1])*r.inward[1]-r.t;assert(depth>r.depth-.08,r.name+' must be a real external recess');depthChecks.push({name:r.name,expected:r.depth,actual:depth});if(i<3||i%5===0)controls.facadeControls.push({name:r.name,from:geo(from),to:geo(to),elevation:r.h,expectedLocation:geo([hit[0],-hit[2]]),depthMetres:depth});
}
const m={vertProperties:exported.positions,triVerts:exported.indices},components=exportAudit.components;
const rings=physical.toPolygons(),polys=rings.filter(r=>signed(r)>0).map(r=>[r]);for(const hole of rings.filter(r=>signed(r)<0)){const p=polys.find(p=>inside(hole[0],p[0]));assert(p);p.push(hole);}physical.delete();
const distance=(p,a,b)=>{const d=b.map((x,i)=>x-a[i]),t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/(d[0]**2+d[1]**2)));return Math.hypot(p[0]-a[0]-d[0]*t,p[1]-a[1]-d[1]*t);};let outside=0;for(let i=0;i<m.vertProperties.length;i+=3){const p=[m.vertProperties[i],-m.vertProperties[i+2]];if(!within(p,polys))outside=Math.max(outside,Math.min(...polys.flat().flatMap(r=>r.map((a,i)=>distance(p,a,r[(i+1)%r.length])))));}assert(outside<.002,'Footprint must cover the real projection');
const coordinates=polys.map(p=>p.map(r=>{const q=r.map(geo);q.push(q[0]);return q;})),all=coordinates.flat(2),bbox=[Math.min(...all.map(q=>q[0])),Math.min(...all.map(q=>q[1])),Math.max(...all.map(q=>q[0])),Math.max(...all.map(q=>q[1]))];
const feature={type:'Feature',id,bbox,geometry:{type:'MultiPolygon',coordinates},properties:{name:s.name,place:'Barcelona, Spain',country:'Spain',city:'Barcelona',aliases:['Santa Maria del Mar','Santa María del Mar','Catedral del Mar','Basilica of Santa Maria del Mar'],geometryType:'building',revision:'r1',anchor:s.anchor,anchorElevation:g,height:+result.max[1].toFixed(3),mesh:path+'print.glb',thumbnail:path+'thumbnail.webp',byteLength:result.glb.length,license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',attribution,sources:s.sources,replacement:controls.expectedReplacements}};
const audit={id,...exportAudit,errors:[],closed:true,byteLength:result.glb.length,sha256:createHash('sha256').update(result.glb).digest('hex'),dimensions:result.max.map((x,i)=>x-result.min[i]),anchor:s.anchor,anchorElevation:g,maximumProjectionOutsideFootprintMetres:outside,sourceGuardResults,openingDepthChecks:depthChecks,omittedOpenings:omitted,filledInternalCavitiesCubicMetres:filled,cleanup:cleaned.cleanup};
await writeFile(new URL('audit.json',dir),JSON.stringify(audit,null,2)+'\n');await writeFile(new URL('controls.json',dir),JSON.stringify(controls,null,2)+'\n');if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(feature,null,2)+'\n');console.log({bytes:result.glb.length,vertices:result.vertices,triangles:result.triangles,components,depthChecks:depthChecks.length,omitted,contacts:controls.contacts.length,roof:controls.surfaceControls.length,air:controls.airControls.length,facade:controls.facadeControls.length});
