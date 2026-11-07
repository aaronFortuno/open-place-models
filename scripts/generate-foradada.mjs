import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const id='roca-foradada',revision='r1',directory=`models/${id}/${revision}/`;
const root=new URL('../',import.meta.url),sidecar=new URL(directory+'terrain.json',root);
const catalogue=new URL('catalog.geojson',root);
const terrainSource='https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat';
const attribution='Open Place Models contributors. Surface elevations © Institut Cartogràfic i Geològic de Catalunya, CC BY 4.0.';
const anchor=[1.7865106079801403,41.61225600493541],side=65,half=(side-1)/2;
const survey=process.argv[2]&&JSON.parse(await readFile(process.argv[2],'utf8'));
if(survey)assert.deepEqual(survey.anchor,anchor,'Survey anchor');
const elevations=survey
  ?Array.from({length:side*side},(_,i)=>Math.round(survey.grid[2*Math.floor(i/side)*129+2*(i%side)]*100)/100)
  :JSON.parse(await readFile(sidecar,'utf8')).grid.elevations;
assert(elevations.length===side*side&&elevations.every(Number.isFinite),'Complete 1 m elevation grid');
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
  [8.5,892.2,8.9,11.8,1.7],[13,891.8,9.4,12.1,1.3],[17,891.2,9.4,12.4,1],[22,890.9,9.4,12.4,1]
];
const vertices=sections.flatMap(([distance,sill,width,height,offset])=>profile.flatMap(([u,v])=>
  coordinate(distance,u*width+offset,sill+v*height).map(value=>Number(value.toFixed(4)))));
const faces=[],ring=profile.length,end=(sections.length-1)*ring;
for(let row=0;row<end;row+=ring)for(let i=0;i<ring;i++){
  const a=row+i,b=row+(i+1)%ring;
  faces.push(a,a+ring,b+ring,a,b+ring,b);
}
for(let i=1;i<ring-1;i++)faces.push(0,i,i+1,end,end+i+1,end+i);

const surface=elevations.flatMap((y,i)=>[i%side-half,y,Math.floor(i/side)-half]),surfaceFaces=[];
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

const api=await ManifoldModule();
api.setup();
function solid(positions,indices){
  const mesh=new api.Mesh({numProp:3,vertProperties:Float32Array.from(positions),triVerts:Uint32Array.from(indices)});
  const result=new api.Manifold(mesh);
  assert.equal(result.status(),'NoError');
  assert(result.volume()>0,'Positive volume');
  return result;
}
const original=solid(surface,surfaceFaces),cutter=solid(vertices,faces);
const rock=api.Manifold.difference([original,cutter]);
assert.equal(rock.status(),'NoError');
const pieces=rock.decompose();
assert.equal(pieces.length,1,'The rock remains one solid');
assert.equal(rock.genus(),1,'The opening passes through the rock');
const removed=original.volume()-rock.volume();
const ray=height=>[coordinate(-7,0,height),coordinate(20,0,height)];
assert(original.rayCast(...ray(897)).length>0,'The elevation surface covers the opening before carving');
assert.equal(rock.rayCast(...ray(897)).length,0,'Clear line of sight through both mouths');
assert(rock.rayCast(...ray(907)).length>0,'Rock survives above the vault');
for(const piece of [...pieces,original,cutter])piece.delete();

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
  aliases:['Foradada de Montserrat','Roca Foradada del Bruc'],revision,anchor,height:max[1],
  mesh:directory+'print.glb',byteLength:glb.length,thumbnail:directory+'thumbnail.webp',
  license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0',attribution,
  sources:[terrainSource,'https://espeleoworld.com/c/la-roca-foradada-bruc',
    'https://patrimonicultural.diba.cat/print/pdf/node/74394','https://doi.org/10.3390/geosciences12100370'],
  landform:{data:directory+'terrain.json',verticalDatum:'EGM08D595',minimumWidth:10.2}
}};
const data=JSON.parse(await readFile(catalogue,'utf8')),index=data.features.findIndex(feature=>feature.id===id);
if(index<0)data.features.push(entry);
else data.features[index]=entry;

await mkdir(new URL(directory,root),{recursive:true});
await writeFile(sidecar,JSON.stringify({grid:{step:1,side,elevations},void:{vertices,faces}})+'\n');
await writeFile(new URL(entry.properties.mesh,root),glb);
await writeFile(catalogue,JSON.stringify(data,null,2)+'\n');
console.log(`${indices.length/3} triangles · ${glb.length} bytes · ${removed.toFixed(1)} m³ removed · clear opening at 897 m`);
