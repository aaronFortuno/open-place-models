import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const directory = new URL('../models/leaning-tower-pisa/r1/', import.meta.url);
const dimensions = JSON.parse(await readFile(new URL('dimensions.json', directory), 'utf8'));
const api = await ManifoldModule();
api.setup();

const attribution = 'Open Place Models contributors (original reconstruction). Dimensions from Opera della Primaziale Pisana and published technical surveys.';
const sources = [
  'https://www.opapisa.it/visita/torre-pendente/',
  'https://www.isprs.org/proceedings/xxxiv/5-W12/proceedings/04.pdf',
  'https://academic.oup.com/jge/article/11/5/055004/5110272',
];
const points = [];
const faces = [];
const loops = [];
const { height, loggiaFloorElevations, loggiaColumns, loggiaRimRadii, loggiaCoreRadii } = dimensions;
const bearing = dimensions.leanAzimuth * Math.PI / 180;
const leanEast = Math.sin(bearing);
const leanSouth = -Math.cos(bearing);
const correction = dimensions.approximateSubsequentNorthwardRotationArcSeconds * Math.PI / (180 * 3600);
const axis = [
  [0, 0], [loggiaFloorElevations[0], dimensions.firstLoggiaSouthOffset],
  ...dimensions.surveyOffsets.map(([level, offset]) => [level, offset - level * Math.tan(correction)]),
  [dimensions.belfryTopCentreElevation, dimensions.belfryTopSouthOffset],
];

function centreOffset(y) {
  const index = Math.max(1, axis.findIndex(([level]) => level >= y));
  const [bottom, start] = axis[index - 1];
  const [top, end] = axis[index];
  return start + (end - start) * (y - bottom) / (top - bottom);
}

function ring(y, radius, count, tilt, pattern = [[0, 0, 0]]) {
  const positions = [];
  const first = points.length;
  const lean = centreOffset(y);
  const slope = Math.sin(tilt * Math.PI / 180);
  const projection = Math.cos(tilt * Math.PI / 180) - 1;
  for (let bay = 0; bay < count; bay++) {
    for (const [phase, inset, rise] of pattern) {
      const fraction = (bay + phase) / count;
      const angle = (fraction + 0.25) * 2 * Math.PI;
      const east = (radius - inset) * Math.cos(angle);
      const south = (radius - inset) * Math.sin(angle);
      const along = east * leanEast + south * leanSouth;
      const offset = lean + along * projection;
      points.push([east + offset * leanEast, y + rise - along * slope, south + offset * leanSouth]);
      positions.push(fraction);
    }
  }
  loops.push({ first, positions });
}

// The lowest order has blind arches. Keep the narrow plinth and reproduce
// the rhythm as a shallow recess in its solid outer wall.
const blind = dimensions.baseBlindArches;
ring(0, 7.75, 30, 0);
ring(0.54, 7.75, 30, 0);
ring(1.28, 7.52, 30, 2.1);
ring(2.45, 7.54, blind, 4.9, [[0, 0, 0], [0.46, 0.44, 0], [0.77, 0, 0]]);
ring(7.5, 7.52, blind, 4.95, [[0, 0, 0], [0.46, 0.46, 1.03], [0.77, 0, 0]]);
ring(10.93, 7.73, 30, 4.99);

for (const [index, y] of loggiaFloorElevations.entries()) {
  const radius = loggiaRimRadii[index];
  const inset = radius - loggiaCoreRadii[index] - 0.42;
  const tilt = [4.99, 5.09, 5.24, 4.96, 4.73, 4.23][index];
  ring(y - 0.22, radius, loggiaColumns, tilt);
  ring(y + 0.20, radius, loggiaColumns, tilt);
  ring(y + 0.56, radius - 0.25, loggiaColumns, tilt, [[0, 0, 0], [0.44, inset, 0], [0.80, 0, 0]]);
  ring(y + 4.33, radius - 0.23, loggiaColumns, tilt, [
    [0, 0, 0], [0.20, inset * 0.88, 0.52], [0.44, inset, 0.70], [0.64, inset * 0.88, 0.52], [0.80, 0, 0],
  ]);
}

const topCornice = dimensions.topCorniceElevation;
ring(topCornice - 0.32, 8.23, 30, 4.21);
ring(topCornice + 0.20, 8.28, 30, 4.21);
ring(topCornice + 0.88, 7.70, 30, 4.10);
ring(topCornice + 1.16, 6.11, 30, 3.99);
ring(topCornice + 1.56, 6.02, 24, 3.96);
ring(53.64, 5.85, 24, 3.94);
ring(54.25, 6.03, 24, 3.94);
ring(55.95, 6.06, 24, 3.94);
const topCentre = dimensions.belfryTopCentreElevation;
const topRadius = dimensions.belfryTopRadius;
const topTilt = Math.asin((height - topCentre) / topRadius) * 180 / Math.PI;
ring(topCentre, topRadius, 24, topTilt);
ring(topCentre - 0.13, 4.52, 24, topTilt);
ring(49.1, 4.30, 24, 3.94);

// Stitch angular loops of different resolutions without introducing vertices
// where the cornices need only a smooth circular outline.
for (let layer = 0; layer < loops.length - 1; layer++) {
  const lower = loops[layer];
  const upper = loops[layer + 1];
  const m = lower.positions.length;
  const n = upper.positions.length;
  let i = 0;
  let j = 0;
  while (i < m || j < n) {
    const a = lower.first + i % m;
    const b = upper.first + j % n;
    const nextLower = i + 1 === m ? 1 : lower.positions[i + 1] ?? Infinity;
    const nextUpper = j + 1 === n ? 1 : upper.positions[j + 1] ?? Infinity;
    if (nextUpper <= nextLower) {
      j++;
      faces.push(a, b, upper.first + j % n);
    } else {
      i++;
      faces.push(a, b, lower.first + i % m);
    }
  }
}
const first = loops[0];
const last = loops.at(-1);
for (let i = 1; i < first.positions.length - 1; i++) faces.push(first.first, first.first + i, first.first + i + 1);
for (let i = 1; i < last.positions.length - 1; i++) faces.push(last.first, last.first + i + 1, last.first + i);

function manifold(vertices, triangles) {
  return new api.Manifold(new api.Mesh({
    numProp: 3, vertProperties: Float32Array.from(vertices), triVerts: Uint32Array.from(triangles),
  }));
}

const body = manifold(points.flat(), faces);
assert.equal(body.status(), 'NoError', 'Oriented tower envelope');
const openings = [];
for (let i = 0; i < dimensions.belfryMainOpenings; i++) {
  const angle = Math.PI / 9 + i * 2 * Math.PI / dimensions.belfryMainOpenings;
  const width = 1.08;
  const spring = 52.28;
  const section = api.CrossSection.ofPolygons([[[-width, 49.42], [width, 49.42], ...Array.from({ length: 7 }, (_, j) => {
    const angle = Math.PI * j / 6;
    return [width * Math.cos(angle), spring + width * Math.sin(angle)];
  })]], 'NonZero');
  const extruded = section.extrude(3.65);
  const u = Math.cos(angle);
  const v = Math.sin(angle);
  openings.push(extruded.transform([
    v, 0, -u, 0,
    0, 1, 0, 0,
    u, 0, v, 0,
    3.26 * u, 0, centreOffset(51.0) + 3.26 * v, 1,
  ]));
  section.delete();
  extruded.delete();
}

const cut = api.Manifold.difference([body, ...openings]);
assert.equal(cut.status(), 'NoError', 'Open belfry');
for (const piece of [body, ...openings]) piece.delete();
const final = cut.setTolerance(0.001);
cut.delete();
const components = final.decompose();
assert.equal(components.length, 1, 'One connected print component');
for (const component of components) component.delete();
assert.equal(final.genus(), dimensions.belfryMainOpenings, 'All six bell openings are open into the chamber');
const mesh = final.getMesh();
const manifoldVolume = final.volume();
final.delete();
assert.equal(mesh.mergeFromVert.length, 0);

const vertices = Array.from({ length: mesh.vertProperties.length / 3 }, (_, i) => Array.from(mesh.vertProperties.subarray(3 * i, 3 * i + 3)));
const triangles = mesh.triVerts;
const vertexLinks = Array.from({ length: vertices.length }, () => new Map());
let volume = 0;
for (let i = 0; i < triangles.length; i += 3) {
  const [a, b, c] = triangles.subarray(i, i + 3);
  const [[x, y, z], [u, v, w], [p, q, r]] = [vertices[a], vertices[b], vertices[c]];
  const area = Math.hypot((v - y) * (r - z) - (w - z) * (q - y), (w - z) * (p - x) - (u - x) * (r - z), (u - x) * (q - y) - (v - y) * (p - x));
  assert(area > 0, 'Non-degenerate triangle');
  volume += (x * (v * r - w * q) + y * (w * p - u * r) + z * (u * q - v * p)) / 6;
  for (const [from, to, next] of [[a, b, c], [b, c, a], [c, a, b]]) {
    assert(!vertexLinks[from].has(to), 'Consistent edge orientation');
    vertexLinks[from].set(to, next);
  }
}
for (const links of vertexLinks) {
  const start = links.keys().next().value;
  let cursor = start;
  const size = links.size;
  for (let i = 0; i < size; i++) {
    assert(links.has(cursor), 'One incident face ring per vertex');
    const previous = cursor;
    cursor = links.get(cursor);
    links.delete(previous);
  }
  assert.equal(cursor, start, 'Closed incident face ring');
}
assert(volume > 0 && Math.abs(volume - manifoldVolume) < volume * 1e-7, 'Positive signed volume');
assert.equal(new Set(vertices.map(point => point.join(','))).size, vertices.length, 'Unique vertex positions');
assert(vertices.length < 65536);
const extrema = [0, 1, 2].map(axis => [Math.min(...vertices.map(p => p[axis])), Math.max(...vertices.map(p => p[axis]))]);
assert.deepEqual(extrema[1], [0, Math.fround(height)]);

const vertexBytes = vertices.length * 12;
const indexBytes = triangles.length * 2;
const binary = Buffer.alloc(vertexBytes + indexBytes);
vertices.forEach((point, index) => point.forEach((value, axis) => binary.writeFloatLE(value, index * 12 + axis * 4)));
triangles.forEach((index, offset) => binary.writeUInt16LE(index, vertexBytes + offset * 2));
const gltf = {
  asset: { version: '2.0', generator: 'Open Place Models', copyright: attribution, extras: { license: 'CC-BY-4.0', sources } },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  buffers: [{ byteLength: binary.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: vertexBytes, target: 34962 },
    { buffer: 0, byteOffset: vertexBytes, byteLength: indexBytes, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: vertices.length, type: 'VEC3', min: extrema.map(([min]) => min), max: extrema.map(([, max]) => max) },
    { bufferView: 1, componentType: 5123, count: triangles.length, type: 'SCALAR' },
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
console.log(`${vertices.length} vertices, ${triangles.length / 3} triangles, ${glb.length} bytes, ${volume.toFixed(2)} m³ signed volume`);
console.log('Extent (east, up, south):', extrema);
console.log('Axis stations (height, south):', axis);
