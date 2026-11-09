import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openSolids,printGlb} from './monument-solids.mjs';

const id='congost-mont-rebei',revision='r2',directory=`models/${id}/${revision}/`;
const root=new URL('../',import.meta.url),folder=new URL(directory,root);
const [candidateFile,raysFile]=process.argv.slice(2);
const source=JSON.parse(gunzipSync(await readFile(new URL('survey.json.gz',folder))));
const {sections,sectors,galleryAnchor,gallery}=source;
const {mesh}=await openSolids();
const degree=111320;
const k=lat=>degree*Math.cos(lat*Math.PI/180);
const round=(value,digits=5)=>Number(value.toFixed(digits));
const toLocal=([lon,lat,height],[lon0,lat0])=>[(lon-lon0)*k(lat0),height,(lat0-lat)*degree];
const toMap=([x,height,z],[lon,lat])=>[lon+x/k(lat),lat-z/degree,height];

function cutter(rows,anchor){
  const n=8,vertices=[],faces=[];
  for(const {coordinates,floor,width,height} of rows){
    const [front,,z]=toLocal(coordinates,anchor),back=front+width;
    // In open stretches the loft extends above the local wall to leave the shelf exposed.
    const top=height||83;
    vertices.push(front-6,floor,z, back-.14,floor,z, back,floor+.12,z,
      back,floor+top*.79,z, back-.14,floor+top*.95,z, front+.56,floor+top,z,
      front-.25,floor+top*.98,z, front-6,floor+top*.9,z);
  }
  const last=(rows.length-1)*n;
  for(let row=0;row<last;row+=n)for(let i=0;i<n;i++){
    const a=row+i,b=row+(i+1)%n;
    faces.push(a,a+n,b+n,a,b+n,b);
  }
  for(const row of [0,last]){
    const centre=vertices.length/3;
    vertices.push((vertices[row*3]+vertices[(row+2)*3])/2,
      (vertices[row*3+1]+vertices[(row+5)*3+1])/2,vertices[row*3+2]);
    for(let i=0;i<n;i++){
      const a=row+i,b=row+(i+1)%n;
      faces.push(centre,row?b:a,row?a:b);
    }
  }
  const solid=mesh(vertices,faces);
  assert.equal(solid.status(),'NoError');
  assert(solid.volume()>0);
  return solid;
}

function terrainSolid(){
  const width=gallery[0].length,rows=gallery.length;
  const vertices=gallery.flat(2),faces=[];
  let lowest=Infinity;
  for(let i=1;i<vertices.length;i+=3)lowest=Math.min(lowest,vertices[i]);
  const base=Math.floor(lowest)-2;
  for(let row=0;row<rows-1;row++)for(let col=0;col<width-1;col++){
    const a=row*width+col,b=a+1,d=a+width;
    faces.push(a,b,d,b,d+1,d);
  }
  const cols=Array.from({length:width-1},(_,i)=>i),sides=Array.from({length:rows-1},(_,i)=>i);
  const boundary=[...cols,...sides.map(row=>row*width+width-1),
    ...cols.map(col=>rows*width-1-col),...sides.map(row=>(rows-1-row)*width)];
  const start=vertices.length/3;
  for(const i of boundary)vertices.push(vertices[i*3],base,vertices[i*3+2]);
  const centre=vertices.length/3;
  vertices.push(0,base,0);
  for(let i=0;i<boundary.length;i++){
    const j=(i+1)%boundary.length,a=boundary[i],b=boundary[j],c=start+i,d=start+j;
    faces.push(b,a,c,b,c,d,d,c,centre);
  }
  const terrain=mesh(vertices,faces);
  assert.equal(terrain.status(),'NoError');
  assert(terrain.volume()>0);
  return {terrain,base};
}

const {terrain,base}=terrainSolid();
const fullCutter=cutter(sections,galleryAnchor);
const relief=terrain.subtract(fullCutter).simplify(.12);
assert.equal(relief.status(),'NoError');
assert(relief.volume()<terrain.volume());
assert.equal(relief.decompose().length,1);

const camera=[-1,.29,-.22];
const attribution='Open Place Models contributors. Terrain elevations © Institut Cartogràfic i Geològic de Catalunya, CC BY 4.0.';
const {glb,max,triangles}=printGlb(relief.translate([0,-base,0]),attribution,camera);
const common={geometryType:'terrain',place:'Sant Esteve de la Sarga, Catalonia, Spain',city:'Sant Esteve de la Sarga',
  country:'Spain',revision,mesh:directory+'print.glb',byteLength:glb.length,height:round(max[1]),license:'CC-BY-4.0',
  spatialDataLicense:'CC-BY-4.0',attribution,sources:[
    'https://fundaciocatalunya-lapedrera.com/ca/espais-natura/congost-mont-rebei/itineraris',
    'https://mediambient.repositori.gencat.cat/handle/20.500.14343/2295',
    'https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat',
    'https://www.rutespirineus.cat/rutes/congost-de-mont-rebei',
    'https://commons.wikimedia.org/wiki/File:Congost_de_Mont-rebei_20201110_05.jpg',
    'https://commons.wikimedia.org/wiki/File:Congost_de_Mont-rebei_des_del_cam%C3%AD_de_dalt_(mar%C3%A7_2013)_-_panoramio_(1).jpg'
  ]};
function rectangle(id,bbox,properties){
  const [w,s,e,n]=bbox;
  return {type:'Feature',id,bbox,geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]},
    properties:{...common,...properties}};
}
function bounds(points){
  const longitude=points.map(p=>p[0]),latitude=points.map(p=>p[1]);
  return [Math.min(...longitude),Math.min(...latitude),Math.max(...longitude),Math.max(...latitude)];
}

const corners=gallery.flat().map(point=>toMap(point,galleryAnchor));
const group=rectangle(id,bounds(corners),{kind:'group',name:'Congost de Mont-rebei',anchor:galleryAnchor,
  aliases:['Camí nou de Mont-rebei','Mont-rebei gorge','Desfiladero de Mont-rebei'],thumbnail:directory+'thumbnail.webp'});

const features=[group],sidecarSizes=[];
for(const sector of sectors){
  const {anchor,side,step,elevations,from,to}=sector;
  const solid=cutter(sections.filter(row=>row.north>=from&&row.north<=to),anchor);
  const {vertProperties,triVerts,mergeFromVert}=solid.getMesh();
  assert.equal(mergeFromVert.length,0);
  assert(vertProperties.length<=3072&&triVerts.length<=6144);
  const data=sector.id+'.json';
  const vertices=Array.from(vertProperties,value=>round(value));
  const sidecar=JSON.stringify({grid:{side,step,elevations},void:{
    vertices,faces:Array.from(triVerts)}})+'\n';
  assert(Buffer.byteLength(sidecar)<256*1024);
  await writeFile(new URL(data,folder),sidecar);
  sidecarSizes.push(Buffer.byteLength(sidecar));
  const cutterBounds=bounds([anchor,...Array.from({length:vertices.length/3},(_,i)=>toMap(vertices.slice(i*3,i*3+3),anchor))]);
  features.push(rectangle(`${id}-${sector.id}`,cutterBounds,{
    kind:'landform',galleryParent:id,anchor,name:`Congost de Mont-rebei (${sector.id})`,
    landform:{data:directory+data,verticalDatum:'EGM08D595',minimumWidth:1.2}}));
  solid.delete();
}
assert(sidecarSizes.reduce((sum,size)=>sum+size,0)<256*1024);

const rays=[];
const point=(section,x,y)=>{
  const [front,,z]=toLocal(section.coordinates,galleryAnchor);
  return toMap([front+x,section.floor+y,z],galleryAnchor);
};
for(const north of [4661060,4661117,4661162,4661212]){
  const row=sections.find(row=>row.north===north);
  assert(row?.height,north);
  const x=.72;
  rays.push({name:`${north}-entry`,type:'entry',points:[point(row,-5,1.18),point(row,x,1.18)]},
    {name:`${north}-floor`,type:'floor',points:[point(row,x,1.18),point(row,x,-1.9)]},
    {name:`${north}-roof`,type:'roof',points:[point(row,x,1.18),point(row,x,row.height+1.5)]},
    {name:`${north}-back`,type:'back',points:[point(row,x,1.18),point(row,2.8,1.18)]});
}
for(const north of [4661107,4661236]){
  const row=sections.find(row=>row.north===north);
  assert(row&&row.height===0,north);
  rays.push({name:`${north}-open-sky`,type:'entry',points:[point(row,.6,1.1),point(row,.6,40)]});
}
for(const seam of [4661084,4661138,4661192]){
  const south=sections.find(row=>Math.abs(row.north-(seam-.55))<1e-6);
  const north=sections.find(row=>Math.abs(row.north-(seam+.55))<1e-6);
  assert(south&&north,seam);
  rays.push({name:`${seam}-seam`,type:'entry',points:[point(south,.45,1.1),point(north,.45,1.1)]});
}
for(const {name,type,points} of rays){
  const count=relief.rayCast(...points.map(p=>toLocal(p,galleryAnchor))).length;
  assert(type==='entry'?count===0:count>0,`${name}: ${count} crossings`);
}

await writeFile(new URL('print.glb',folder),glb);
if(candidateFile)await writeFile(candidateFile,JSON.stringify(features,null,2)+'\n');
if(raysFile)await writeFile(raysFile,JSON.stringify(rays,null,2)+'\n');
const length=sections.slice(1).reduce((sum,row,i)=>sum+Math.hypot(row.east-sections[i].east,row.north-sections[i].north),0);
console.log(JSON.stringify({base,length:round(length,2),triangles,bytes:glb.length,sidecarSizes,controls:rays.length,
  sha256:createHash('sha256').update(glb).digest('hex')}));
