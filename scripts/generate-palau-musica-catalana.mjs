import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {openSolids,printGlb} from './monument-solids.mjs';

const id='palau-musica-catalana',path=`models/${id}/r1/`,directory=new URL(`../${path}`,import.meta.url);
const survey=JSON.parse(await readFile(new URL('survey.json',directory),'utf8'));
const {Manifold,CrossSection,mesh,prism,turned}=await openSolids(),p=survey.parameters,ground=survey.referenceGround;
const attribution='Open Place Models contributors · Ajuntament de Barcelona · ICGC · OpenStreetMap contributors';
const c=p.corner,u=p.across,v=p.depth,camera=[1,.55,.20],pieces=[],cuts=[],planSections=[];
const point=(e,n,h)=>[e,h-ground,-n];
const en=(a,b)=>[c[0]+u[0]*a+v[0]*b,c[1]+u[1]*a+v[1]*b];
const geo=([e,n])=>[survey.anchor[0]+e/(111320*Math.cos(survey.anchor[1]*Math.PI/180)),survey.anchor[1]+n/111320];
const angle=Math.atan2(u[1],u[0])*180/Math.PI;
const frame=side=>side?{along:v,normal:u.map(x=>-x),angle:angle+90}:{along:u,normal:v,angle};
const at=(a,t,h,f)=>point(c[0]+f.along[0]*a+f.normal[0]*t,c[1]+f.along[1]*a+f.normal[1]*t,h);
function building(polygons,bottom,top,record=true){
 const section=CrossSection.ofPolygons(polygons.flat(),'EvenOdd').simplify(p.planTolerance);
 if(record)planSections.push(section);
 const solid=section.extrude(top-bottom).translate([0,0,bottom-ground]).rotate(-90,0,0);
 if(!record)section.delete();return solid;
}
function panel(profile,front,back,f){return prism(profile.map(([a,h])=>[a,h-ground]),front,back).scale([1,1,-1]).rotate(0,f.angle,0).translate([c[0],0,-c[1]]);}
function arch(a,width,bottom,spring,top){const r=width/2;return[[a-r,bottom],[a+r,bottom],...Array.from({length:17},(_,i)=>[a+r*Math.cos(Math.PI*i/16),spring+(top-spring)*Math.sin(Math.PI*i/16)])];}
function beam(a,b,r,count=8){
 const d=b.map((x,i)=>x-a[i]),length=Math.hypot(...d),n=d.map(x=>x/length);
 let axis=[-n[1],n[0],0];if(Math.hypot(...axis)<1e-6)axis=[1,0,0];const size=Math.hypot(...axis);axis=axis.map(x=>x/size);
 const w=[n[1]*axis[2]-n[2]*axis[1],n[2]*axis[0]-n[0]*axis[2],n[0]*axis[1]-n[1]*axis[0]];
 const vertices=[a,b].flatMap(centre=>Array.from({length:count},(_,i)=>centre.map((x,j)=>x+r*(axis[j]*Math.cos(2*Math.PI*i/count)+w[j]*Math.sin(2*Math.PI*i/count)))).flat());
 const faces=[];for(let i=1;i<count-1;i++)faces.push(0,i+1,i,count,count+i,count+i+1);
 for(let i=0;i<count;i++){const j=(i+1)%count;faces.push(i,j,j+count,i,j+count,i+count);}return mesh(vertices,faces);
}

// Retain the measured roof tiers. Only the two flat cartographic crown caps
// are replaced by profiles constrained by the built elevation and LiDAR.
for(const part of survey.parts){
 let top=part.roof;
 if(part.handle==='17ABEE')top=p.tower.bodyTop;
 if(part.handle==='17B0D7')top=p.frontCrest.spring;
 pieces.push(building(part.polygons,ground,top));
}
const frontFrame=frame(false),sideFrame=frame(true),crest=p.frontCrest;
const ca=(crest.centre[0]-c[0])*u[0]+(crest.centre[1]-c[1])*u[1],ct=(crest.centre[0]-c[0])*v[0]+(crest.centre[1]-c[1])*v[1];
const crestProfile=[[-crest.width/2+ca,crest.spring],[crest.width/2+ca,crest.spring],...Array.from({length:25},(_,i)=>[ca+crest.width/2*Math.cos(Math.PI*i/24),crest.spring+(crest.top-crest.spring)*Math.sin(Math.PI*i/24)])];
const crown=panel(crestProfile,ct-crest.halfDepth,ct+crest.halfDepth,frontFrame);
const sourceCrest=survey.parts.find(part=>part.handle==='17B0D7');
const crestMask=building(sourceCrest.polygons,ground,crest.top+.2,false);
pieces.push(crown.intersect(crestMask));crown.delete();crestMask.delete();

// The corner crown is a separate open cage, not a solid cone. The fine metal
// ribs are thickened to a synthetic printable silhouette at this resolution.
const tower=p.tower;
planSections.push(CrossSection.ofPolygons([Array.from({length:32},(_,i)=>[c[0]+1.32*Math.cos(i*Math.PI/16),c[1]+1.32*Math.sin(i*Math.PI/16)])],'EvenOdd'));
pieces.push(turned(c[0],-c[1],[[tower.bodyTop-ground-.3,1.16],[tower.bodyTop-ground+.20,1.21]],16));
for(let i=0;i<tower.segments;i++){
 const theta=2*Math.PI*i/tower.segments,radial=[Math.cos(theta),Math.sin(theta)];
 const profile=[[tower.cageBase,1.08],[36.4,1.12],[37.7,.91],[39.1,.50],[39.75,.12]];
 for(let j=0;j<profile.length-1;j++){
  const atRow=([h,r])=>point(c[0]+radial[0]*r,c[1]+radial[1]*r,h);
  pieces.push(beam(atRow(profile[j]),atRow(profile[j+1]),tower.ribRadius));
 }
}
pieces.push(turned(c[0],-c[1],[[39.45-ground,.32],[tower.cageTop-ground,.08]],12));
const ringOuter=Manifold.cylinder(.18,1.16,1.16,32),ringInner=Manifold.cylinder(.30,.91,.91,32).translate([0,0,-.06]);
for(const h of[36.4,37.8])pieces.push(ringOuter.subtract(ringInner).rotate(-90,0,0).translate(point(...c,h)));
ringOuter.delete();ringInner.delete();

let initial=Manifold.union(pieces);for(const solid of pieces)solid.delete();assert.equal(initial.status(),'NoError');
const openingRecords=[],omitted=[];
function wallDepth(a,h,f){
 const from=at(a,-8,h,f),to=at(a,8,h,f),hits=initial.rayCast(from,to);
 if(!hits.length)return null;
 const nearest=hits.sort((x,y)=>Math.hypot(...x.position.map((q,i)=>q-from[i]))-Math.hypot(...y.position.map((q,i)=>q-from[i])))[0].position;
 return(nearest[0]-c[0])*f.normal[0]+(-nearest[2]-c[1])*f.normal[1];
}
function window(name,a,width,bottom,spring,top,side=false,depth=.72){
 const f=frame(side),h=(bottom+top)/2,t=wallDepth(a,h,f);
 if(t===null){omitted.push(name);return;}
 cuts.push(panel(arch(a,width,bottom,spring,top),t-.12,t+depth,f));
 openingRecords.push({name,a,width,bottom,spring,top,side,faceDepth:t,depth});
}
for(const[aIndex,a]of p.frontBays.entries()){
 window('front-ground-'+aIndex,a,4.15,10.25,13.65,16.15);
 window('front-middle-'+aIndex,a,3.95,17.55,19.4,20.75);
 window('front-upper-'+aIndex,a,4.1,22.0,24.3,26.45);
 window('front-clerestory-'+aIndex,a,4.1,27.65,29.9,31.3);
}
for(const[i,a]of p.sideBays.entries()){
 const central=i>=2&&i<=6;
 window('side-ground-'+i,a,central?4.1:3.4,10.25,13.6,15.9,true);
 window('side-middle-'+i,a,central?4.4:3.25,17.6,central?22.2:19.3,central?23.8:21.0,true);
 window('side-upper-'+i,a,central?4.55:3.25,central?24.65:22.1,central?27.45:25.5,central?29.65:27.0,true);
}
const cutter=Manifold.union(cuts),carved=initial.subtract(cutter);initial.delete();cutter.delete();for(const q of cuts)q.delete();initial=carved;
assert.equal(initial.status(),'NoError');

// Broad balcony slabs preserve the two facade bands without reproducing the
// fragile balusters. Their depth is an explicit simplified interpretation.
const ledges=[];
for(const[side,a0,a1,level]of[[false,-16.6,-.3,17.1],[false,-16.3,-.3,21.5],[true,1.5,55.4,17.1],[true,13.9,40.4,23.8]]){
 const f=frame(side),a=(a0+a1)/2,t=wallDepth(a,level+.35,f);
 // wallDepth uses the carved body; a small test near the level is normally solid.
 if(t===null)continue;
 const solid=panel([[a0,level-.25],[a1,level-.25],[a1,level+.15],[a0,level+.15]],t-.38,t+.40,f);ledges.push(solid);
 const q0=en(0,0);const outline=[[a0,t-.38],[a1,t-.38],[a1,t+.40],[a0,t+.40]].map(([s,d])=>[q0[0]+f.along[0]*s+f.normal[0]*d,q0[1]+f.along[1]*s+f.normal[1]*d]);planSections.push(CrossSection.ofPolygons([outline],'EvenOdd'));
}
const detailed=Manifold.union([initial,...ledges]);initial.delete();for(const q of ledges)q.delete();
const reduced=detailed.simplify(p.meshTolerance);detailed.delete();assert.equal(reduced.status(),'NoError');
const components=reduced.decompose(),positive=components.filter(q=>q.volume()>1e-6),solid=Manifold.union(positive);
assert(positive.length<=3,'Only the measured complex components may remain');
const result=printGlb(solid,attribution,camera);assert(result.glb.length<4*1024*1024);
await writeFile(new URL('print.glb',directory),result.glb);

// The geographic mask follows measured building parts and projecting ledges.
// A separate registration step may add verified street-facing RTT fragments.
let footprint=CrossSection.union(planSections);for(const q of planSections)q.delete();
if(survey.replacementEnvelope?.streetFragmentsLocal){
 const fragments=survey.replacementEnvelope.streetFragmentsLocal.map(q=>CrossSection.ofPolygons(q,'EvenOdd'));
 const retained=CrossSection.union(fragments),combined=CrossSection.union([footprint,...fragments]);
 assert(retained.subtract(combined).area()<1e-6,'The mask must retain every street registration fragment');
 assert(Math.abs(combined.area()-survey.replacementEnvelope.expectedAreaSquareMetres)<1e-5,'Do not expand beyond the registered street mask');
 retained.delete();footprint.delete();footprint=combined;for(const q of fragments)q.delete();
}
const rings=footprint.toPolygons(),signed=r=>r.reduce((n,q,i)=>{const b=r[(i+1)%r.length];return n+q[0]*b[1]-b[0]*q[1];},0)/2;
const polygons=rings.filter(r=>signed(r)>0).map(r=>[r]);
const inside=([x,y],r)=>r.reduce((a,[b,c],i)=>{const[e,f]=r[(i+1)%r.length];return(c>y)!=(f>y)&&x<(e-b)*(y-c)/(f-c)+b?!a:a;},false);
for(const hole of rings.filter(r=>signed(r)<0)){const parent=polygons.find(([outer])=>inside(hole[0],outer));assert(parent);parent.push(hole);}
const coordinates=polygons.map(poly=>poly.map(r=>{const out=r.map(geo);out.push(out[0]);return out;})),all=coordinates.flat(2);
const feature={type:'Feature',id,bbox:[Math.min(...all.map(q=>q[0])),Math.min(...all.map(q=>q[1])),Math.max(...all.map(q=>q[0])),Math.max(...all.map(q=>q[1]))],geometry:{type:'MultiPolygon',coordinates},properties:{name:'Palau de la Música Catalana',place:'Barcelona, Spain',city:'Barcelona',country:'Spain',aliases:['Palau de la Musica Catalana','Palace of Catalan Music'],geometryType:'building',revision:'r1',anchor:survey.anchor,anchorElevation:ground,height:+(result.max[1]-result.min[1]).toFixed(3),mesh:path+'print.glb',thumbnail:path+'thumbnail.webp',byteLength:result.glb.length,license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',attribution,sources:survey.sources,replacement:{featureIds:['osm-way-671830491','osm-way-671830503','osm-way-671830480']}}};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(feature,null,2)+'\n');
await writeFile(new URL('facade-controls.json',directory),JSON.stringify({openings:openingRecords,omitted},null,2)+'\n');
console.log({bytes:result.glb.length,vertices:result.vertices,triangles:result.triangles,components:positive.length,volume:solid.volume(),bounds:[result.min,result.max],openings:openingRecords.length,omitted});
