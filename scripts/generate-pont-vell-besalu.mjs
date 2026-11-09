import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {openSolids, printIndexedGlb} from './monument-solids.mjs';

const id = 'pont-vell-besalu';
const revision = 'r1';
const path = `models/${id}/${revision}/`;
const directory = new URL(`../${path}`, import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey.json', directory), 'utf8'));
const {Manifold, box, prism, plate, mesh} = await openSolids();
const {anchor, datum, bottom, alignment, arches, portals} = survey;
const attribution = 'Open Place Models contributors · ICGC · OpenStreetMap contributors';
const sources = [
  'https://upcommons.upc.edu/server/api/core/bitstreams/3d48908e-a783-43f4-a18a-64f7691f4c64/content#page=7',
  'https://besalu.cat/historia-de-la-vila/patrimoni/patrimoni-arquitectonic/',
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions',
  'https://www.openstreetmap.org/way/457496474',
  'https://www.openstreetmap.org/way/457496475',
  'https://www.openstreetmap.org/way/114648294',
];
const camera = [-.17, .38, 1];
const common = {place: 'Besalú, Spain', city: 'Besalú', country: 'Spain', revision, anchor,
  attribution, sources, license: 'CC-BY-4.0', spatialDataLicense: 'CC-BY-4.0; ODbL-1.0'};

function section(rows, station) {
  const hi = rows.findIndex(row => row[0] >= station);
  if (hi <= 0) return (hi === 0 ? rows[0] : rows.at(-1)).slice(1);
  const [s0, ...a] = rows[hi - 1], [s1, ...b] = rows[hi];
  return a.map((x, i) => x + (b[i] - x) * (station - s0) / (s1 - s0));
}

const legDirections = alignment.slice(1).map(([, x, z], i) => {
  const [, px, pz] = alignment[i];
  const length = Math.hypot(x - px, z - pz);
  return [(x - px) / length, (z - pz) / length];
});
function normal(station) {
  const next = alignment.findIndex(([s]) => s >= station);
  const i = Math.max(0, (next < 0 ? alignment.length - 1 : next) - 1);
  const [x, z] = legDirections[i];
  if (i + 1 < legDirections.length && alignment[i + 1][0] === station) {
    const [u, v] = legDirections[i + 1], dot = 1 + x * u + z * v;
    return [-(z + v) / dot, (x + u) / dot];
  }
  return [-z, x];
}

function point(station, offset, elevation = bottom) {
  const [x, z] = section(alignment, station), [nx, nz] = normal(station);
  return [x + nx * offset, elevation - bottom, z + nz * offset];
}
const value = (name, s) => section(survey[name], s)[0];
const stations = [...new Set(['alignment', 'floor', 'toe', 'width'].flatMap(key => survey[key].map(r => r[0])))].sort((a,b) => a-b);
const lo = s => -value('width', s) / 2, hi = s => value('width', s) / 2;
const floor = s => value('floor', s);
const thickness = .54;
const tread = s => floor(s) - .10;
function strip(rows, left, right, low, top) {
  const vertices = rows.flatMap(s => [point(s, left(s), low(s)), point(s, right(s), low(s)),
    point(s, right(s), top(s)), point(s, left(s), top(s))]).flat();
  const faces = [0, 1, 2, 0, 2, 3];
  for (let i = 0; i < rows.length - 1; i++) {
    for (let side = 0; side < 4; side++) {
      const a = 4 * i + side, b = 4 * i + (side + 1) % 4;
      faces.push(a, b + 4, b, a, a + 4, b + 4);
    }
  }
  const end = vertices.length / 3 - 4;
  faces.push(end, end + 2, end + 1, end, end + 3, end + 2);
  return mesh(vertices, faces);
}

function directionAt(station) {
  const [x,z] = normal(station);
  return Math.atan2(-x,z) * 180 / Math.PI;
}
function place(solid, station) {
  const [x,,z] = point(station, 0);
  return solid.rotate(0, -directionAt(station), 0).translate([x,0,z]);
}
function arch(start, span, rise, crown, z0, z1, pointed = false, underside = 127) {
  const half = span / 2, base = crown - rise - bottom;
  const radius = (half * half + rise * rise) / (2 * rise);
  const arch = Array.from({length: 13}, (_, i) => {
    const angle = Math.PI * i / 12;
    const x = half * Math.cos(angle);
    const profile = pointed ? rise * Math.pow(1 - Math.abs(x) / half, .55) :
      rise >= half ? rise * Math.sin(angle) : rise - radius + Math.sqrt(radius * radius - x * x);
    return [x, base + profile];
  });
  const cut = prism([[-half, underside - bottom], [half, underside - bottom], ...arch], z0, z1);
  return place(cut, start + half);
}

const barrelHoles = arches.map(({start, span, rise, crown}) => arch(start, span, rise, crown, -15, 15));
const fifth = arches.find(a => a.number === 5);
barrelHoles.push(arch(fifth.start, fifth.span, 4.95, 146.02, -8, -1.00, true));
barrelHoles.push(arch(27.6 + 1.85, 1.8, .86, 143.70, -6, 6, false, 139.82));
barrelHoles.push(arch(48.95 + 1.80, 1.8, .86, 143.78, -6, 6, false, 139.99));
const arcade = Manifold.difference([strip(stations, lo, hi, s => value('toe', s), tread), ...barrelHoles]);
const parapets = [
  strip(stations, lo, s => lo(s) + thickness, s => floor(s) - .30, s => floor(s) + 1.07),
  strip(stations, s => hi(s) - thickness, hi, s => floor(s) - .30, s => floor(s) + 1.07),
];
const paved = strip(stations, s => lo(s) + thickness - .04, s => hi(s) - thickness + .04, s => floor(s) - .24, floor);

function tower({station, depth, width, clear, top, shape}) {
  const half = depth / 2, wide = width / 2;
  const polygon = shape === 'square' ? [[-half,-wide],[half,-wide],[half,wide],[-half,wide]] :
    [[-half,-wide*.54],[0,-wide],[half,-wide*.54],[half,wide*.54],[0,wide],[-half,wide*.54]];
  const base = floor(station) - .48;
  const level = y => y - bottom;
  const body = plate(polygon, top - 1.25 - base).translate([0, level(base), 0]);
  const doorway = prism([
    [-clear/2, level(base - .25)], [clear/2, level(base - .25)],
    [clear/2, level(floor(station) + 2.90)], [clear*.36, level(floor(station) + 4.24)],
    [0, level(floor(station) + 5.36)], [-clear*.36, level(floor(station) + 4.24)],
    [-clear/2, level(floor(station) + 2.90)],
  ], -depth, depth).rotate(0, -90, 0);
  const crenels = polygon.flatMap(([x,z],i) => {
    const [u,v] = polygon[(i+1)%polygon.length];
    const length = Math.hypot(u-x,v-z), count = Math.max(1, Math.floor(length / 1.8));
    return Array.from({length:count},(_,j) => {
      const t = (j + .29) / count;
      return box(-.40,.40,level(top - 1.42),level(top),-.42,.42)
        .rotate(0,-Math.atan2(v-z,u-x)*180/Math.PI,0)
        .translate([x + (u-x)*t*.97 - x*.025,0,z + (v-z)*t*.97 - z*.025]);
    });
  });
  return place(Manifold.union([Manifold.difference(body,doorway), ...crenels]),station);
}

const stonework = Manifold.union([arcade, ...parapets, ...portals.map(tower)]);
assert.equal(stonework.decompose().length, 1);

function geo([x, y, z]) {
  const [lon,lat] = anchor, k = 111320 * Math.cos(lat * Math.PI/180);
  return [+(lon+x/k).toFixed(9), +(lat-z/111320).toFixed(9), +(y+bottom).toFixed(4)];
}
function geometry(positions) {
  const ring = positions.map(p => geo(p).slice(0,2));
  const xs = ring.map(p=>p[0]), ys = ring.map(p=>p[1]);
  return {bbox:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],
    geometry:{type:'Polygon',coordinates:[[...ring,ring[0]]]}};
}
const footprint = geometry([...stations.map(s=>point(s,hi(s)+.10)), ...stations.slice().reverse().map(s=>point(s,lo(s)-.10))]);
const feature = (id, footprint, properties) => ({type:'Feature', id, ...footprint, properties:{...common,...properties}});
const relative = (data, name) => ({mesh:path+name, byteLength:data.glb.length, height:+(data.max[1]-data.min[1]).toFixed(3)});
const bridgeMesh = stonework.getMesh(), floorMesh = paved.getMesh();
const vertexCount = bridgeMesh.vertProperties.length/3;
assert(vertexCount + floorMesh.vertProperties.length/3 <= 65536);
const positions = Float32Array.from([...bridgeMesh.vertProperties,...floorMesh.vertProperties]);
const indices = Uint16Array.from([...bridgeMesh.triVerts,...floorMesh.triVerts.map(i=>i+vertexCount)]);
const printBridge = printIndexedGlb(positions,indices,attribution,camera);
const axis = stations.map(s=>geo(point(s,0,floor(s))));
const length = axis.slice(1).reduce((n,[x,y],i)=>{
  return n+Math.hypot((x-axis[i][0])*111320*Math.cos(anchor[1]*Math.PI/180),(y-axis[i][1])*111320);
},0);
const bridge = feature(id,footprint,{kind:'bridge',geometryType:'road',name:'Pont Vell de Besalú',
  aliases:['Pont de Besalú','Pont Medieval de Besalú','Pont Romànic','Besalú Bridge'],
  thumbnail:path+'thumbnail.webp',...relative(printBridge,'print.glb'),
  bridge:{anchorElevation:bottom,verticalDatum:datum,ref:'Pont Vell de Besalú',roadClass:'path',
    sourceFeatureIds:survey.routeFeatureIds,supportBuildingIds:portals.flatMap(p=>p.replacement),
    width:3.4,depth:.25,length,spans:[2.4,length-4.8,2.4],axis,
    deckRows:stations.map(s=>[lo(s)+thickness-.04,hi(s)-thickness+.04].map(t=>geo(point(s,t,floor(s))))),
    pylonIndexCount:bridgeMesh.triVerts.length,upperIndexCount:bridgeMesh.triVerts.length,
    stayDiameter:.54,pierSection:{along:1.1,across:1.1},maxPierAdjustment:.2}});

await writeFile(new URL('print.glb',directory),printBridge.glb);
if (process.argv[2]) await writeFile(process.argv[2],JSON.stringify(bridge,null,2)+'\n');
console.log({bytes:printBridge.glb.length,triangles:printBridge.triangles,vertices:printBridge.vertices});
