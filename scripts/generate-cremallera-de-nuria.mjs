import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openSolids,printGlb} from './monument-solids.mjs';

const folder=new URL('../models/cremallera-de-nuria/r1/',import.meta.url);
const {anchor,rows,structures}=JSON.parse(await readFile(new URL('gallery-survey.json',folder),'utf8'));
const {Manifold,mesh}=await openSolids();

// In the local X/Y/Z frame, the axis runs from the Roc del Dui north portal
// towards Núria. Each cross-section faces forward with X east and Z south.
const offsets=[-15,-6,-2.15,2.15,6,15];
const base=Math.floor(Math.min(...rows.flatMap(({z,ground})=>[z,...ground])))-2;
const direction=(a,b)=>{
  const dx=b.x-a.x,dz=b.south-a.south,length=Math.hypot(dx,dz);
  assert(length>.05,'Repeated terrain cross-section');
  return [-dz/length,dx/length];
};

const normals=rows.slice(1).map((row,index)=>direction(rows[index],row));
const mitres=rows.map((_,i)=>{
  const [ax,az]=normals[Math.max(0,i-1)],[bx,bz]=normals[Math.min(i,normals.length-1)];
  const denominator=1+ax*bx+az*bz;
  assert(denominator>=1,'A rail bend folds the corridor');
  return [(ax+bx)/denominator,(az+bz)/denominator];
});
const point=(i,offset,height)=>{
  const {x,south}=rows[i],[nx,nz]=mitres[i];
  return [x+nx*offset,height-base,south+nz*offset];
};

function makeTerrain(){
  const bridgeInterior=new Set(),covered=new Set();
  for(const {kind,from,to} of structures){
    for(let i=from+1;i<to;i++){
      (kind==='bridge'?bridgeInterior:covered).add(i);
    }
  }
  const vertices=[],faces=[];
  const n=offsets.length,stationCount=rows.length;
  for(const [i,{z,ground}] of rows.entries()){
    for(const [j,offset] of offsets.entries()){
      const interior=Math.abs(offset)<=2.15;
      let top=ground[j];
      if(interior){
        if(covered.has(i))top=Math.max(z+5.45,top);
        else if(bridgeInterior.has(i))top=Math.min(z-3.8,top);
        else top=z+.31;
      }else if(Math.abs(offset)===6){
        if(covered.has(i))top=Math.max(z+1.2,top);
        else if(!bridgeInterior.has(i))top=Math.min(top,z-.49);
      }
      vertices.push(...point(i,offset,top));
    }
  }
  for(let row=0;row<stationCount-1;row++)for(let col=0;col<n-1;col++){
    const a=row*n+col,b=a+1,c=a+n,d=c+1;
    faces.push(a,b,c,b,d,c);
  }
  const last=(stationCount-1)*n;
  const boundary=[
    ...Array.from({length:n},(_,i)=>i),
    ...Array.from({length:stationCount-1},(_,i)=>(i+2)*n-1),
    ...Array.from({length:n-1},(_,i)=>last+n-2-i),
    ...Array.from({length:stationCount-2},(_,i)=>(stationCount-2-i)*n),
  ];
  const start=vertices.length/3,topFaces=faces.length;
  for(let i=0;i<start;i++)vertices.push(vertices[i*3],0,vertices[i*3+2]);
  for(let i=0;i<topFaces;i+=3)faces.push(start+faces[i+2],start+faces[i+1],start+faces[i]);
  for(let i=0;i<boundary.length;i++){
    const j=(i+1)%boundary.length,a=boundary[i],b=boundary[j],c=start+a,d=start+b;
    faces.push(b,a,c,b,c,d);
  }
  return mesh(vertices,faces);
}

// A ring ordered counterclockwise in the transverse offset/elevation plane
// has its front normal towards the lower chainage.
function loft(from,to,section){
  const vertices=[],faces=[];
  const sides=section(from).length;
  for(let i=from;i<=to;i++){
    for(const [offset,y] of section(i))vertices.push(...point(i,offset,rows[i].z+y));
  }
  const last=(to-from)*sides;
  for(let ring=0;ring<last;ring+=sides)for(let side=0;side<sides;side++){
    const a=ring+side,b=ring+(side+1)%sides;
    faces.push(a,a+sides,b+sides,a,b+sides,b);
  }
  for(let side=1;side<sides-1;side++)faces.push(0,side,side+1,last,last+side+1,last+side);
  const solid=mesh(vertices,faces);
  assert.equal(solid.status(),'NoError');
  assert(solid.volume()>0);
  return solid;
}

const terrain=makeTerrain();
assert.equal(terrain.status(),'NoError');
assert(terrain.volume()>0);

const deck=[[-2.03,-1.05],[2.03,-1.05],[2.03,.35],[-2.03,.35]];
const bridges=structures.filter(({kind})=>kind==='bridge').map(({from,to})=>
  loft(from-1,to+1,()=>deck));

const bore=[[-2.22,.24],[2.22,.24],[2.22,2.22],[1.86,3.52],[1.13,4.31],[0,4.62],
  [-1.13,4.31],[-1.86,3.52],[-2.22,2.22]];
const openings=structures.filter(({kind})=>kind==='tunnel').map(({from,to})=>
  loft(Math.max(0,from-1),Math.min(rows.length-1,to+1),()=>bore));
const relief=Manifold.difference([terrain,...openings]);
assert.equal(relief.status(),'NoError');
assert(relief.volume()<terrain.volume());

const assembled=Manifold.union([relief,...bridges]).simplify(.19);
assert.equal(assembled.decompose().length,1);
const camera=[-1,1.35,.46];
const attribution='Open Place Models contributors · Institut Cartogràfic i Geològic de Catalunya (CC BY 4.0)';
const {glb,min,max,vertices,triangles}=printGlb(assembled,attribution,camera);
const sha256=createHash('sha256').update(glb).digest('hex');
await writeFile(new URL('print.glb',folder),glb);
console.log({anchor,base,min,max,vertices,triangles,bytes:glb.length,sha256,camera});
