import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {openSolids, printIndexedGlb} from './monument-solids.mjs';

const id = 'pont-del-diable-martorell';
const path = `models/${id}/r1/`;
const directory = new URL(`../${path}`, import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey.json', directory), 'utf8'));
const {Manifold, box, prism, plate, mesh} = await openSolids();
const {anchor, bottom, direction, length, floor, toe, width, arches} = survey;
const attribution = 'Open Place Models contributors · ICGC · OpenStreetMap contributors';
const camera = [-.20, .38, 1];

function interpolate(rows, station) {
  const next = rows.findIndex(([s]) => s >= station);
  if (next <= 0) return (next === 0 ? rows[0] : rows.at(-1))[1];
  const [s0, y0] = rows[next - 1], [s1, y1] = rows[next];
  return y0 + (y1 - y0) * (station - s0) / (s1 - s0);
}

function point(station, offset, elevation) {
  const [x, z] = direction;
  return [station*x - offset*z, elevation - bottom, station*z + offset*x];
}

function strip(stations, left, right, low, high) {
  const vertices = stations.flatMap(s => [point(s,left(s),low(s)),point(s,right(s),low(s)),
    point(s,right(s),high(s)),point(s,left(s),high(s))]).flat();
  const faces = [0,1,2,0,2,3];
  for (let i = 0; i < stations.length-1; i++) {
    for (let side = 0; side < 4; side++) {
      const a = 4*i+side, b = 4*i+(side+1)%4;
      faces.push(a,b+4,b,a,a+4,b+4);
    }
  }
  const end = vertices.length/3-4;
  faces.push(end,end+2,end+1,end,end+3,end+2);
  return mesh(vertices,faces);
}

const angle = -Math.atan2(direction[1],direction[0])*180/Math.PI;
function place(solid, station = 0) {
  const [x,,z] = point(station,0,bottom);
  return solid.rotate(0,angle,0).translate([x,0,z]);
}

function opening({start, span, crown, rise, pointed}) {
  const half = span/2;
  const spring = crown-rise-bottom;
  const radius = (half*half+rise*rise)/(2*half);
  const centre = radius-half;
  const curve = Array.from({length:21}, (_,i) => {
    const x = half*Math.cos(Math.PI*i/20);
    const y = pointed ? Math.sqrt(Math.max(0,radius*radius-(Math.abs(x)+centre)**2)) :
      rise*Math.sin(Math.PI*i/20);
    return [start+half+x,spring+y];
  });
  return place(prism([[start,-8],[start+span,-8],...curve],-12,12));
}

const stations = [...new Set([...floor,...toe,...width].map(([s])=>s))].sort((a,b)=>a-b);
const level = s => interpolate(floor,s);
const halfWidth = s => interpolate(width,s)/2;
const wall = .54;
const body = Manifold.difference([strip(stations,s=>-halfWidth(s),halfWidth,
  s=>interpolate(toe,s),s=>level(s)-.10),...arches.map(opening)]);
const parapets = [
  strip(stations,s=>-halfWidth(s),s=>-halfWidth(s)+wall,s=>level(s)-.25,s=>level(s)+1.02),
  strip(stations,s=>halfWidth(s)-wall,halfWidth,s=>level(s)-.25,s=>level(s)+1.02),
];
const pavement = strip(stations,s=>-halfWidth(s)+wall-.04,s=>halfWidth(s)-wall+.04,
  s=>level(s)-.24,level);

// Open shelter at the summit, with a gabled roof and a traversable passage.
const shelterBase = level(83.8)-bottom;
const shelter = place(Manifold.union([
  box(81.11,86.50,shelterBase-.3,70.05-bottom,-2.01,-1.23),
  box(81.11,86.50,shelterBase-.3,70.05-bottom,1.23,2.01),
  prism([[-2.20,69.85-bottom],[2.20,69.85-bottom],[0,71.90-bottom]],81.0,86.6)
    .rotate(0,90,0),
]));

// The Roman arch stands across the eastern end; keep the open passage under its crown.
const gateStation = 126.72;
const gateBottom = level(125)-bottom;
const gateWall = box(-1.69,1.69,gateBottom-.5,67.8-bottom,-5.56,3.96);
const gateOpening = prism([[-2.25,gateBottom-1],[2.25,gateBottom-1],
  ...Array.from({length:17},(_,i)=>{
    const t=Math.PI*i/16;
    return [2.25*Math.cos(t),62.65-bottom+2.25*Math.sin(t)];
  })],-3,3).rotate(0,90,0).translate([0,0,-.80]);
const gateway = place(Manifold.difference(gateWall,gateOpening),gateStation);
const easternLanding = strip([125,128.43],()=>-5.56,()=>3.96,
  s=>interpolate(toe,s),()=>level(125)-.10);

// Widened medieval pier and its upstream cutwater.
const cutwater = place(plate([[60.2,-2.0],[62.6,-6.8],[65.2,-2.0],
  [65.2,2.0],[62.6,5.1],[60.2,2.0]],14.3).translate([0,39.9-bottom,0]));
const masonry = Manifold.union([body,...parapets,shelter,gateway,easternLanding,cutwater]);
assert.equal(masonry.status(),'NoError');
assert.equal(masonry.decompose().length,1,'Masonry must form one connected solid');
const stone = masonry.getMesh(), tread = pavement.getMesh();
const vertexCount = stone.vertProperties.length/3;
assert(vertexCount+tread.vertProperties.length/3<=65536);
const data = printIndexedGlb(Float32Array.from([...stone.vertProperties,...tread.vertProperties]),
  Uint16Array.from([...stone.triVerts,...tread.triVerts.map(i=>i+vertexCount)]),attribution,camera);
assert(data.glb.length<30000,'Keep the default bridge below 30 kB');

function geo(position) {
  const [x,y,z] = position;
  const k = 111320*Math.cos(anchor[1]*Math.PI/180);
  return [+(anchor[0]+x/k).toFixed(9),+(anchor[1]-z/111320).toFixed(9),+(y+bottom).toFixed(3)];
}
const footprintStations = stations.filter(s=>s<=125);
const ring = [...footprintStations.map(s=>geo(point(s,-halfWidth(s)-.1,bottom)).slice(0,2)),
  ...footprintStations.slice().reverse().map(s=>geo(point(s,halfWidth(s)+.1,bottom)).slice(0,2))];
// Include the independent Roman gateway and its landing in the replacement envelope.
ring.splice(footprintStations.length,0,...[point(125,-5.7,bottom),point(128.43,-5.7,bottom),
  point(128.43,4.1,bottom),point(125,4.1,bottom)].map(p=>geo(p).slice(0,2)));
ring.push(ring[0]);
const axis = stations.map(s=>geo(point(s,0,level(s))));
const feature = {type:'Feature',id,bbox:[Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),
  Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))],geometry:{type:'Polygon',coordinates:[ring]},
  properties:{name:'Pont del Diable de Martorell',place:'Martorell / Castellbisbal, Spain',
    city:'Martorell / Castellbisbal',country:'Spain',aliases:['Pont de Sant Bartomeu','Martorell Devil’s Bridge'],
    revision:'r1',kind:'bridge',geometryType:'road',anchor,height:+(data.max[1]-data.min[1]).toFixed(3),
    mesh:path+'print.glb',thumbnail:path+'thumbnail.webp',byteLength:data.glb.length,
    license:'CC-BY-4.0',spatialDataLicense:'CC-BY-4.0; ODbL-1.0',attribution,sources:survey.sources,
    bridge:{anchorElevation:bottom,verticalDatum:'EGM08D595',ref:'Pont del Diable',roadClass:'path',
      sourceFeatureIds:survey.routeFeatureIds,supportFeatureIds:['1335097115','1335097116'],
      width:4,depth:.25,length,spans:[2,length-4,2],axis,
      deckRows:stations.map(s=>[geo(point(s,-halfWidth(s)+wall-.04,level(s))),geo(point(s,halfWidth(s)-wall+.04,level(s)))]),
      pylonIndexCount:stone.triVerts.length,upperIndexCount:stone.triVerts.length,
      stayDiameter:wall,pierSection:{along:1.1,across:1.1},maxPierAdjustment:.2}}};
await writeFile(new URL('print.glb',directory),data.glb);
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(feature,null,2)+'\n');
console.log({bytes:data.glb.length,vertices:data.vertices,triangles:data.triangles,bounds:[data.min,data.max]});
