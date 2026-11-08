import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {openSolids,printGlb} from './monument-solids.mjs';

const id='st-peters-vatican',revision='r1',directory=`models/${id}/${revision}/`;
const root=new URL('../',import.meta.url),catalogue=new URL('catalog.geojson',root);
const layout=JSON.parse(await readFile(new URL(directory+'layout.json',root),'utf8'));
const {anchor,azimuth,basilica,north,south,obelisk,maderno,bernini}=layout;
const [lon,lat]=anchor,k=111320*Math.cos(lat*Math.PI/180);
const angle=180-azimuth,radians=angle*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
const world=([lng,latitude])=>[(lng-lon)*k,(lat-latitude)*111320];
const axial=point=>{
  const [x,z]=world(point);
  return [c*x-s*z,s*x+c*z];
};
const outline=ring=>ring.slice(0,-1).map(axial);
const {Manifold,box,prism,plate,turned}=await openSolids();

function gabledRoof(x,width,y,rise,z0,z1){
  return prism([[x-width,y],[x+width,y],[x+width,y+2],[x,y+rise],[x-width,y+2]],z0,z1);
}

const basilicaOutline=outline(basilica.footprint[0][0]);
const basilicaEnvelope=plate(basilicaOutline,58);
const lowerWalls=plate(basilicaOutline,29.15);
const nave=gabledRoof(.7,24.4,27.2,27.5,-63,123.8);
const transepts=gabledRoof(.15,25.6,27.3,24,-77.8,79.3).rotate(0,90,0);
const apse=turned(0,-61,[[26.9,17.35],[37.1,17.35],[40.15,13.4],[42.1,3.2]],14);
const crossing=box(-33,33,25,58,-31.5,31.7);
const cupolas=basilica.cupolas.flatMap(point=>{
  const [x,z]=axial(point);
  return [
    box(x-9.4,x+9.4,27.4,50.15,z-9.8,z+9.8),
    turned(x,z,[[49.8,8.1],[54.2,8.55],[57.3,7.9],[61.0,5.9],[64.2,2.45],[66.1,.9]],12)
  ];
});
const pavilions=[-38.1,38.5].flatMap(x=>[
  box(x-6.9,x+6.9,27.4,47.9,51.8,72.6),gabledRoof(x,6.9,47.7,7.9,51.8,72.6)
]);
const walls=Manifold.union([lowerWalls,nave,transepts,apse,crossing,...pavilions,...cupolas.filter((_,i)=>i%2===0)])
  .intersect(basilicaEnvelope);
const facadeCentre=-2.2,facadeZ=134.0;
const facadeWall=box(facadeCentre-58,facadeCentre+58,.3,43.1,118.5,facadeZ+.4);
const facadeColumns=[-48,-35,-24,-14,14,24,35,48].map(x=>turned(facadeCentre+x,facadeZ-.26,
  [[5.3,1.65],[7.2,1.38],[32.8,1.21],[34.6,1.69]],8));
const entablature=box(facadeCentre-58.1,facadeCentre+58.1,34.0,38.1,119.9,facadeZ+1.35);
const attic=box(facadeCentre-58.0,facadeCentre+58.0,40.55,45.5,120.3,facadeZ+.82);
const pediment=prism([[facadeCentre-15,37.85],[facadeCentre+15,37.85],[facadeCentre,45.35]],131.6,facadeZ+1.9);
const parapet=box(facadeCentre-57.8,facadeCentre+57.8,44.95,46.08,126.4,facadeZ+.85);
const statues=Array.from({length:13},(_,i)=>i-6).map(i=>{
  const x=facadeCentre+i*8.55;
  return box(x-1.14,x+1.14,45.82,i?50.55:51.2,facadeZ-4.1,facadeZ-1.4);
});
const doors=[-43,-27,0,27,43].map(x=>box(facadeCentre+x-3.2,facadeCentre+x+3.2,2.25,15.15,130.2,facadeZ+2.1));
const facade=Manifold.union([facadeWall,...facadeColumns,entablature,attic,pediment,parapet,...statues])
  .subtract(Manifold.union(doors));
const drum=turned(0,0,[[55.6,28.7],[59.4,29.3],[70.6,29.3],[73.0,29.45]],24,.99);
const dome=turned(0,0,[[72.7,29.45],[79.4,29.2],[87.4,26.9],[94.9,23.4],[101.7,18.2],
  [108.7,11.8],[113.5,5.9]],24,.99);
const lantern=turned(0,0,[[112.9,5.6],[117.1,5.4],[123.0,4.55],[126.5,3.1],
  [129.1,1.48],[130.8,1.27]],12);
const cross=Manifold.union([box(-1.15,1.15,130.4,133.3,-1.12,1.12),box(-2.25,2.25,131.55,132.55,-1.12,1.12)]);
const church=Manifold.union([walls,facade,...cupolas.filter((_,i)=>i%2===1),drum,dome,lantern,cross]).simplify(.09);
assert.equal(church.decompose().length,1,'The basilica roofs are supported by the building');

function radialIntersections(ring,origin,direction){
  const hits=[];
  for(let i=0;i<ring.length;i++){
    const [x,z]=ring[i],next=ring[(i+1)%ring.length],dx=next[0]-x,dz=next[1]-z;
    const det=direction[0]*dz-direction[1]*dx;
    if(Math.abs(det)<1e-9)continue;
    const ax=x-origin[0],az=z-origin[1];
    const distance=(ax*dz-az*dx)/det,edge=(ax*direction[1]-az*direction[0])/det;
    if(distance>0&&edge>=0&&edge<1)hits.push(distance);
  }
  return hits.sort((a,b)=>a-b);
}

const centreOfSquare=axial(obelisk.anchor);
function portico(side,sign){
  const ring=outline(side.curved),whole=outline(side.footprint[0][0]),supports=[];
  // The two rows of piers preserve the open portico at the review scales.
  for(let degrees=42;degrees<=140;degrees+=7){
    const t=degrees*Math.PI/180,direction=[sign*Math.sin(t),Math.cos(t)];
    const hits=radialIntersections(ring,centreOfSquare,direction);
    if(hits.length!==2||hits[1]-hits[0]<9)continue;
    for(const r of [hits[0]+2.8,hits[1]-2.8]){
      const [x,z]=centreOfSquare.map((v,i)=>v+r*direction[i]);
      supports.push(turned(x,z,[[.55,1.85],[2.0,1.55],[12.2,1.55],[13.35,1.94]],6));
    }
  }
  assert(supports.length>=24,'The curved roof needs distributed supports');
  const floor=plate(whole,.82);
  const roof=plate(whole,3.35).translate([0,12.65,0]);
  const arm=plate(outline(side.arm),13.0);
  const model=Manifold.union([floor,roof,arm,...supports]).simplify(.14);
  assert.equal(model.decompose().length,1,'The colonnade roof is attached to the ground');
  return model;
}
const [obeliskX,obeliskZ]=centreOfSquare;
const needle=turned(obeliskX,obeliskZ,[[0,2.8],[1.3,2.8],[1.65,2.35],[7.78,2.35],
  [8.25,1.91],[30.71,1.46],[33.61,.55],[35.1,.52]],4);
const fountain=point=>{
  const [x,z]=axial(point);
  return turned(x,z,[[0,4.89],[.85,4.89],[1.15,1.62],[4.1,1.12],[4.7,2.55],[5.4,2.55],
    [5.68,.92],[6.9,.83],[7.25,1.68],[8,.72]],8);
};

const attribution='Open Place Models contributors. Footprints and registration © OpenStreetMap contributors.';
const sources=[
  'https://www.vatican.va/content/vatican/en/ra/cupolone-lanterna.html',
  'https://www.vatican.va/content/vatican/en/ra/facciata-basilica.html',
  'https://www.basilicasanpietro.va/en/san-pietro/the-square',
  'https://www.vatican.va/content/vatican/en/ra/colonnato-statue-santi.html',
  'https://www.vatican.va/content/vatican/en/ra/obelisco.html',
  'https://digi.ub.uni-heidelberg.de/diglit/fontana1694',
  'https://www.openstreetmap.org/relation/18531045',
  'https://www.openstreetmap.org/relation/10044166',
  'https://registry.opendata.aws/terrain-tiles/'
];
const common={place:'Vatican City',city:'Vatican City',country:'Vatican City',geometryType:'monument',
  revision,license:'CC-BY-4.0',spatialDataLicense:'ODbL-1.0',attribution,sources};
const components=[
  {key:'basilica',name:"St. Peter's Basilica",data:basilica,shape:church},
  {key:'north-colonnade',name:'Bernini Colonnade, north arm',data:north,shape:portico(north,1)},
  {key:'south-colonnade',name:'Bernini Colonnade, south arm',data:south,shape:portico(south,-1)},
  {key:'obelisk',name:'Vatican Obelisk',data:obelisk,shape:needle}
];
function extent(points){
  const coords=[0,1].map(axis=>points.map(point=>point[axis]));
  return [...coords.map(values=>Math.min(...values)),...coords.map(values=>Math.max(...values))];
}
const galleryFloor=Math.min(...components.map(({data})=>data.elevation),maderno.elevation,bernini.elevation);
const assembled=[],features=[];
for(const {key,name,data,shape} of components){
  const footprint=data.footprint;
  const bbox=extent(footprint.flat(2));
  const componentAnchor=data.anchor??[(bbox[0]+bbox[2])/2,(bbox[1]+bbox[3])/2];
  const [x,z]=world(componentAnchor);
  const oriented=shape.rotate(0,angle,0);
  assembled.push(oriented.translate([0,data.elevation-galleryFloor,0]));
  const {glb,min,max,triangles}=printGlb(oriented.translate([-x,0,-z]),attribution,[1,.35,.32]);
  const height=Number(max[1].toFixed(2));
  assert(Math.abs(min[1])<1e-5);
  const mesh=directory+key+'.glb';
  await writeFile(new URL(mesh,root),glb);
  features.push({type:'Feature',id:id+'-'+key,bbox,
    geometry:footprint.length===1?{type:'Polygon',coordinates:footprint[0]}:{type:'MultiPolygon',coordinates:footprint},
    properties:{...common,name,galleryParent:id,anchor:componentAnchor,height,mesh,byteLength:glb.length,
      terrainBaseElevation:data.elevation,replacement:{featureIds:data.replacement.map(String),families:data.replacement.slice(0,2).map(String)}
    }
  });
  console.log(`${key} · ${triangles} triangles · ${glb.length} bytes · ${height} m`);
}
assert.equal(features[0].properties.height,133.3);
for(const feature of [maderno,bernini]){
  assembled.push(fountain(feature.anchor).rotate(0,angle,0).translate([0,feature.elevation-galleryFloor,0]));
}
const gallery=Manifold.union(assembled);
const {glb,max,triangles}=printGlb(gallery,attribution,[.57,.61,1]);
const bbox=extent(features.flatMap(({bbox})=>[bbox.slice(0,2),bbox.slice(2)])),[w,b,e,n]=bbox;
const galleryMesh=directory+'print.glb';
const group={type:'Feature',id,bbox,geometry:{type:'Polygon',coordinates:[[[w,b],[e,b],[e,n],[w,n],[w,b]]]},
  properties:{...common,name:"St. Peter's Basilica and Square",kind:'group',anchor,height:Number(max[1].toFixed(2)),
    aliases:['Sant Pere','Vatican','Vaticano','Basilica di San Pietro','Piazza San Pietro','Bernini','Basílica de Sant Pere'],
    mesh:galleryMesh,byteLength:glb.length,thumbnail:directory+'thumbnail.webp'
  }
};
const index=JSON.parse(await readFile(catalogue,'utf8'));
index.features=index.features.filter(feature=>feature.id!==id&&feature.properties.galleryParent!==id);
index.features.push(group,...features);
await writeFile(new URL(galleryMesh,root),glb);
await writeFile(catalogue,JSON.stringify(index,null,2)+'\n');
console.log(`Gallery · ${triangles} triangles · ${glb.length} bytes`);
