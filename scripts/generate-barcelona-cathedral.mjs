import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const directory = new URL('../models/barcelona-cathedral/r1/', import.meta.url);
const layout = JSON.parse(await readFile(new URL('municipal-layout.json', directory), 'utf8'));
const api = await ManifoldModule();
api.setup();
const parts = new Map(layout.parts.map(part => [part.handle, part]));
const deckHeights = { '17B163': 28, '17F1C8': 39, '18171B': 34, '187CC4': 33, '1824C2': 47.5, '1989E3': 47.5 };
const pieces = [];

function extrude(rings, bottom, height, taper = [1, 1]) {
  const section = api.CrossSection.ofPolygons(rings, 'NonZero');
  const extrusion = section.extrude(height, 0, 0, taper);
  section.delete();
  const solid = extrusion.translate(0, 0, bottom);
  extrusion.delete();
  return solid;
}

pieces.push(extrude(layout.base.flat(), 0, 0.4));
for (const part of parts.values()) {
  const top = deckHeights[part.handle] ?? part.roof - layout.referenceGround;
  pieces.push(extrude(part.polygons.flat(), 0.2, top - 0.2));
}

function crown(handle, levels) {
  const { centre: [cx, cy], profile } = parts.get(handle);
  const size = profile.length;
  const vertices = [];
  const faces = [];
  for (const [height, scale] of levels) for (const [x, y] of profile) {
    vertices.push(cx + (x - cx) * scale, cy + (y - cy) * scale, height);
  }
  const end = (levels.length - 1) * size;
  for (let k = 1; k < size - 1; k++) faces.push(0, k + 1, k, end, end + k, end + k + 1);
  for (let start = 0; start < end; start += size) for (let side = 0; side < size; side++) {
    const a = start + side;
    const b = start + (side + 1) % size;
    faces.push(a, b, b + size, a, b + size, a + size);
  }
  const solid = new api.Manifold(new api.Mesh({ numProp: 3, vertProperties: Float32Array.from(vertices), triVerts: Uint32Array.from(faces) }));
  assert.equal(solid.status(), 'NoError', `Crown ${handle}`);
  pieces.push(solid);
}

// The DWG stops at flat roof elevations. Shape the upper stages using the
// operator's dimensions, the orthophoto and the separate mapped footprints.
crown('17F1C8', [[37, 1], [40, 1.04], [42, 1], [47, 0.92], [49, 0.86], [52, 0.62], [57, 0.47], [62, 0.27], [66.5, 0.12]]);
crown('18171B', [[33, 1], [36, 1], [37.2, 1.07], [39.4, 0.78], [42.5, 0.56], [46.9, 0.22]]);
crown('187CC4', [[32, 1], [34.8, 1.04], [36, 0.84], [38.5, 0.68], [42.9, 0.23]]);
for (const handle of ['1824C2', '1989E3']) {
  crown(handle, [[45.9, 1], [48.3, 1.05], [49, 1.04], [51, 0.92], [52.2, 0.77], [52.7, 0.68], [54, 0.32]]);
}

const [westPinnacle, eastPinnacle] = ['187CC4', '18171B'].map(id => parts.get(id).centre);
const direction = eastPinnacle.map((value, index) => value - westPinnacle[index]);
const [acrossX, acrossY] = direction.map(value => value / Math.hypot(...direction));
const [frontX, frontY] = westPinnacle.map((value, index) => (value + eastPinnacle[index]) / 2);

function frontVolume(profile, start, depth) {
  const prism = extrude([profile], start, depth);
  const inPlace = prism.transform([
    acrossX, acrossY, 0, 0,
    0, 0, 1, 0,
    acrossY, -acrossX, 0, 0,
    frontX, frontY, 0, 1,
  ]);
  prism.delete();
  return inPlace;
}

pieces.push(frontVolume([[-13, 0], [13, 0], [13, 23], [9.4, 23], [9.4, 27.5], [0, 36], [-9.4, 27.5], [-9.4, 23], [-13, 23]], -3.9, 8));
const [crossX, crossY] = parts.get('17F1C8').centre;
function box(size, centre) {
  const primitive = api.Manifold.cube(size, true);
  const positioned = primitive.translate(centre);
  primitive.delete();
  return positioned;
}
pieces.push(box([1.35, 1.35, 4.6], [crossX, crossY, 67.7]), box([3.3, 1.1, 1.1], [crossX, crossY, 68.4]));

// The tile strips on two cloister galleries are low hips. The central nave
// remains a terrace, as shown in the territorial orthophoto.
for (const handle of ['197AD4', '186EB4']) {
  const { roofRectangle, polygons, roof } = parts.get(handle);
  const sides = roofRectangle.map((p, i) => roofRectangle[(i + 1) % 4].map((v, j) => v - p[j]));
  const long = sides.reduce((a, b) => Math.hypot(...a) > Math.hypot(...b) ? a : b);
  const [u, v] = long.map(value => value / Math.hypot(...long));
  const [cx, cy] = roofRectangle.reduce(([x, y], [a, b]) => [x + a / 4, y + b / 4], [0, 0]);
  const rings = polygons.flat().map(ring => ring.map(([x, y]) => [u * (x - cx) + v * (y - cy), -v * (x - cx) + u * (y - cy)]));
  const slope = extrude(rings, roof - layout.referenceGround - 0.05, 1.75, [0.8, 0.22]);
  pieces.push(slope.transform([u, v, 0, 0, -v, u, 0, 0, 0, 0, 1, 0, cx, cy, 0, 1]));
  slope.delete();
}

const mass = api.Manifold.union(pieces);
for (const piece of pieces) piece.delete();
const portal = frontVolume([[-2.85, 0.9], [2.85, 0.9], [2.85, 7.5], [2.15, 10], [0, 12.1], [-2.15, 10], [-2.85, 7.5]], -4.45, 1.75);
const rose = frontVolume(Array.from({ length: 16 }, (_, i) => {
  const angle = 2 * Math.PI * i / 16;
  return [3.25 * Math.cos(angle), 21.6 + 3.25 * Math.sin(angle)];
}), -4.45, 1.4);
const cathedral = api.Manifold.difference([mass, portal, rose]);
for (const solid of [mass, portal, rose]) solid.delete();
assert.equal(cathedral.status(), 'NoError', 'Combined cathedral');
const components = cathedral.decompose();
// Adjacent CAD prisms share coplanar boundaries. Drop any zero-volume shells
// produced by the Boolean, and reject additional actual solids or cavities.
const substantial = components.filter(component => Math.abs(component.volume()) > 1e-6);
assert.equal(substantial.length, 1, 'One connected cathedral and cloister');
const [main] = substantial;
const courtyard = main.slice(1);
assert(courtyard.numContour() >= 2, 'The cloister courtyard remains open');
courtyard.delete();
const cleaned = main.simplify(0.01);
const { vertProperties, triVerts, mergeFromVert } = cleaned.getMesh();
cleaned.delete();
for (const component of components) component.delete();
cathedral.delete();
assert.equal(mergeFromVert.length, 0);

const [[eastX, northX], [eastY, northY]] = layout.gridToENU;
const registered = Array.from({ length: vertProperties.length / 3 }, (_, index) => {
  const [x, y, height] = vertProperties.subarray(index * 3, index * 3 + 3);
  return [x * eastX + y * eastY, height, -(x * northX + y * northY)].map(Math.fround);
});
// Float32 can coalesce the endpoints of a submillimetre edge from the CAD
// Booleans. Canonicalise at the precision of the exported format.
const printSolid = new api.Manifold(new api.Mesh({ numProp: 3, vertProperties: Float32Array.from(registered.flat()), triVerts }));
assert.equal(printSolid.status(), 'NoError', 'Registered print solid');
const preciseSolid = printSolid.setTolerance(0.001);
const printMesh = preciseSolid.getMesh();
preciseSolid.delete();
printSolid.delete();
assert.equal(printMesh.mergeFromVert.length, 0);
const faces = printMesh.triVerts;
const count = printMesh.vertProperties.length / 3;
const points = Array.from({ length: count }, (_, index) => Array.from(printMesh.vertProperties.subarray(index * 3, index * 3 + 3)));
const vertexLinks = Array.from({ length: count }, () => new Map());
let volume = 0;
for (let i = 0; i < faces.length; i += 3) {
  const [a, b, c] = faces.subarray(i, i + 3);
  const [[x, y, z], [u, v, w], [p, q, r]] = [points[a], points[b], points[c]];
  const area = Math.hypot((v - y) * (r - z) - (w - z) * (q - y), (w - z) * (p - x) - (u - x) * (r - z), (u - x) * (q - y) - (v - y) * (p - x));
  assert(area > 0, `Non-degenerate print triangle ${JSON.stringify([points[a], points[b], points[c]])}`);
  volume += (x * (v * r - w * q) + y * (w * p - u * r) + z * (u * q - v * p)) / 6;
  for (const [from, to, opposite] of [[a, b, c], [b, c, a], [c, a, b]]) {
    assert(!vertexLinks[from].has(to), 'Consistent edge orientation');
    vertexLinks[from].set(to, opposite);
  }
}
for (const links of vertexLinks) {
  const start = links.keys().next().value;
  let current = start;
  const size = links.size;
  for (let i = 0; i < size; i++) {
    assert(links.has(current), 'One incident face ring per vertex');
    const previous = current;
    current = links.get(current);
    links.delete(previous);
  }
  assert.equal(current, start, 'Closed incident face ring');
}
assert(volume > 0, 'Positive signed volume');
const extrema = [0, 1, 2].map(axis => [Math.min(...points.map(p => p[axis])), Math.max(...points.map(p => p[axis]))]);
assert.deepEqual(extrema[1], [0, 70]);

const vertexBytes = count * 12;
const binary = Buffer.alloc(vertexBytes + faces.length * 2);
points.forEach((point, index) => point.forEach((value, axis) => binary.writeFloatLE(value, index * 12 + axis * 4)));
faces.forEach((index, offset) => binary.writeUInt16LE(index, vertexBytes + offset * 2));
const gltf = {
  asset: {
    version: '2.0', generator: 'Open Place Models',
    copyright: 'Ajuntament de Barcelona (municipal CAD geometry). Open Place Models contributors (reconstruction). Footprint © OpenStreetMap contributors.',
    extras: { license: 'CC-BY-4.0', source: 'https://portaldades.ajuntament.barcelona.cat/mapes/146' },
  },
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
    { bufferView: 0, componentType: 5126, count, type: 'VEC3', min: extrema.map(([min]) => min), max: extrema.map(([, max]) => max) },
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
await writeFile(new URL('print.glb', directory), glb);
console.log(`${count} vertices, ${faces.length / 3} triangles, ${glb.length} bytes, ${Math.round(volume)} m³ signed volume`);
