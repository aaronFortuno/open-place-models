import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../models/great-pyramid-giza/r1/', import.meta.url);
const { measurements, registration, courseLevelsInches, osm } =
  JSON.parse(await readFile(new URL('measurements.json', directory), 'utf8'));
const id = 'great-pyramid-giza';
const attribution = 'Open Place Models contributors (reconstruction), after measurements by W. M. F. Petrie, Georges Goyon and AERA/Glen Dash Foundation. Reference footprint © OpenStreetMap contributors (ODbL 1.0).';
const sources = [
  'https://petrieproject.com/book/the-pyramids-and-temples-of-gizeh',
  'https://www.ronaldbirdsall.com/gizeh/petrie/photo/plate8.html',
  'https://www.ifao.egnet.net/bifao/078/23',
  'https://aeraweb.org/wp-content/uploads/2022/08/aeragram16_2.pdf',
  'https://aeraweb.org/wp-content/uploads/2022/08/aeragram19_1.pdf',
  'https://egymonuments.gov.eg/monuments/the-great-pyramid/',
  'https://www.openstreetmap.org/way/4420397',
];

const inch = 0.0254;
const { baseSideMetres, axisBearingDegreesTrue, coreCornerInsetInches, northRecessInches,
  summitTerraceOffsetsInchesNorthEastSouthWest, summitRemnantRiseMetres,
  summitRemnantVolumeEstimateCubicMetres } = measurements;
const levels = [0, ...courseLevelsInches.values.map(([course, northeast, southwest], i) => {
  assert.equal(course, i + 1);
  return (northeast + southwest) / 2 * inch;
})];
assert(levels.every((level, i) => !i || level > levels[i - 1]));
const terraceHeight = levels.at(-1);
const [north, east, south, west] = summitTerraceOffsetsInchesNorthEastSouthWest.map(value => value * inch);
const bearing = axisBearingDegreesTrue * Math.PI / 180;
const halfBase = baseSideMetres / 2;
const halfCore = halfBase - coreCornerInsetInches * inch;

// Coordinates are east and south in the pyramid's aligned frame. The north
// midline adds one broad concavity where Petrie estimated a measured recess.
function section(w, n, e, s, recess = 0) {
  return [[w, n], [(w + e) / 2, n + recess], [e, n], [e, s], [w, s]];
}

function profile(height) {
  const fraction = (height - levels[1]) / (terraceHeight - levels[1]);
  const lerp = (base, summit) => base + (summit - base) * fraction;
  return section(lerp(-halfCore, -west), lerp(-halfCore, -north), lerp(halfCore, east),
    lerp(halfCore, south), northRecessInches * inch * (1 - fraction));
}

const positions = [];
const indices = [];
const count = 5;

function addRing(outline, height) {
  const previous = positions.length / 3 - count;
  for (const [x, z] of outline) {
    positions.push(x * Math.cos(bearing) - z * Math.sin(bearing), height,
      x * Math.sin(bearing) + z * Math.cos(bearing));
  }
  if (previous < 0) return;
  for (let i = 0; i < count; i++) {
    const a = previous + i;
    const b = previous + (i + 1) % count;
    indices.push(a, a + count, b + count, a, b + count, b);
  }
}

function cap(start, top) {
  // The southeast vertex can see the entire polygon including the recessed edge.
  for (const [a, b] of [[4, 0], [0, 1], [1, 2]]) {
    indices.push(start + 3, start + (top ? b : a), start + (top ? a : b));
  }
}

const base = section(-halfBase, -halfBase, halfBase, halfBase);
addRing(base, 0);
cap(0, false);
addRing(base, levels[1]);

// Keep the larger lower courses distinct. Three measured courses normally
// share one printable band above them. Course 35 starts a marked thickness cycle.
const bandEnds = [1, 2, 3, 4, 5, 6, 7, 8];
for (let course = 11; course <= 32; course += 3) bandEnds.push(course);
bandEnds.push(34, 35);
for (let course = 38; course <= 197; course += 3) bandEnds.push(course);
bandEnds.push(201);
assert.equal(bandEnds.at(-1), levels.length - 1);
for (let i = 1; i < bandEnds.length; i++) {
  const lower = levels[bandEnds[i - 1]];
  const upper = levels[bandEnds[i]];
  addRing(profile(lower), lower);
  addRing(profile(lower + (upper - lower) * 0.18), upper);
}
addRing(profile(terraceHeight), terraceHeight);

// Goyon measured the rise and estimated the volume of the tallest surviving
// block. Represent the central remnant by one modest tapered mass.
const halfRemnant = Math.sqrt(summitRemnantVolumeEstimateCubicMetres / summitRemnantRiseMetres) / 2;
addRing(section(-halfRemnant * 1.2, -halfRemnant * 1.2, halfRemnant * 1.2, halfRemnant * 1.2), terraceHeight);
const height = Math.round((terraceHeight + summitRemnantRiseMetres) * 1000) / 1000;
addRing(section(-halfRemnant * 0.8, -halfRemnant * 0.8, halfRemnant * 0.8, halfRemnant * 0.8), height);
cap(positions.length / 3 - count, true);

const coordinates = Float32Array.from(positions);
const bounds = [0, 1, 2].map(axis => {
  const values = coordinates.filter((_, i) => i % 3 === axis);
  return [Math.min(...values), Math.max(...values)];
});
assert(coordinates.length / 3 < 65536);
const vertexBytes = Buffer.from(coordinates.buffer);
const indexBytes = Buffer.from(Uint16Array.from(indices).buffer);
const binary = Buffer.concat([vertexBytes, indexBytes]);
const gltf = {
  asset: { version: '2.0', generator: 'Open Place Models', copyright: attribution, extras: { license: 'CC-BY-4.0', sources } },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  buffers: [{ byteLength: binary.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: vertexBytes.length, target: 34962 },
    { buffer: 0, byteOffset: vertexBytes.length, byteLength: indexBytes.length, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: coordinates.length / 3, type: 'VEC3',
      min: bounds.map(pair => pair[0]), max: bounds.map(pair => pair[1]) },
    { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
  ],
};
const json = Buffer.from(JSON.stringify(gltf));
const jsonSize = Math.ceil(json.length / 4) * 4;
const binarySize = Math.ceil(binary.length / 4) * 4;
const glb = Buffer.alloc(28 + jsonSize + binarySize);
glb.write('glTF');
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(jsonSize, 12);
glb.write('JSON', 16);
glb.fill(0x20, 20, 20 + jsonSize);
json.copy(glb, 20);
glb.writeUInt32LE(binarySize, 20 + jsonSize);
glb.write('BIN\0', 24 + jsonSize);
binary.copy(glb, 28 + jsonSize);
await writeFile(new URL('print.glb', directory), glb);

// Use the measured-base envelope for terrain contact and selection. OSM's
// mapped outline is narrower and is retained in measurements.json for comparison.
const [longitude, latitude] = registration.wgs84Anchor;
const radians = latitude * Math.PI / 180;
const a = 6378137;
const eccentricitySquared = 6.6943799901413165e-3;
const d = 1 - eccentricitySquared * Math.sin(radians) ** 2;
const metresPerDegreeEast = Math.PI / 180 * a * Math.cos(radians) / Math.sqrt(d);
const metresPerDegreeNorth = Math.PI / 180 * a * (1 - eccentricitySquared) / d ** 1.5;
const ring = [0, 4, 3, 2, 0].map(i => [
  Number((longitude + coordinates[3 * i] / metresPerDegreeEast).toFixed(9)),
  Number((latitude - coordinates[3 * i + 2] / metresPerDegreeNorth).toFixed(9)),
]);
const columns = [0, 1].map(axis => ring.map(point => point[axis]));
const bbox = [...columns.map(column => Math.min(...column)), ...columns.map(column => Math.max(...column))];
const entry = {
  type: 'Feature', id, bbox, geometry: { type: 'Polygon', coordinates: [ring] },
  properties: {
    name: 'Great Pyramid of Giza', place: 'Giza, Egypt', geometryType: 'monument', country: 'Egypt', city: 'Giza',
    aliases: ['Pyramid of Khufu', 'Pyramid of Cheops', 'Gran Piràmide de Guiza', 'Gran Pirámide de Guiza',
      'Pirámide de Keops', 'Pyramide de Khéops', 'هرم خوفو', 'الهرم الأكبر'],
    revision: 'r1', anchor: registration.wgs84Anchor, height, mesh: `models/${id}/r1/print.glb`,
    byteLength: glb.length, terrainBaseElevation: measurements.terrainBaseElevation,
    license: 'CC-BY-4.0', attribution,
    replacement: { featureIds: [`osm-way-${osm.way}`] },
    sources,
  },
};
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(entry, null, 2) + '\n');
console.log(JSON.stringify({
  bytes: glb.length, triangles: indices.length / 3, vertices: positions.length / 3,
  bands: bandEnds.length, height, terraceHeight, bounds, anchor: registration.wgs84Anchor,
}));
