import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openSolids,printIndexedGlb} from './monument-solids.mjs';
import {cleanPrintMesh,readPrintMesh,auditPrintMesh,rawMeshRayCast} from './clean-print-mesh.mjs';

const id='castell-de-montjuic',path=`models/${id}/r1/`,dir=new URL(`../${path}`,import.meta.url),s=JSON.parse(await readFile(new URL('survey.json',dir),'utf8'));
const {Manifold,CrossSection,mesh,prism,turned}=await openSolids();let g=s.constructionDatum;
const k=111320*Math.cos(s.anchor[1]*Math.PI/180),pieces=[],plans=[],cuts=[],openings=[],wallControls=[],carriers=new Map(),supportProofs=[];
const geo=q=>[s.anchor[0]+q[0]/k,s.anchor[1]+q[1]/111320],local=q=>[(q[0]-s.anchor[0])*k,(q[1]-s.anchor[1])*111320],world=(q,h)=>[q[0],h-g,-q[1]],centre=r=>r.slice(0,-1).reduce((a,q)=>a.map((x,i)=>x+q[i]/(r.length-1)),[0,0]);
const signed=r=>r.reduce((a,p,i)=>{const q=r[(i+1)%r.length];return a+p[0]*q[1]-q[0]*p[1]},0)/2;
const inside=([x,y],r)=>r.reduce((v,[a,b],i)=>{const[c,d]=r[(i+1)%r.length];return(b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a?!v:v},false);
const within=(q,ps)=>ps.some(p=>inside(q,p[0])&&!p.slice(1).some(r=>inside(q,r)));
const attr='Open Place Models contributors; Ajuntament de Barcelona; ICGC; OpenStreetMap contributors; OpenMapTiles; OpenFreeMap';
function building(ps,bottom,top,record=true){assert(top>bottom);const cs=CrossSection.ofPolygons(ps.flat(),'EvenOdd').simplify(.025),solid=cs.extrude(top-bottom).translate([0,0,bottom-g]).rotate(-90,0,0);if(record)plans.push(cs);else cs.delete();return solid;}
function panel(profile,at,along,t0,t1){return prism(profile.map(([a,h])=>[a,h-g]),t0,t1).scale([1,1,-1]).rotate(0,Math.atan2(along[1],along[0])*180/Math.PI,0).translate([at[0],0,-at[1]]);}
function panelPlan(at,along,a0,a1,t0,t1){const n=[-along[1],along[0]],p=(a,t)=>at.map((x,i)=>x+along[i]*a+n[i]*t);plans.push(CrossSection.ofPolygons([[p(a0,t0),p(a1,t0),p(a1,t1),p(a0,t1)]],'EvenOdd'));}
function arch(a,width,bottom,spring,top,n=10){const r=width/2;return[[a-r,bottom],[a+r,bottom],...Array.from({length:n+1},(_,i)=>{const angle=i*Math.PI/n;return[a+r*Math.cos(angle),spring+(top-spring)*Math.sin(angle)]})];}
function orientedMesh(vertices,faces){let V=0;for(let i=0;i<faces.length;i+=3){const a=vertices.slice(faces[i]*3,faces[i]*3+3),b=vertices.slice(faces[i+1]*3,faces[i+1]*3+3),c=vertices.slice(faces[i+2]*3,faces[i+2]*3+3);V+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}if(V<0)for(let i=0;i<faces.length;i+=3)[faces[i+1],faces[i+2]]=[faces[i+2],faces[i+1]];const solid=mesh(vertices,faces);assert.equal(solid.status(),'NoError');assert(solid.volume()>0);return solid;}

// CAD roofed masonry retains measured caps and bases, including the two
// actual open central voids. Four small holes are occupied by taller sentries.
const main=s.parts.find(p=>p.handle==='17AEBF'),tower=s.parts.find(p=>p.handle==='17BA9B'),towerCap=s.parts.find(p=>p.handle==='17F3C0');
for(const p of s.parts){
 if(s.turretHandles.includes(p.handle)||s.towerHandles.includes(p.handle))continue;
 const body=building(p.polygons,p.baseASL,p.roofASL);pieces.push(body);carriers.set(p.handle,body);
}
for(const h of s.turretHandles){const p=s.parts.find(p=>p.handle===h),q=centre(p.polygons[0][0]),radius=Math.sqrt(p.areaM2/Math.PI);pieces.push(building(p.polygons,180,194.30),turned(q[0],-q[1],[[193.8-g,radius],[194.3-g,radius*1.08],[194.952-g,.10]],12));plans.push(CrossSection.circle(radius*1.08,12).rotate(15).translate(q));}
pieces.push(building([[tower.polygons[0][0]]],tower.baseASL,201.65));
const towerOuter=CrossSection.ofPolygons([tower.polygons[0][0]],'EvenOdd'),towerInner=towerOuter.offset(-.7,'Miter',2),rim=towerOuter.subtract(towerInner);pieces.push(rim.extrude(202.376-201.6).translate([0,0,201.6-g]).rotate(-90,0,0));plans.push(towerOuter);towerInner.delete();rim.delete();
pieces.push(building(towerCap.polygons,201.0,204.805));
// A restrained crenellated parapet. The measured rim top is unchanged.
const towerRing=tower.polygons[0][0],towerWindows=[];
for(let i=0;i<towerRing.length-1;i++){const a=towerRing[i],b=towerRing[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<3)continue;const along=b.map((x,j)=>(x-a[j])/L),at=a.map((x,j)=>(x+b[j])/2);for(const f of[-.25,0,.25])cuts.push(panel([[-.38,201.92],[.38,201.92],[.38,202.6],[-.38,202.6]],at.map((x,j)=>x+along[j]*L*f),along,-1,1));towerWindows.push({name:'watchtower-window-'+i,at,along,width:1.2,bottom:195.6,spring:198.3,top:199.0,depth:.65});}

// Final scarp plans come from verified RTT masonry footprints. The initial
// manually traced garden/path boundary was rejected and is not generated.
for(const w of s.rttWalls){
 assert(Number.isFinite(w.relativeHeight)&&w.relativeHeight>0,'A verified wall needs a positive source height; no generic fallback');
 if(w.cantilever)continue;
 const section=CrossSection.ofPolygons(w.polygons.flat(),'EvenOdd').simplify(.015),unit=section.extrude(1),m=unit.getMesh(),vertices=[];
 const grounds=w.footingStations??w.samples.filter(p=>p.layer==='ground').map(p=>({...p,groundASL:p.elevationASL})),level=q=>{const near=grounds.map(p=>({p,d:Math.hypot(...p.point.map((x,i)=>x-q[i]))})).sort((a,b)=>a.d-b.d).slice(0,4),ground=Math.min(...near.map(v=>v.p.groundASL));return{base:Math.min(ground-.8,w.capASL-.35),top:w.capASL};};
 for(let i=0;i<m.vertProperties.length;i+=3){const q=[m.vertProperties[i],m.vertProperties[i+1]],h=level(q);vertices.push(...world(q,m.vertProperties[i+2]>.5?h.top:h.base));}
 const body=orientedMesh(vertices,Array.from(m.triVerts));pieces.push(body);carriers.set(w.id,body);plans.push(section);unit.delete();
 // Sample a nondegenerate cap triangle for the later raw integration check.
 for(let i=0;i<m.triVerts.length;i+=3){const ids=Array.from(m.triVerts.slice(i,i+3));if(!ids.every(j=>m.vertProperties[j*3+2]>.5))continue;const q=[0,1].map(a=>ids.reduce((n,j)=>n+m.vertProperties[j*3+a]/3,0)),levels=ids.map(j=>level([m.vertProperties[j*3],m.vertProperties[j*3+1]]));wallControls.push({name:w.id,point:q,top:levels.reduce((a,h)=>a+h.top/3,0),base:levels.reduce((a,h)=>a+h.base/3,0),relativeHeight:w.relativeHeight,capMethod:w.capMethod});break;}
}

// Only these two verified narrow vector masonry bands complete the missing
// sea-side support. The whole aggregate ID is never a replacement identity.
// Twenty-metre slices retain the changing measured crown/footing profile;
// they cannot turn the lower southwest wall into one185m horizontal mass.
for(const w of s.supportWalls){
 const section=CrossSection.ofPolygons(w.polygons.flat(),'EvenOdd'),points=w.polygons.flat(2),lo=[0,1].map(i=>Math.min(...points.map(p=>p[i]))),hi=[0,1].map(i=>Math.max(...points.map(p=>p[i]))),segments=[],candidates=[];
 const level=q=>{const near=w.stations.map(p=>({p,d:Math.hypot(...p.point.map((x,i)=>x-q[i]))})).sort((a,b)=>a.d-b.d).slice(0,3),weight=near.map(p=>1/Math.max(.1,p.d)**2),sum=weight.reduce((a,b)=>a+b,0);return{top:near.reduce((a,v,i)=>a+v.p.capASL*weight[i]/sum,0),base:Math.min(...near.map(v=>v.p.footing.groundASL))-.8};};
 for(let x=lo[0];x<hi[0];x+=20){const clip=CrossSection.ofPolygons([[[x,lo[1]-1],[Math.min(x+20,hi[0]),lo[1]-1],[Math.min(x+20,hi[0]),hi[1]+1],[x,hi[1]+1]]],'EvenOdd'),part=section.intersect(clip);clip.delete();if(part.area()<.0001){part.delete();continue;}const unit=part.extrude(1),m=unit.getMesh(),vertices=[];for(let i=0;i<m.vertProperties.length;i+=3){const q=[m.vertProperties[i],m.vertProperties[i+1]],h=level(q);vertices.push(...world(q,m.vertProperties[i+2]>.5?h.top:h.base));}segments.push(orientedMesh(vertices,Array.from(m.triVerts)));for(let i=0;i<m.triVerts.length;i+=3){const ids=Array.from(m.triVerts.slice(i,i+3));if(!ids.every(j=>m.vertProperties[j*3+2]>.5))continue;const q=[0,1].map(a=>ids.reduce((n,j)=>n+m.vertProperties[j*3+a]/3,0)),h=ids.map(j=>level([m.vertProperties[j*3],m.vertProperties[j*3+1]]));candidates.push({point:q,top:h.reduce((n,v)=>n+v.top/3,0),base:h.reduce((n,v)=>n+v.base/3,0)});}unit.delete();part.delete();}
 const body=Manifold.union(segments);for(const p of segments)p.delete();pieces.push(body);carriers.set(w.id,body);plans.push(section);
 const c=candidates[Math.floor(candidates.length/2)];assert(c);wallControls.push({name:w.id,...c,capMethod:w.heightMethod});
}

// All nine circular projections belong at the crown, with a tapered corbel.
// The short inward connection is an explicitly documented approximation;
// no circular column is extended to the moat to satisfy a contact test.
for(const w of s.rttWalls.filter(w=>w.cantilever)){
 const C=w.cantilever,c=C.centre,ring=w.polygons[0][0].slice(0,-1),N=ring.length,vertices=[],faces=[],levels=[[w.capASL-C.corbelDepth,C.neckScale],[w.capASL-C.fullRadiusDepth,1],[w.capASL,1]];
 for(const[h,scale]of levels)for(const p of ring)vertices.push(...world(c.map((x,i)=>x+(p[i]-x)*scale),h));
 for(let j=0;j<2;j++)for(let i=0;i<N;i++){const a=j*N+i,b=j*N+(i+1)%N;faces.push(a,b,b+N,a,b+N,a+N);}const low=vertices.length/3;vertices.push(...world(c,levels[0][0]));const high=vertices.length/3;vertices.push(...world(c,w.capASL));for(let i=0;i<N;i++)faces.push(low,(i+1)%N,i,high,2*N+i,2*N+(i+1)%N);
 const projection=orientedMesh(vertices,faces),target=C.carrierInteriorPoint??C.carrierBoundaryPoint,v=target.map((x,i)=>x-c[i]),d=Math.hypot(...v),along=v.map(x=>x/d),L=d+(C.carrierInteriorPoint?0:C.connectionInset),endpoint=c.map((x,i)=>x+along[i]*L),connector=panel([[0,w.capASL-C.connectionBottomDepth],[L,w.capASL-C.connectionBottomDepth],[L,w.capASL-C.connectionTopDepth],[0,w.capASL-C.connectionTopDepth]],c,along,-C.connectionWidth/2,C.connectionWidth/2),body=Manifold.union([projection,connector]),carrier=carriers.get(C.carrier);assert(carrier,'Missing physical carrier '+C.carrier);const common=body.intersect(carrier),overlap=common.volume();assert(overlap>.025,'Cantilever must overlap its real carrier by positive volume: '+w.id+' '+overlap);common.delete();projection.delete();connector.delete();pieces.push(body);plans.push(CrossSection.ofPolygons(w.polygons.flat(),'EvenOdd'));panelPlan(c,along,0,L,-C.connectionWidth/2,C.connectionWidth/2);supportProofs.push({id:w.id,carrier:C.carrier,centre:c,endpoint,capASL:w.capASL,connectionElevation:w.capASL-.6,overlapVolumeCubicMetres:overlap,method:C.method});
}

// The authoritative RTT deck fixes the axis and its tapered plan. A linear
// plane fitted to exposed DSM cells fixes its real longitudinal slope.
const B=s.bridge,D=B.drawbridgeLength,bridgeAt=B.inner,deck=t=>B.deckElevation+B.deckSlope*t,station=q=>q.reduce((a,x,i)=>a+(x-B.inner[i])*B.along[i],0),deckAt=q=>deck(station(q)),bridgeCuts=[],bridgeRing=B.sourcePolygons[0],bv=[],bf=[],bn=bridgeRing.length;
for(const h of['bottom','top'])for(const q of bridgeRing)bv.push(...world(q,h==='bottom'?B.footingElevation:deckAt(q)));
for(let i=1;i<bn-1;i++)bf.push(0,i+1,i,bn,bn+i,bn+i+1);for(let i=0;i<bn;i++){const j=(i+1)%bn;bf.push(i,j,bn+j,i,bn+j,bn+i);}
const bridgeSolid=orientedMesh(bv,bf);plans.push(CrossSection.ofPolygons(B.sourcePolygons,'EvenOdd'));
const first=Math.min(...bridgeRing.map(station))-1;bridgeCuts.push(panel([[first,B.footingElevation-1],[D,B.footingElevation-1],[D,deck(D)-.7],[first,deck(first)-.7]],bridgeAt,B.along,-B.width,B.width));
for(let i=0;i<B.arches;i++){const step=(B.length-D)/B.arches,profile=arch(D+step*(i+.5),step-1.0,B.footingElevation-1,B.archSpring,B.archCrown).map(([a,h],j)=>[a,j<2?h:h+B.deckSlope*a]);bridgeCuts.push(panel(profile,bridgeAt,B.along,-B.width,B.width));}
const bridgeCutter=Manifold.union(bridgeCuts),openBridge=bridgeSolid.subtract(bridgeCutter);pieces.push(openBridge);bridgeSolid.delete();bridgeCutter.delete();for(const p of bridgeCuts)p.delete();
for(const[i,j]of[[0,3],[1,2]]){const a=bridgeRing[i],b=bridgeRing[j],L=Math.hypot(...b.map((x,k)=>x-a[k])),u=b.map((x,k)=>(x-a[k])/L),normal=[-u[1],u[0]],mid=a.map((x,k)=>(x+b[k])/2),sign=within(mid.map((x,k)=>x+normal[k]*.2),[B.sourcePolygons])?1:-1,at=a.map((x,k)=>x+normal[k]*sign*.18),end=at.map((x,k)=>x+u[k]*L),h0=deckAt(at),h1=deckAt(end);pieces.push(panel([[0,h0-.12],[L,h1-.12],[L,h1+.65],[0,h0+.65]],at,u,-.18,.18));panelPlan(at,u,0,L,-.18,.18);}
const G=s.gate,portal=panel([[-4.8,G.bottom],[4.8,G.bottom],[4.8,186.6],[0,G.portalTop],[-4.8,186.6]],G.centre,G.along,-.9,.75);pieces.push(portal);panelPlan(G.centre,G.along,-4.8,4.8,-.9,.75);cuts.push(panel(arch(0,G.width,G.bottom,G.spring,G.top,12),G.centre,G.along,-5,G.depth));
for(const side of[-1,1]){const q=G.centre.map((x,i)=>x+G.along[i]*side*3.5-G.inward[i]);pieces.push(turned(q[0],-q[1],[[G.bottom-g,.55],[G.bottom+.6-g,.55],[G.bottom+.8-g,.38],[185.7-g,.34],[186.0-g,.55],[186.6-g,.55]],12));plans.push(CrossSection.circle(.55,12).rotate(15).translate(q));}
pieces.push(panel([[-4.9,186.4],[4.9,186.4],[4.9,186.8],[-4.9,186.8]],G.centre,G.along,-1.55,.8));panelPlan(G.centre,G.along,-4.9,4.9,-1.55,.8);

let solid=Manifold.union(pieces);for(const p of pieces)p.delete();assert.equal(solid.status(),'NoError');
// Exterior and courtyard arches are real shallow volume recesses, not a
// texture. Their spacing/depth is a calibrated visual simplification.
const outer=main.polygons[0][0],court=main.polygons[0].slice(1).sort((a,b)=>Math.abs(signed(b))-Math.abs(signed(a)))[0];
function recess(o){const n=[-o.along[1],o.along[0]],h=(o.bottom+o.top)/2,at=t=>o.at.map((x,i)=>x+n[i]*t),from=at(-4),to=at(5),hits=solid.rayCast(world(from,h),world(to,h));if(!hits.length)return;const hit=hits[0].position,t=(hit[0]-o.at[0])*n[0]+(-hit[2]-o.at[1])*n[1];cuts.push(panel(arch(0,o.width,o.bottom,o.spring,o.top,7),o.at,o.along,t-.18,t+o.depth));openings.push({...o,n,h,t});}
for(const [role,r]of[['outer',outer],['court',court]])for(let i=0;i<r.length-1;i++){
 const a=r[i],b=r[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<18)continue;const count=Math.max(1,Math.floor(L/(role==='court'?7:8.5))),u=b.map((x,j)=>(x-a[j])/L),mid=a.map((x,j)=>(x+b[j])/2);let along=u;
 // Choose the face direction with its normal pointing into the roofed range.
 const left=[-u[1],u[0]],probe=mid.map((x,j)=>x+left[j]*.5);if(!within(probe,main.polygons))along=u.map(x=>-x);
 for(let j=0;j<count;j++){const at=a.map((x,k)=>x+u[k]*L*(j+.5)/count);recess({name:role+'-arch-'+i+'-'+j,at,along,width:role==='court'?2.8:1.4,bottom:role==='court'?184.05:185.8,spring:role==='court'?187.5:187.4,top:role==='court'?189.1:188.3,depth:role==='court'?2.0:.55});}
}
for(const o of towerWindows)recess(o);
const cutter=Manifold.union(cuts),carved=solid.subtract(cutter);solid.delete();cutter.delete();for(const p of cuts)p.delete();solid=carved;assert.equal(solid.status(),'NoError');

// No global simplify: it can turn the source's separate horizontal planes
// into sloping fans. Clean and audit each actual closed Float32 component.
const shells=solid.decompose(),positions=[],indices=[],cleanups=[];let offset=0,discardedCavities=0;
for(const shell of shells){if(shell.volume()<=0){discardedCavities+=Math.abs(shell.volume());continue;}const m=shell.getMesh(),cleaned=cleanPrintMesh(m.vertProperties,m.triVerts);cleanups.push(cleaned.cleanup);positions.push(...cleaned.positions);indices.push(...cleaned.indices.map(x=>x+offset));offset+=cleaned.positions.length/3;}
for(const p of shells)p.delete();solid.delete();assert(offset<65536);
const originalDatum=g,lowestY=Math.min(...positions.filter((_,i)=>i%3===1));for(let i=1;i<positions.length;i+=3)positions[i]-=lowestY;g+=lowestY;
const result=printIndexedGlb(Float32Array.from(positions),Uint16Array.from(indices),attr,[.8,.7,-1]),exported=readPrintMesh(result.glb),audit=auditPrintMesh(exported.positions,exported.indices);assert(audit.passed);assert(Math.abs(result.min[1])<=.001,'Placement datum must coincide with lowest real footing');
const ray=(from,to)=>rawMeshRayCast(exported.positions,exported.indices,from,to),controls={contacts:[],surfaceControls:[],facadeControls:[],airControls:[],sourceGuards:[],sourceComparisons:[],expectedReplacements:s.replacement};
const componentParent=Array.from({length:exported.positions.length/3},(_,i)=>i),find=v=>{while(componentParent[v]!==v){componentParent[v]=componentParent[componentParent[v]];v=componentParent[v];}return v;};for(let i=0;i<exported.indices.length;i+=3)for(let j=1;j<3;j++)componentParent[find(exported.indices[i+j])]=find(exported.indices[i]);
controls.supportControls=[];for(const p of supportProofs){const h=p.connectionElevation,pathHits=ray(world(p.centre,h),world(p.endpoint,h));assert.equal(pathHits.length,0,'Corbel centre-to-carrier path must remain inside connected masonry: '+p.id);const carrierHit=ray(world(p.endpoint,210),world(p.endpoint,165))[0];assert(carrierHit);let bodyHit,bodyPoint;for(let i=0;i<16;i++){const q=p.centre.map((x,j)=>x+.45*(j===0?Math.cos(i*Math.PI/8):Math.sin(i*Math.PI/8))),hit=ray(world(q,210),world(q,165))[0];if(hit&&Math.abs(hit.position[1]+g-p.capASL)<.03){bodyHit=hit;bodyPoint=q;break;}}assert(bodyHit,'Keep measured projection cap visible: '+p.id);const component=find(exported.indices[bodyHit.triangle*3]);assert.equal(component,find(exported.indices[carrierHit.triangle*3]),'Projection must share one actual raw mesh component with carrier: '+p.id);controls.supportControls.push({...p,centre:undefined,endpoint:undefined,location:geo(p.centre),carrierLocation:geo(p.endpoint),sourceCapLocation:geo(bodyPoint),sourceCapElevation:p.capASL,component,pathCrossings:0,positiveOverlap:true});controls.surfaceControls.push({name:'cantilever-cap-'+p.id,location:geo(bodyPoint),expectedElevation:p.capASL,toleranceMetres:.03});}
for(const p of [main,...s.parts.filter(p=>['17F504','176FFE','17A461','17F3C0'].includes(p.handle))]){
 let q;const r=p.polygons[0][0],c=centre(r);for(const a of r.slice(0,-1)){const v=a.map((x,i)=>x*.8+c[i]*.2);if(within(v,p.polygons)&&!s.turretHandles.some(h=>within(v,s.parts.find(t=>t.handle===h).polygons))){const hits=ray(world(v,210),world(v,165));if(hits.length&&Math.abs(hits[0].position[1]+g-p.roofASL)<.03){q=v;break;}}}if(!q)continue;const guard=s.sourceGuards.find(t=>t.handle===p.handle),e=ray(world(q,210),world(q,165))[0].position[1]+g;assert(Math.abs(e-p.roofASL)<.02);controls.surfaceControls.push({name:'cad-roof-'+p.handle,location:geo(q),expectedElevation:p.roofASL,toleranceMetres:.025});if(guard)controls.sourceGuards.push({...guard,location:geo(q),meshElevation:e,differenceMetres:e-guard.elevation,passed:true});if(p.handle==='17F3C0'){const floor=ray(world(q,170),world(q,210))[0];assert(floor&&Math.abs(floor.position[1]+g-tower.baseASL)<.02,'Watchtower must stand at its measured182m foundation, not float at the roof');controls.contacts.push({name:'watchtower-ground-footing',location:geo(q),elevation:tower.baseASL,sourceHandle:tower.handle,rawMinimumElevation:floor.position[1]+g});}else controls.contacts.push({name:'cad-footing-'+p.handle,location:geo(q),elevation:p.baseASL});
}
const cq=centre(court);controls.airControls.push({name:'open-main-courtyard',location:geo(cq),minElevation:184.7,maxElevation:190.9});for(const h of main.polygons[0].slice(1).filter(r=>Math.abs(signed(r))>20&&Math.abs(signed(r))<100)){const q=centre(h);controls.airControls.push({name:'open-lightwell',location:geo(q),minElevation:184.7,maxElevation:190.9});}
for(const w of wallControls){const q=w.point,hit=ray(world(q,w.top+4),world(q,w.base-1));if(hit.length){controls.surfaceControls.push({name:'wall-cap-'+w.name,location:geo(q),expectedElevation:hit[0].position[1]+g,toleranceMetres:.03});controls.contacts.push({name:'wall-foot-'+w.name,location:geo(q),elevation:w.base});}}
for(let i=0;i<B.arches;i++){const t=D+(B.length-D)*(i+.5)/B.arches,q=B.inner.map((x,j)=>x+B.along[j]*t);controls.airControls.push({name:'bridge-arch-'+i,location:geo(q),minElevation:170.5,maxElevation:deck(t)-1.35});}
controls.airControls.push({name:'drawbridge-under-deck',location:geo(B.inner.map((x,j)=>x+B.along[j]*D/2)),minElevation:170.5,maxElevation:deck(D/2)-.9});
controls.airControls.push({name:'gateway-opening',location:geo(G.centre),minElevation:176.6,maxElevation:183.2});
for(const[name,t]of[['bridge-deck-centre',B.length/2],['drawbridge-deck',D/2]]){const q=B.inner.map((x,i)=>x+B.along[i]*t),h=deck(t),hit=ray(world(q,180),world(q,169))[0];assert(hit&&Math.abs(hit.position[1]+g-h)<.02,'Bridge deck and inner slab must preserve the independently fitted DSM plane');controls.surfaceControls.push({name,location:geo(q),expectedElevation:h,toleranceMetres:.025});controls.sourceGuards.push({name:name+'-DSM-plane',location:geo(q),elevation:h,meshElevation:hit.position[1]+g,toleranceMetres:.025,differenceMetres:hit.position[1]+g-h,source:'Exposed DSM cells on verified RTT173781 axis, least-squares deck plane; not derived from the GLB',fit:B.deckFit,passed:true});}
for(const o of openings){const a=o.at.map((x,i)=>x+o.n[i]*(o.t-2)),b=o.at.map((x,i)=>x+o.n[i]*(o.t+3)),hits=ray(world(a,o.h),world(b,o.h));if(!hits.length)continue;const p=hits[0].position,depth=(p[0]-o.at[0])*o.n[0]+(-p[2]-o.at[1])*o.n[1]-o.t;if(depth<o.depth-.08)continue;if(controls.facadeControls.length<12||o.name.startsWith('watchtower'))controls.facadeControls.push({name:o.name,from:geo(a),to:geo(b),elevation:o.h,expectedLocation:geo([p[0],-p[2]]),depthMetres:depth});}
const portalAt=G.centre.map((x,i)=>x+G.along[i]*3.5),portalN=G.inward,portalFrom=portalAt.map((x,i)=>x-portalN[i]*3),portalTo=portalAt.map((x,i)=>x+portalN[i]*4),portalHit=ray(world(portalFrom,184.5),world(portalTo,184.5))[0];assert(portalHit);controls.facadeControls.push({name:'neoclassical-portal-pier',from:geo(portalFrom),to:geo(portalTo),elevation:184.5,expectedLocation:geo([portalHit.position[0],-portalHit.position[2]])});
for(const p of controls.airControls){assert.equal(ray(world(local(p.location),p.minElevation),world(local(p.location),p.maxElevation)).length,0,p.name+' must remain open');}
const footprint=CrossSection.union(plans);for(const p of plans)p.delete();const rings=footprint.toPolygons(),polys=rings.filter(r=>signed(r)>0).map(r=>[r]);for(const r of rings.filter(r=>signed(r)<0)){const p=polys.find(p=>inside(r[0],p[0]));assert(p);p.push(r);}footprint.delete();
const distance=(p,a,b)=>{const d=b.map((x,i)=>x-a[i]),t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/(d[0]**2+d[1]**2)));return Math.hypot(p[0]-a[0]-t*d[0],p[1]-a[1]-t*d[1]);};let outside=0,outsidePoint=null;
for(let i=0;i<exported.positions.length;i+=3){const q=[exported.positions[i],-exported.positions[i+2]];if(!within(q,polys)){const d=Math.min(...polys.flat().flatMap(r=>r.map((a,j)=>distance(q,a,r[(j+1)%r.length]))));if(d>outside){outside=d;outsidePoint=q;}}}assert(outside<.002,'Footprint must cover every real masonry projection: '+JSON.stringify({outside,outsidePoint}));
const coordinates=polys.map(p=>p.map(r=>{const ring=r.map(geo);ring.push(ring[0]);return ring})),all=coordinates.flat(2),bbox=[Math.min(...all.map(p=>p[0])),Math.min(...all.map(p=>p[1])),Math.max(...all.map(p=>p[0])),Math.max(...all.map(p=>p[1]))];
const feature={type:'Feature',id,bbox,geometry:{type:'MultiPolygon',coordinates},properties:{name:s.name,place:'Barcelona, Spain',country:'Spain',city:'Barcelona',aliases:['Castell de Montjuic','Castillo de Montjuic','Montjuic Castle'],geometryType:'building',revision:'r1',anchor:s.anchor,anchorElevation:g,height:+result.max[1].toFixed(3),mesh:path+'print.glb',thumbnail:path+'thumbnail.webp',byteLength:result.glb.length,license:'CC-BY-4.0',spatialDataLicense:s.spatialDataLicense??'CC-BY-4.0',attribution:attr,sources:s.sources.map(p=>typeof p==='string'?p:p.url),replacement:s.replacement}};
await writeFile(new URL('print.glb',dir),result.glb);await writeFile(new URL('controls.json',dir),JSON.stringify(controls,null,2)+'\n');await writeFile(new URL('audit.json',dir),JSON.stringify({id,...audit,closed:true,byteLength:result.glb.length,sha256:createHash('sha256').update(result.glb).digest('hex'),anchor:s.anchor,anchorElevation:g,datumNormalization:{originalDatum,minimumLocalYBeforeRebasing:lowestY,absoluteHeightsPreserved:true},maximumProjectionOutsideFootprintMetres:outside,dimensions:result.max.map((x,i)=>x-result.min[i]),closedComponents:cleanups.length,sourceGuards:controls.sourceGuards,cleanup:cleanups,discardedInternalCavitiesCubicMetres:discardedCavities},null,2)+'\n');if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(feature,null,2)+'\n');console.log({bytes:result.glb.length,vertices:result.vertices,triangles:result.triangles,components:audit.components,contacts:controls.contacts.length,roofs:controls.surfaceControls.length,facades:controls.facadeControls.length,air:controls.airControls.length,bbox});
