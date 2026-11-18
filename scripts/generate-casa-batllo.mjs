import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {openSolids,printGlb} from './monument-solids.mjs';

const id='casa-batllo',path=`models/${id}/r1/`,directory=new URL(`../${path}`,import.meta.url);
const survey=JSON.parse(await readFile(new URL('survey.json',directory),'utf8'));
const {Manifold,CrossSection,turned,mesh,prism}=await openSolids();
const p=survey.parameters,ground=survey.referenceGround,pieces=[],cuts=[],late=[];
const attribution='Open Place Models contributors · Ajuntament de Barcelona · ICGC · OpenStreetMap contributors';
const camera=[.85,.30,-1.10],en=(a,b)=>[(a+b)/Math.SQRT2,(-a+b)/Math.SQRT2];
const point=(a,b,y)=>{const[e,n]=en(a,b);return[e,y-ground,-n];};
const section=rings=>CrossSection.ofPolygons(rings,'EvenOdd').simplify(p.planTolerance);
function building(rings,bottom,top){const s=section(rings),m=s.extrude(top-bottom).translate([0,0,bottom-ground]).rotate(-90,0,0);s.delete();return m;}
const ringAB=ring=>ring.map(([a,b])=>en(a,b));
const rectAB=(a0,a1,b0,b1)=>ringAB([[a0,b0],[a1,b0],[a1,b1],[a0,b1]]);
function panel(profile,b0,b1){return prism(profile,-b1,-b0).rotate(0,-45,0);}
const column=(a,b,profile,count=16)=>{const[e,n]=en(a,b);return turned(e,-n,profile.map(([y,r])=>[y-ground,r]),count);};
function oval(a,y,width,height,count=20){return Array.from({length:count},(_,i)=>{const t=2*Math.PI*i/count;return[a+width/2*Math.cos(t),y-ground+height/2*Math.sin(t)];});}
function arch(a,width,bottom,spring,crown,count=14){return[[a-width/2,bottom-ground],[a+width/2,bottom-ground],...Array.from({length:count+1},(_,i)=>{const t=Math.PI*i/count;return[a+width/2*Math.cos(t),spring-ground+(crown-spring)*Math.sin(t)];})];}
function loft(ring,rows,center){
 const count=ring.length,vertices=rows.flatMap(([y,scale,shiftA=0,shiftB=0])=>ring.flatMap(([a,b])=>point(center[0]+(a-center[0])*scale+shiftA,center[1]+(b-center[1])*scale+shiftB,y))),faces=[],last=(rows.length-1)*count;
 for(let i=1;i<count-1;i++)faces.push(0,i+1,i,last,last+i,last+i+1);
 for(let row=0;row<rows.length-1;row++)for(let i=0;i<count;i++){const a=row*count+i,b=row*count+(i+1)%count;faces.push(a,b,b+count,a,b+count,a+count);}
 const m=mesh(vertices,faces);assert.equal(m.status(),'NoError');assert(m.volume()>0);return m;
}
function roofPatch(a0,a1,b0,b1,height,bottom,na=28,nb=18){
 const top=[],faces=[],index=(i,j)=>j*(na+1)+i;
 for(let j=0;j<=nb;j++)for(let i=0;i<=na;i++){const a=a0+(a1-a0)*i/na,b=b0+(b1-b0)*j/nb;top.push(point(a,b,height(a,b)));}
 const count=top.length,vertices=[...top.flat(),...Array.from({length:count},(_,i)=>{const a=i%(na+1),b=Math.floor(i/(na+1));return point(a0+(a1-a0)*a/na,b0+(b1-b0)*b/nb,bottom);}).flat()];
 for(let j=0;j<nb;j++)for(let i=0;i<na;i++){const a=index(i,j),b=index(i+1,j),c=index(i+1,j+1),d=index(i,j+1);faces.push(a,b,c,a,c,d,count+a,count+c,count+b,count+a,count+d,count+c);}
 const border=[...Array.from({length:na+1},(_,i)=>index(i,0)),...Array.from({length:nb},(_,i)=>index(na,i+1)),...Array.from({length:na},(_,i)=>index(na-1-i,nb)),...Array.from({length:nb-1},(_,i)=>index(0,nb-1-i))];
 for(let i=0;i<border.length;i++){const a=border[i],b=border[(i+1)%border.length];faces.push(count+a,count+b,b,count+a,b,a);}
 const m=mesh(vertices,faces);assert.equal(m.status(),'NoError');assert(m.volume()>0);return m;
}
const outer=survey.footprintLocal[0],courts=survey.footprintLocal.slice(1);
pieces.push(building([outer],ground,p.rearPatio));
const own=section([outer,...courts]),frontMask=section([rectAB(-20,20,-8.97,30)]),rearMask=section([rectAB(-20,20,-11.19,-8.95)]);
const tall=own.intersect(frontMask),rear=own.intersect(rearMask);
for(const[s,top]of[[tall,p.mainRoof],[rear,p.rearWallTop]])pieces.push(s.extrude(top-ground).translate([0,0,0]).rotate(-90,0,0));
for(const s of[own,frontMask,rearMask,tall,rear])s.delete();

// Glazing is represented by opaque roof surfaces, not open courtyard shafts.
for(const cover of p.roofCovers)pieces.push(building([courts[cover.ring-1]],ground,cover.top));
const glassRim=section([courts[1]]),glassInset=glassRim.offset(-.18,'Round',2,12),glassFrame=glassRim.subtract(glassInset);
pieces.push(glassFrame.extrude(.28).translate([0,0,p.roofCovers[1].top-ground]).rotate(-90,0,0));
glassFrame.delete();glassInset.delete();glassRim.delete();

const dragon=p.dragon,profile=dragon.profile;
function crest(a){
 let i=profile.findIndex(q=>q[0]>=a);if(i<=0)return profile[Math.max(0,i)][1];
 const[x0,y0]=profile[i-1],[x1,y1]=profile[i],t=(a-x0)/(x1-x0),w=t*t*(3-2*t);return y0+(y1-y0)*w;
}
const [back,ridge,front]=dragon.depth;
function frontCrest(a){
 const rows=dragon.frontProfile;let i=rows.findIndex(q=>q[0]>=a);if(i<=0)return rows[Math.max(0,i)][1];
 const[x0,y0]=rows[i-1],[x1,y1]=rows[i],t=(a-x0)/(x1-x0),w=t*t*(3-2*t);
 return Math.max(p.mainRoof,Math.min(crest(a),y0+(y1-y0)*w));
}
pieces.push(roofPatch(profile[0][0],profile.at(-1)[0],back,front,(a,b)=>{
 if(b>=ridge){const t=(b-ridge)/(front-ridge),w=t*t*(3-2*t);return crest(a)*(1-w)+frontCrest(a)*w;}
 const factor=Math.sqrt(Math.max(0,1-((b-ridge)/(ridge-back))**2));
 return p.mainRoof+(crest(a)-p.mainRoof)*factor;
},p.mainRoof-.25));
// The smaller companion crest follows its municipal plan, with its observed
// surface maximum used instead of inventing a second identical large hump.
const minorPart=survey.parts.find(q=>q.handle==='185F32'),minor=roofPatch(-7.4,-2.75,20.4,24.5,(a,b)=>{
 const t=(a+5.2)/2.3,crest=p.mainRoof+(dragon.minorCrown-p.mainRoof)*Math.sqrt(Math.max(0,1-t*t));
 if(b>=22.5){const v=(b-22.5)/2.0,w=v*v*(3-2*v),edge=p.mainRoof+(dragon.minorFront-p.mainRoof)*Math.sqrt(Math.max(0,1-t*t));return crest*(1-w)+edge*w;}
 return p.mainRoof+(crest-p.mainRoof)*Math.sqrt(Math.max(0,1-((b-22.5)/2.1)**2));
},p.mainRoof-.25,24,12),minorClip=building(minorPart.polygons[0],p.mainRoof-.5,63);
pieces.push(minor.intersect(minorClip));minor.delete();minorClip.delete();

const tower=p.tower;
pieces.push(column(tower.a,tower.b,[[54.6,.84],[56.8,.84],[57.1,1.22],[57.65,1.10],[58.5,.62],[59.6,.25],[60.2,.20]],20));
pieces.push(column(tower.a,tower.b,[[59.9,.22],[60.85,.24],[tower.top-.23,.20]],12));
pieces.push(Manifold.sphere(.23,12).translate(point(tower.a,tower.b,tower.top-.23)));
for(const[da,db]of[[1,0],[-1,0],[0,1],[0,-1]]){
 const tip=point(tower.a+da*.75,tower.b+db*.75,60.55);
 const center=point(tower.a,tower.b,60.55),direction=tip.map((v,i)=>v-center[i]),length=Math.hypot(...direction);
 // Horizontal rays use cardinal world directions for Gaudí's four-arm cross.
 pieces.push(Manifold.cylinder(length,.19,.24,12).rotate(0,90,0).rotate(0,Math.atan2(-direction[2],direction[0])*180/Math.PI,0).translate(center));
 pieces.push(Manifold.sphere(.27,12).scale([1,1.25,1]).translate(tip));
}
for(const group of p.chimneyGroups)for(const[da,db]of[[-.42,-.42],[.42,-.42],[-.42,.42],[.42,.42]]){
 const top=group.top-(da+db>0?.25:0);
 const a=group.a+da,b=group.b+db,ring=Array.from({length:16},(_,i)=>{const t=i*2*Math.PI/16;return[a+Math.cos(t),b+Math.sin(t)];});
 pieces.push(loft(ring,[[54.0,.65],[55.2,.58],[top-2.0,.29,-.10,.12],
  [top-1.35,.34,.08,-.08],[top-1.15,.57],[top-.95,.57],[top-.20,.10]],[a,b]));
 pieces.push(Manifold.sphere(.15,10).translate(point(a,b,top-.15)));
}

// Principal-floor bay: a shallow curved projection, broad openings and bone-like
// columns. The column profiles are a calibrated simplification of the stonework.
const f=p.frontage,bayRing=Array.from({length:25},(_,i)=>{const t=Math.PI*i/24;return[f.bayHalfWidth*Math.cos(t),f.b+f.bayDepth*Math.sin(t)];});
pieces.push(loft(bayRing,[[f.bayBottom,.96],[34.0,1.0],[38.45,1.0],[f.bayTop,.95]],[0,f.b]));
for(const a of[-3.25,-1.1,1.1,3.25])cuts.push(panel(oval(a,36.35,1.75,4.30),23.70,27.0));
for(const a of[-4.1,-2.15,0,2.15,4.1]){
 const b=f.b+f.bayDepth*Math.sqrt(Math.max(0,1-(a/f.bayHalfWidth)**2));
 late.push(column(a,b,[[33.7,.40],[34.3,.27],[35.8,.22],[37.1,.24],[37.8,.34],[38.7,.48]],12));
}
for(const a of[-5.55,5.55]){
 cuts.push(panel(oval(a,36.1,1.95,4.8),23.65,25.4));
 cuts.push(panel(oval(a,40.45,2.15,4.1),23.65,25.4));
}
for(const a of[-1.85,1.85])cuts.push(panel(arch(a,1.65,38.85,41.7,42.25),23.6,25.1));
for(const a of[-5.4,-1.8,1.8,5.4])cuts.push(panel(arch(a,a===-5.4||a===5.4?2.8:3.0,28.7,32.1,33.4),23.2,25.5));
for(const row of p.windows.rows)for(const a of p.windows.columns)cuts.push(panel(arch(a,1.65,row.bottom,row.top-.18,row.top),23.55,25.0));
cuts.push(panel(arch(0,1.2,54.6,56.0,56.6),23.55,25.3));

const balconyPlans=[];
for(const balcony of p.balconies){
 const {a,elevation:y,tulip}=balcony,baseB=24.30,ra=tulip?.88:1.10,rb=tulip?1.25:1.22;
 const plan=Array.from({length:21},(_,i)=>{const t=Math.PI*i/20;return[a+ra*Math.cos(t),baseB+rb*Math.sin(t)];});
 balconyPlans.push(ringAB(plan));
 const bowl=loft(plan,[[y-.75,.65],[y-.30,.95],[y+.65,tulip?1.05:1.0],[y+(tulip?1.55:.95),tulip?.85:.9]],[a,baseB]);
 const inner=plan.map(([x,b])=>[a+(x-a)*.76,baseB+.15+(b-baseB)*.71]);
 const hollow=building([ringAB(inner)],y+.08,y+2.1),eyes=[];
 for(const da of[-.42,.42])eyes.push(panel(oval(a+da,y+(tulip?.75:.40),tulip?.36:.62,tulip?.90:.55),24.95,26.2));
 const eyeUnion=Manifold.union(eyes),inside=bowl.subtract(hollow),mask=inside.subtract(eyeUnion);
 pieces.push(mask);bowl.delete();inside.delete();hollow.delete();eyeUnion.delete();for(const eye of eyes)eye.delete();
}
// Rear façade recesses and a broad balcony make the exposed garden side read
// as a house rather than as the underside of the flat municipal roof.
for(const row of[37.1,41.4,45.7,49.8])for(const a of[-4.4,0,4.4])cuts.push(panel(arch(a,1.65,row,row+2.6,row+2.9),-11.55,-9.9));

const union=Manifold.union(pieces);for(const solid of pieces)solid.delete();
const subtractors=Manifold.union(cuts),carved=union.subtract(subtractors);union.delete();subtractors.delete();for(const solid of cuts)solid.delete();
const decorated=Manifold.union([carved,...late]);carved.delete();for(const solid of late)solid.delete();
assert.equal(decorated.status(),'NoError');
const reduced=decorated.simplify(p.meshTolerance);decorated.delete();
const shells=reduced.decompose(),positive=shells.filter(q=>q.volume()>1e-5);
assert.equal(positive.length,1,'All façade and rooftop details must remain connected');
const result=printGlb(positive[0],attribution,camera);assert(result.glb.length<4*1024*1024);
await writeFile(new URL('print.glb',directory),result.glb);

// Roofed light wells are included in the occupied catalogue footprint. Street
// projections are part of its vertical envelope; party walls are not buffered.
const footprintSection=section([outer]),projected=section(balconyPlans),baySection=section([ringAB(bayRing)]),envelope=footprintSection.add(projected).add(baySection);
let rings=envelope.toPolygons();rings.sort((a,b)=>Math.abs(a.reduce((s,p,i)=>{const q=a[(i+1)%a.length];return s+p[0]*q[1]-q[0]*p[1];},0))-Math.abs(b.reduce((s,p,i)=>{const q=b[(i+1)%b.length];return s+p[0]*q[1]-q[0]*p[1];},0)));
const lonK=111320*Math.cos(survey.anchor[1]*Math.PI/180),coordinates=rings.map(r=>{const g=r.map(([e,n])=>[survey.anchor[0]+e/lonK,survey.anchor[1]+n/111320]);g.push(g[0]);return g;});
assert.equal(coordinates.length,1,'Use one exterior envelope with covered wells');
for(const s of[footprintSection,projected,baySection,envelope])s.delete();
const all=coordinates.flat(),feature={type:'Feature',id,bbox:[Math.min(...all.map(q=>q[0])),Math.min(...all.map(q=>q[1])),Math.max(...all.map(q=>q[0])),Math.max(...all.map(q=>q[1]))],geometry:{type:'Polygon',coordinates},properties:{name:'Casa Batlló',place:'Barcelona, Spain',city:'Barcelona',country:'Spain',aliases:['Casa Batllo','House of the Dragon','Casa dels Ossos'],revision:'r1',geometryType:'building',anchor:survey.anchor,anchorElevation:ground,height:+(result.max[1]-result.min[1]).toFixed(3),mesh:path+'print.glb',thumbnail:path+'thumbnail.webp',byteLength:result.glb.length,license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',attribution,sources:survey.sources,replacement:{featureIds:['osm-relation-9427554','osm-way-679019065']}}};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(feature,null,2)+'\n');
console.log({bytes:result.glb.length,vertices:result.vertices,triangles:result.triangles,bounds:[result.min,result.max],volume:positive[0].volume(),components:positive.length});
