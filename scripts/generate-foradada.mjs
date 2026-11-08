import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const id='roca-foradada',revision='r3',directory=`models/${id}/${revision}/`;
const root=new URL('../',import.meta.url),sidecar=new URL(directory+'terrain.json',root);
const catalogue=new URL('catalog.geojson',root);
const terrainSource='https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat';
const cadiretaStudy='https://doi.org/10.3390/geosciences12100370';
const cadiretaMeasurements='https://hdl.handle.net/2099.1/25652';
const attribution='Open Place Models contributors. Surface elevations © Institut Cartogràfic i Geològic de Catalunya, CC BY 4.0.';
const anchor=[1.7865106079801403,41.61225600493541],side=129,step=1.25,half=(side-1)*step/2;
const round=value=>Math.round(value*100)/100;
const survey=process.argv[2]&&JSON.parse(await readFile(process.argv[2],'utf8'));
const stored=survey?null:JSON.parse(await readFile(sidecar,'utf8'));
const api=await ManifoldModule();
api.setup();

function solid(positions,indices){
  const mesh=new api.Mesh({numProp:3,vertProperties:Float32Array.from(positions),triVerts:Uint32Array.from(indices)});
  const result=new api.Manifold(mesh);
  assert.equal(result.status(),'NoError');
  assert(result.volume()>0,'Positive volume');
  return result;
}

function loft(rings){
  const count=rings[0].length,positions=rings.flat(2),triangles=[];
  const end=(rings.length-1)*count;
  for(let row=0;row<end;row+=count)for(let i=0;i<count;i++){
    const a=row+i,b=row+(i+1)%count;
    triangles.push(a,a+count,b+count,a,b+count,b);
  }
  for(let i=1;i<count-1;i++)triangles.push(0,i,i+1,end,end+i+1,end+i);
  return solid(positions,triangles);
}

// Table 4 of Cabranes Medina (2015) gives approximately 17.2 × 25.3 × 47.9 m
// for the Cadireta from the top of its pedestal. Fit rounded sections from
// the cardinal views in Janeras et al. (2022), Figure 20, to the crest in
// the ICGC grid at local (3, −36), 902.35 m. The sections are interpreted.
const cadiretaSections=[
  [850,-9,9,-51,-31],[855,-8.5,8,-49,-33],
  [862,-9,9,-49.7,-33],[870,-7.5,8.5,-49,-33.5],
  [873,-7,8.4,-49,-33.7],[876,-7.4,9.6,-53.8,-33.3],
  [879,-7.4,9,-54.8,-33],[883,-8.3,9,-57.2,-32.2],
  [887,-8,8,-56.4,-32.7],[890,-7.8,7.6,-53,-32.7],
  [894,-5.9,7.7,-51,-32.2],[898,-3.4,8.5,-45.4,-32.8],
  [900,-1.8,7.6,-42,-33.5],[901.7,.3,5.7,-38.8,-34],
  [902.35,2.7,3.3,-36.4,-35.6]
];

function crownSection([altitude,west,east,north,south]){
  const soften=value=>Math.sign(value)*Math.abs(value)**.8;
  return Array.from({length:20},(_,i)=>{
    const angle=i*2*Math.PI/20;
    const x=(west+east)/2+(east-west)/2*soften(Math.cos(angle));
    const z=(north+south)/2+(south-north)/2*soften(Math.sin(angle));
    return [x,altitude,z];
  });
}

const cadireta=loft(cadiretaSections.map(crownSection));

function surveyedElevation(x,z){
  const px=x*2+(survey.side-1)/2,pz=z*2+(survey.side-1)/2;
  const col=Math.floor(px),row=Math.floor(pz),u=px-col,v=pz-row;
  const i=row*survey.side+col,points=survey.grid;
  return (points[i]*(1-u)+points[i+1]*u)*(1-v)+
    (points[i+survey.side]*(1-u)+points[i+survey.side+1]*u)*v;
}

if(survey){
  assert.deepEqual(survey.anchor,anchor,'Survey anchor');
  assert(survey.side>=4*half+3&&survey.side%2===1,'Centred half-metre survey samples with interpolation margin');
  assert.equal(survey.grid.length,survey.side**2,'Complete survey');
  assert(Math.abs(surveyedElevation(3,-36)-902.35)<.1,'Cadireta crest matches the survey');
}
const elevations=stored?.grid.elevations??Array.from({length:side*side},(_,i)=>{
  const x=i%side*step-half,z=Math.floor(i/side)*step-half;
  const ground=surveyedElevation(x,z);
  if(x<-10||x>10||z<-58||z>-32)return round(ground);
  const top=cadireta.rayCast([x,910,z],[x,848,z])[0];
  return round(Math.max(ground,top?.position[1]??ground));
});
assert(elevations.length===side*side&&elevations.every(Number.isFinite),'Complete elevation grid');
const base=Math.floor(Math.min(...elevations))-5;

const bearing=74*Math.PI/180,along=[Math.sin(bearing),-Math.cos(bearing)],across=[-along[1],along[0]];
const coordinate=(distance,offset,altitude)=>[
  16+distance*along[0]+offset*across[0],altitude,3+distance*along[1]+offset*across[1]
];

// An original rounded triangular section. The survey gives the west dimensions.
// Small offsets and narrower middle sections are modelling approximations.
const profile=[[-.50,0],[.40,.015],[.50,.09],[.43,.28],[.29,.60],[.14,.87],
  [.06,.975],[-.01,1],[-.09,.96],[-.26,.76],[-.38,.49],[-.47,.21]];
const sections=[
  [-6,892.8,10.2,13.2,-.1],[0,892.8,10.2,13,0],[3.5,892.4,9.3,12.25,1],
  [8.5,892.2,8.9,11.8,1.7],[13,891.8,9.4,12.1,1.3],[17,891.2,9.4,12.4,1],[30,890.9,9.4,12.4,1]
];
const vertices=sections.flatMap(([distance,sill,width,height,offset])=>profile.flatMap(([u,v])=>
  coordinate(distance,u*width+offset,sill+v*height).map(value=>Number(value.toFixed(4)))));
const faces=[],ring=profile.length,end=(sections.length-1)*ring;
for(let row=0;row<end;row+=ring)for(let i=0;i<ring;i++){
  const a=row+i,b=row+(i+1)%ring;
  faces.push(a,a+ring,b+ring,a,b+ring,b);
}
for(let i=1;i<ring-1;i++)faces.push(0,i,i+1,end,end+i+1,end+i);

// Remove the vertical shadow of the north-facing cap and leave the neck in
// place. The rounded cutter ends at the face; the pedestal and southern
// contact remain part of the surveyed massif.
const envelope=loft([
  [847,-18,16,-63,-44],[854,-17,16,-64,-41],[863,-16,16,-64,-40],
  [873,-17,16,-64,-40],[886,-17,16,-64,-42],[892,-15,15,-64,-45],
  [897,-13,13,-64,-47]
].map(([altitude,west,east,north,south])=>[
  [west+3,north],[east-3,north],[east,north+3],[east,south-2],
  [east-3,south],[west+3,south],[west,south-2],[west,north+3]
].map(([x,z])=>{
  // The floor follows the rise of the pedestal towards the neck. A flat
  // cut at the lowest level would expose an artificial shelf on the face.
  const floor=837+(z+63)*1.5;
  const y=altitude<876?floor+(altitude-847)/29*(876-floor):altitude;
  return [x,y,z];
})));
const hollow=envelope.subtract(cadireta);
assert.equal(hollow.status(),'NoError','Cadireta clearance is a valid solid');
assert(hollow.volume()>0,'Cadireta clearance is nonempty');

const surface=elevations.flatMap((y,i)=>[i%side*step-half,y,Math.floor(i/side)*step-half]),surfaceFaces=[];
for(let z=0;z<side-1;z++)for(let x=0;x<side-1;x++){
  const a=z*side+x,b=a+1,c=a+side,d=c+1;
  surfaceFaces.push(a,c,b,b,c,d);
}
const edge=Array.from({length:side-1},(_,i)=>i);
const boundary=[...edge,...edge.map(z=>z*side+side-1),
  ...edge.map(x=>side*side-1-x),...edge.map(z=>(side-1-z)*side)];
for(const v of boundary)surface.push(surface[v*3],base,surface[v*3+2]);
const centre=surface.length/3;
surface.push(0,base,0);
for(let i=0;i<boundary.length;i++){
  const j=(i+1)%boundary.length,a=boundary[i],b=boundary[j],c=elevations.length+i,d=elevations.length+j;
  surfaceFaces.push(a,b,c,b,d,c,c,d,centre);
}

const original=solid(surface,surfaceFaces),arch=solid(vertices,faces);
const cutter=api.Manifold.compose([arch,hollow]);
const rock=api.Manifold.difference([original,cutter]);
assert.equal(rock.status(),'NoError');
const pieces=rock.decompose();
assert.equal(pieces.length,1,'The rock remains one solid');
assert.equal(rock.genus(),1,'The opening passes through the rock');
const removed=original.volume()-rock.volume();
const ray=(height,offset=0)=>[coordinate(-14,offset,height),coordinate(32,offset,height)];
assert(original.rayCast(...ray(897)).length>0,'The elevation surface covers the opening before carving');
for(const elevation of [896,897,898,899])for(const offset of [-1,0,1])
  assert.equal(rock.rayCast(...ray(elevation,offset)).length,0,'Clear section through both mouths');
assert(rock.rayCast(...ray(907)).length>0,'Rock survives above the vault');
for(const [x,z] of [[1,-52],[3,-53],[5,-53]]){
  const nose=rock.rayCast([x,906,z],[x,834,z]).map(hit=>hit.position[1]);
  assert(nose.length>=3&&nose[0]-nose[1]>2&&nose[1]-nose[2]>7,
    `The Cadireta cap overhangs an exterior recess at ${x}, ${z}: ${nose.join(', ')}`);
}
const cutMesh=cutter.getMesh();
assert.equal(cutMesh.mergeFromVert.length,0,'The combined cutter uses welded vertices');
for(const piece of [...pieces,original,arch,cutter,cadireta,envelope,hollow])piece.delete();

const {vertProperties:positions,triVerts:indices,mergeFromVert}=rock.getMesh();
rock.delete();
assert.equal(mergeFromVert.length,0,'The GLB uses welded vertices');
assert(positions.length/3<=65536,'16-bit index budget');
for(let i=1;i<positions.length;i+=3)positions[i]-=base;
const coordinates=[0,1,2].map(axis=>positions.filter((_,i)=>i%3===axis));
const min=coordinates.map(axis=>Math.min(...axis)),max=coordinates.map(axis=>Math.max(...axis));
const indexBuffer=Uint16Array.from(indices);
const binary=Buffer.concat([Buffer.from(positions.buffer),Buffer.from(indexBuffer.buffer)]);
const document={
  asset:{version:'2.0',generator:'Open Place Models',copyright:attribution,extras:{baseElevation:base,verticalDatum:'EGM08D595'}},
  scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
  buffers:[{byteLength:binary.length}],bufferViews:[
    {buffer:0,byteLength:positions.byteLength,target:34962},
    {buffer:0,byteOffset:positions.byteLength,byteLength:indexBuffer.byteLength,target:34963}
  ],
  accessors:[{bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3',min,max},
    {bufferView:1,componentType:5123,count:indices.length,type:'SCALAR'}]
};
const json=Buffer.from(JSON.stringify(document)),jsonSize=Math.ceil(json.length/4)*4,binSize=Math.ceil(binary.length/4)*4;
const glb=Buffer.alloc(28+jsonSize+binSize);
glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(jsonSize,12);
glb.write('JSON',16);glb.fill(0x20,20,20+jsonSize);json.copy(glb,20);
glb.writeUInt32LE(binSize,20+jsonSize);glb.write('BIN\0',24+jsonSize);binary.copy(glb,28+jsonSize);

const [lon,lat]=anchor,longitude=half/(111320*Math.cos(lat*Math.PI/180)),latitude=half/111320;
const bbox=[lon-longitude,lat-latitude,lon+longitude,lat+latitude], [west,south,east,north]=bbox;
const entry={type:'Feature',id,bbox,geometry:{type:'Polygon',coordinates:[[
  [west,south],[east,south],[east,north],[west,north],[west,south]
]]},properties:{
  kind:'landform',geometryType:'terrain',name:'Roca Foradada',place:'Montserrat, Catalonia, Spain',city:'El Bruc',country:'Spain',
  aliases:['Foradada de Montserrat','Roca Foradada del Bruc','Cadireta d’Agulles'],revision,anchor,height:max[1],
  mesh:directory+'print.glb',byteLength:glb.length,thumbnail:directory+'thumbnail.webp',
  license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0',attribution,
  sources:[terrainSource,'https://espeleoworld.com/c/la-roca-foradada-bruc',
    'https://patrimonicultural.diba.cat/print/pdf/node/74394',cadiretaStudy,cadiretaMeasurements],
  landform:{data:directory+'terrain.json',verticalDatum:'EGM08D595',minimumWidth:10.2}
}};
const data=JSON.parse(await readFile(catalogue,'utf8')),index=data.features.findIndex(feature=>feature.id===id);
if(index<0)data.features.push(entry);
else data.features[index]=entry;

await mkdir(new URL(directory,root),{recursive:true});
const terrain=JSON.stringify({grid:{step,side,elevations},void:{
  vertices:Array.from(cutMesh.vertProperties,value=>Number(value.toFixed(4))),faces:Array.from(cutMesh.triVerts)
}})+'\n';
assert(Buffer.byteLength(terrain)<256*1024,'The browser can load the sidecar');
await writeFile(sidecar,terrain);
await writeFile(new URL(entry.properties.mesh,root),glb);
await writeFile(catalogue,JSON.stringify(data,null,2)+'\n');
console.log(`${indices.length/3} triangles · ${glb.length} bytes · ${removed.toFixed(1)} m³ removed · clear opening at 897 m`);
