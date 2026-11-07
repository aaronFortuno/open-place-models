import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';

const id='millau-viaduct',mesh=`models/${id}/r1/print.glb`;
const catalog=new URL('../catalog.geojson',import.meta.url),output=new URL('../'+mesh,import.meta.url);
const anchor=[3.022440169762942,44.07990944400367],anchorElevation=637.4708645;
const length=2460,radius=20000,grade=.03025,width=32,depth=4.2,tower=87,stayDiameter=4.5;
const spans=[204,342,342,342,342,342,342,204];
const stations=spans.slice(0,-1).map((_,i)=>spans.slice(0,i+1).reduce((sum,n)=>sum+n,0));
const pierHeights=[94.5,244.8,221.7,144.5,136.4,109.3,77.6];
const k=111320*Math.cos(anchor[1]*Math.PI/180);
// Fit the published arc to the midpoints of the BD TOPO carriageways, north to south.
const dx=(3.02468369-3.02113632)*k,dn=(44.06864995-44.09124507)*111320;
const norm=Math.hypot(dx,dn),tx=dx/norm,tn=dn/norm;
const local=(station,across=0,up=0)=>{
  const t=(station-length/2)/radius,x=radius*Math.sin(t),y=radius*(1-Math.cos(t));
  const nx=-tn*Math.cos(t)-tx*Math.sin(t),nn=tx*Math.cos(t)-tn*Math.sin(t);
  return [x*tx-y*tn+nx*across,grade*(station-length/2)+up,-(x*tn+y*tx+nn*across)];
};
const geographic=([east,y,south])=>[anchor[0]+east/k,anchor[1]-south/111320,anchorElevation+y];
const positions=[],indices=[];
function shell(vertices,faces){
  let volume=0;
  for(let i=0;i<faces.length;i+=3){
    const [a,b,c]=faces.slice(i,i+3).map(j=>vertices[j]);
    volume+=a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]);
  }
  if(Math.abs(volume)<1e-8)throw Error('Empty structural component.');
  const base=positions.length/3;
  for(const vertex of vertices)positions.push(...vertex);
  for(let i=0;i<faces.length;i+=3)indices.push(base+faces[i],base+faces[i+(volume>0?1:2)],base+faces[i+(volume>0?2:1)]);
}
function sweep(sections){
  const size=sections[0].length,faces=[];
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<size;j++){
    const a=i*size+j,b=i*size+(j+1)%size;
    faces.push(a,b,b+size,a,b+size,a+size);
  }
  const end=(sections.length-1)*size;
  for(let j=1;j<size-1;j++)faces.push(0,j+1,j,end,end+j,end+j+1);
  shell(sections.flat(),faces);
}
function strut(a,b,lower,upper=lower){
  const [dx,dy,dz]=b.map((v,i)=>v-a[i]),norm=Math.hypot(dx,dy,dz),d=[dx/norm,dy/norm,dz/norm];
  const u=Math.abs(d[1])>.9?[0,0,1]:[0,1,0],v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];
  const n=Math.hypot(...v),cross=v.map(i=>i/n),other=[d[1]*cross[2]-d[2]*cross[1],d[2]*cross[0]-d[0]*cross[2],d[0]*cross[1]-d[1]*cross[0]];
  const ring=(point,radii)=>Array.from({length:8},(_,i)=>{
    const t=i*Math.PI/4;
    return point.map((p,j)=>p+Math.cos(t)*radii[0]*cross[j]+Math.sin(t)*radii[1]*other[j]);
  });
  sweep([ring(a,lower),ring(b,upper)]);
}
for(const s of stations){
  for(const side of [-1,1])strut(local(s+side*12,0,-1),local(s,0,42),[3.4,2.3],[2.8,2]);
  strut(local(s,0,35),local(s,0,tower),[3.4,2.6],[1.25,1.15]);
}
const pylonIndexCount=indices.length;
for(const s of stations)for(const direction of [-1,1])for(let n=0;n<11;n++){
  const reach=34+n*12.51,z=49+n*3.2,r=[stayDiameter/2,stayDiameter/2];
  strut(local(s,0,z),local(s+direction*reach,0,-.6),r);
}
const upperIndexCount=indices.length;
const stepStations=Array.from({length:83},(_,i)=>length*i/82);
const axis=stepStations.map(s=>geographic(local(s)));
const deckRows=stepStations.map(s=>[geographic(local(s,width/2)),geographic(local(s,-width/2))]);
sweep(stepStations.map(s=>[[width/2,0],[width*.36,-depth],[-width*.36,-depth],[-width/2,0]]
  .map(([across,up])=>local(s,across,up))));
for(const [i,s] of stations.entries()){
  strut(local(s,0,-pierHeights[i]),local(s,0,-38),[8,7],[5.5,5]);
  for(const side of [-1,1])strut(local(s,0,-40),local(s,side*4,-depth+.4),[5,3.5],[4.2,3]);
}
const outline=[...deckRows.map(row=>row[0].slice(0,2)),...deckRows.slice().reverse().map(row=>row[1].slice(0,2))];
outline.push(outline[0]);
const points=Array.from({length:positions.length/3},(_,i)=>geographic(positions.slice(3*i,3*i+3)));
const bbox=[0,1].map(k=>Math.min(...points.map(p=>p[k]))).concat([0,1].map(k=>Math.max(...points.map(p=>p[k]))));
const attribution='Open Place Models contributors. Georeferencing © IGN, BD TOPO®, Licence Ouverte 2.0.';
const position=Buffer.from(new Float32Array(positions).buffer),index=Buffer.from(new Uint16Array(indices).buffer);
const binary=Buffer.concat([position,index]),json=Buffer.from(JSON.stringify({
  asset:{version:'2.0',generator:'Open Place Models',copyright:attribution},scene:0,scenes:[{nodes:[0]}],
  nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
  buffers:[{byteLength:binary.length}],bufferViews:[{buffer:0,byteLength:position.length,target:34962},
    {buffer:0,byteOffset:position.length,byteLength:index.length,target:34963}],
  accessors:[{bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3',
    min:[0,1,2].map(i=>Math.min(...positions.filter((_,j)=>j%3===i))),max:[0,1,2].map(i=>Math.max(...positions.filter((_,j)=>j%3===i)))},
    {bufferView:1,componentType:5123,count:indices.length,type:'SCALAR'}]
}));
const jsonSize=Math.ceil(json.length/4)*4,binSize=Math.ceil(binary.length/4)*4,glb=Buffer.alloc(28+jsonSize+binSize);
glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(jsonSize,12);
glb.write('JSON',16);glb.fill(0x20,20,20+jsonSize);json.copy(glb,20);
glb.writeUInt32LE(binSize,20+jsonSize);glb.write('BIN\0',24+jsonSize);binary.copy(glb,28+jsonSize);
mkdirSync(new URL('.',output),{recursive:true});writeFileSync(output,glb);

const entry={type:'Feature',id,bbox,geometry:{type:'Polygon',coordinates:[outline]},properties:{
  kind:'bridge',geometryType:'road',name:'Viaduc de Millau',place:'Millau, France',aliases:['Millau Viaduct','A75'],revision:'r1',byteLength:glb.length,
  anchor,mesh,height:343,attribution,license:'CC-BY-4.0',spatialDataLicense:'etalab-2.0',
  sources:['https://www.leviaducdemillau.com/sites/viaducdemillau/accueil-viaduc-de-millau/le-viaduc/les-chiffres-cles.html',
    'https://www.data.gouv.fr/datasets/bd-topo-r','https://pop.culture.gouv.fr/notice/merimee/IA12101023',
    'https://www.barrages-cfbr.eu/IMG/pdf/col2012-3-01-instrumentation_viaduc_millau.pdf',
    'https://geoservices.ign.fr/sites/default/files/2025-01/DC_BDTOPO_3-4.pdf#page=12'],
  bridge:{anchorElevation,verticalDatum:'NGF–IGN69 (EPSG:5720)',ref:'A75',roadClass:'motorway',
    sourceFeatureIds:['42968122','42968132','4408362752'],
    supportFeatureIds:['2391832022','2391832032','2391832042','2391832062','2391832010','2391832072'],
    width,depth,length,spans,axis,deckRows,pylonIndexCount,upperIndexCount,stayDiameter,
    pierSection:{along:8,across:10},maxPierAdjustment:22},
  thumbnail:`models/${id}/r1/thumbnail.webp`
}};
const data=JSON.parse(readFileSync(catalog,'utf8')),indexInCatalog=data.features.findIndex(f=>f.id===id);
if(indexInCatalog<0)data.features.push(entry);
else data.features[indexInCatalog]=entry;
writeFileSync(catalog,JSON.stringify(data,null,2)+'\n');
console.log(`${mesh} · ${indices.length/3} triangles · ${glb.length} bytes`);
