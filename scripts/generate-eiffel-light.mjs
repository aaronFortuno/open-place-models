import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const api = await ManifoldModule();
api.setup();
const catalogue = JSON.parse(await readFile(new URL('../catalog.geojson', import.meta.url), 'utf8'));
const { height } = catalogue.features.find(feature => feature.id === 'eiffel-tower').properties;
const output = new URL('../models/eiffel-tower/r2/print.glb', import.meta.url);
const sourcePage = 'https://commons.wikimedia.org/wiki/File:EiffelTower_fixed.stl';
const operator = 'https://www.toureiffel.paris/fr/le-monument/chiffres-cle';
const registration = 'https://open-landmarks.benmaps.fr/assets/eiffel-tower/4e011f6dced3b66b9599894f5e689977b06694c5d678a09872892d7f72e9a7d1/asset.json';
const attribution = 'Newcandle from Thingiverse (source profiles). Open Landmarks contributors (geographic registration). Open Place Models contributors (lightweight reconstruction). Footprint and placement © OpenStreetMap contributors.';

// Transverse envelopes sampled from the registered source, smoothed into a
// few stations. The deck heights and ground span use the operator's dimensions.
const lowerLeg = [
  [0, 62.5, 25], [3, 62.5, 25], [4, 60.4, 22.8], [12, 56.3, 20.2],
  [24, 50.7, 18.1], [36, 45.1, 16.5], [48, 39.5, 15.6], [57.6, 35.2, 15.2],
  [69, 30.4, 12.2], [84, 25.9, 11.0], [99, 21.9, 10.0], [116, 17.8, 9.5],
];
const upperLeg = [
  [115, 17.9, 6.5], [136, 14.7, 5.8], [158, 12, 5.1], [180, 9.8, 4.9],
  [203, 8.2, 4.8], [225, 7.1, 4.7], [237, 6.6, 4.7],
];
const body = [
  [235.5, 6.8], [258, 6.05], [270, 5.7], [274, 7.1], [276.1, 8.2], [279, 8.2],
  [281, 6.7], [285, 5.8], [293, 5.4], [298, 4.7], [303, 3.7], [309, 2.6],
  [318, 2.2], [328.5, 2.0], [height, 1.5],
];

function square(y, x0, z0, x1, z1) {
  return [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]];
}

function signedVolume(points, faces) {
  let volume = 0;
  for (let index = 0; index < faces.length; index += 3) {
    const [[x, y, z], [u, v, w], [p, q, r]] = [points[faces[index]], points[faces[index + 1]], points[faces[index + 2]]];
    volume += (x * (v * r - w * q) + y * (w * p - u * r) + z * (u * q - v * p)) / 6;
  }
  return volume;
}

function loft(rings) {
  const points = rings.flat();
  const end = points.length - 4;
  const faces = [0, 2, 1, 0, 3, 2, end, end + 1, end + 2, end, end + 2, end + 3];
  for (let base = 0; base < end; base += 4) {
    for (let side = 0; side < 4; side++) {
      const a = base + side;
      const b = base + (side + 1) % 4;
      faces.push(a, b, b + 4, a, b + 4, a + 4);
    }
  }
  if (signedVolume(points, faces) < 0) faces.reverse();
  const solid = new api.Manifold(new api.Mesh({
    numProp: 3, vertProperties: Float32Array.from(points.flat()), triVerts: Uint32Array.from(faces),
  }));
  assert.equal(solid.status(), 'NoError', 'Component loft');
  return solid;
}

function leg(profile, xSign, zSign) {
  return loft(profile.map(([y, outer, width]) => {
    const x = [xSign * (outer - width), xSign * outer].sort((a, b) => a - b);
    const z = [zSign * (outer - width), zSign * outer].sort((a, b) => a - b);
    return square(y, x[0], z[0], x[1], z[1]);
  }));
}

function facePoint(x, y, z, side) {
  return [[x, y, z], [z, y, -x], [-x, y, -z], [-z, y, x]][side];
}

function arch(side) {
  // The ribs connect the splayed feet and draw back toward the first deck.
  // Their bands leave a broad opening below and a gap under the deck.
  const ring = (angle, radius, rise) => {
    const x = radius * Math.cos(angle);
    const y = 8.0 + rise * Math.sin(angle);
    const depth = 55.4 - (y - 8.0) * 0.463;
    return [[x, y, depth - 2.8], [x, y, depth + 2.8]];
  };
  const sections = Array.from({ length: 19 }, (_, i) => {
    const angle = Math.PI * i / 18;
    const [nearInner, farInner] = ring(angle, 39, 38);
    const [nearOuter, farOuter] = ring(angle, 46, 43);
    return [nearInner, nearOuter, farOuter, farInner].map(([x, y, z]) => facePoint(x, y, z, side));
  });
  return loft(sections);
}

const centred = profile => loft(profile.map(([y, half]) => square(y, -half, -half, half, half)));
const pieces = [];
for (const xSign of [-1, 1]) for (const zSign of [-1, 1]) {
  pieces.push(leg(lowerLeg, xSign, zSign), leg(upperLeg, xSign, zSign));
}
for (let side = 0; side < 4; side++) pieces.push(arch(side));
pieces.push(
  centred([[55, 36], [57.6, 36.8], [60.8, 36.8], [62.5, 33.1]]),
  centred([[112.8, 18.8], [115.7, 19.7], [120, 19.3], [122, 16.7]]),
  centred([[158, 12.2], [161.6, 12.2]]),
  centred([[202.2, 8.5], [205.5, 8.5]]),
  centred(body),
);

const tower = api.Manifold.union(pieces);
assert.equal(tower.status(), 'NoError', 'Combined tower');
const components = tower.decompose();
assert.equal(components.length, 1, 'Every structural part must be connected');
for (const component of components) component.delete();
const { vertProperties, triVerts: faces, mergeFromVert } = tower.getMesh();
tower.delete();
for (const piece of pieces) piece.delete();
assert.equal(mergeFromVert.length, 0, 'The print profile needs explicit topology');

// Open Landmarks' geographic registration, expressed in the GLB's axes.
const [east, north] = [0.6975986957550049, 0.7164886593818665];
const points = Array.from({ length: vertProperties.length / 3 }, (_, index) => {
  const [x, y, z] = vertProperties.subarray(index * 3, index * 3 + 3);
  return [east * x + north * z + 0.21368009080060688, y, -north * x + east * z + 0.11836828263270763].map(Math.fround);
});
assert(new Set(points.map(p => p.join(','))).size === points.length, 'No coincident print vertices');
const vertexLinks = Array.from({ length: points.length }, () => new Map());
for (let offset = 0; offset < faces.length; offset += 3) {
  const [a, b, c] = faces.subarray(offset, offset + 3);
  const [[x, y, z], [u, v, w], [p, q, r]] = [points[a], points[b], points[c]];
  const area = Math.hypot((v - y) * (r - z) - (w - z) * (q - y), (w - z) * (p - x) - (u - x) * (r - z), (u - x) * (q - y) - (v - y) * (p - x));
  assert(area > 0, 'Non-degenerate print triangle');
  for (const [from, to, opposite] of [[a, b, c], [b, c, a], [c, a, b]]) {
    assert(!vertexLinks[from].has(to), 'Consistent edge orientation');
    vertexLinks[from].set(to, opposite);
  }
}
for (const links of vertexLinks) {
  const start = links.keys().next().value;
  let current = start;
  const count = links.size;
  for (let step = 0; step < count; step++) {
    assert(links.has(current), 'One incident face ring per vertex');
    const previous = current;
    current = links.get(current);
    links.delete(previous);
  }
  assert.equal(current, start, 'Closed incident face ring');
}
const volume = signedVolume(points, faces);
assert(volume > 0, 'Positive signed volume');
const extrema = [0, 1, 2].map(axis => [Math.min(...points.map(p => p[axis])), Math.max(...points.map(p => p[axis]))]);
assert.deepEqual(extrema[1], [0, height]);

const vertexBytes = points.length * 12;
const binary = Buffer.alloc(vertexBytes + faces.length * 2);
points.forEach((point, index) => point.forEach((value, axis) => binary.writeFloatLE(value, index * 12 + axis * 4)));
faces.forEach((index, offset) => binary.writeUInt16LE(index, vertexBytes + offset * 2));
const gltf = {
  asset: { version: '2.0', generator: 'Open Place Models', copyright: attribution,
    extras: { license: 'CC-BY-SA-3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', sourcePage, operator, registration } },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  buffers: [{ byteLength: binary.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: vertexBytes, target: 34962 },
    { buffer: 0, byteOffset: vertexBytes, byteLength: faces.length * 2, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: points.length, type: 'VEC3', min: extrema.map(([min]) => min), max: extrema.map(([, max]) => max) },
    { bufferView: 1, componentType: 5123, count: faces.length, type: 'SCALAR' },
  ],
};
const json = Buffer.from(JSON.stringify(gltf));
const jsonBytes = Math.ceil(json.length / 4) * 4;
const binBytes = Math.ceil(binary.length / 4) * 4;
const glb = Buffer.alloc(28 + jsonBytes + binBytes);
glb.write('glTF');
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(jsonBytes, 12);
glb.write('JSON', 16);
glb.fill(0x20, 20, 20 + jsonBytes);
json.copy(glb, 20);
glb.writeUInt32LE(binBytes, 20 + jsonBytes);
glb.write('BIN\0', 24 + jsonBytes);
binary.copy(glb, 28 + jsonBytes);
assert(glb.length <= 30_000, 'Lightweight GLB budget');
await writeFile(output, glb);
console.log(`${points.length} vertices, ${faces.length / 3} triangles, ${glb.length} bytes, ${Math.round(volume)} m³ signed volume`);
