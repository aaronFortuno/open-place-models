import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const source = 'https://upload.wikimedia.org/wikipedia/commons/4/41/EiffelTower_fixed.stl';
const sha256 = 'bff2ce1d08609b2d761a225cb7c8c1da782369714011567ede7a5008a1e55adf';
const localSource = process.argv[2];
const stl = localSource ? await readFile(localSource) : await downloadSource();
assert.equal(createHash('sha256').update(stl).digest('hex'), sha256, 'Source STL checksum');

const catalogue = JSON.parse(await readFile(new URL('../catalog.geojson', import.meta.url), 'utf8'));
const { height, variants } = catalogue.features.find(feature => feature.id === 'eiffel-tower').properties;
const { mesh, license, attribution } = variants.find(variant => variant.id === 'detailed' && variant.revision === 'r1');
const sourcePage = 'https://commons.wikimedia.org/wiki/File:EiffelTower_fixed.stl';
const spatialSource = 'https://open-landmarks.benmaps.fr/objects/ee44d66e51c7e518a2bc28ba19b5b2dea72e1bbdabbdc5c26ac4ca7e00d97940/spatial-source.json';

async function downloadSource() {
  const response = await fetch(source, {
    headers: { 'User-Agent': 'Open Place Models (https://github.com/aaronFortuno/open-place-models)' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Source STL returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const sourceTriangles = stl.readUInt32LE(80);
assert.equal(stl.length, 84 + sourceTriangles * 50, 'Binary STL length');
const vertices = [];
const sourceIndices = [];
const vertexIds = new Map();
for (let triangle = 0; triangle < sourceTriangles; triangle++) {
  for (let corner = 0; corner < 3; corner++) {
    const offset = 96 + triangle * 50 + corner * 12;
    const point = [stl.readFloatLE(offset), stl.readFloatLE(offset + 4), stl.readFloatLE(offset + 8)];
    const key = point.join(',');
    if (!vertexIds.has(key)) {
      vertexIds.set(key, vertices.length);
      vertices.push(point);
    }
    sourceIndices.push(vertexIds.get(key));
  }
}

const range = axis => vertices.reduce(([low, high], point) => [Math.min(low, point[axis]), Math.max(high, point[axis])], [Infinity, -Infinity]);
const [minX, maxX] = range(0);
const [minY, maxY] = range(1);
const [minZ, maxZ] = range(2);
// Register the 125 m base and 330 m tip to the Open Landmarks geographic fit.
// The fit records the grid direction and the centre offset from the OSM anchor.
const scaleXY = 125 / (maxX - minX);
const scaleZ = height / (maxZ - minZ);
const [east, north] = [0.6975986957550049, 0.7164886593818665];
const [centreEast, centreNorth] = [0.21368009080060688, -0.11836828263270763];
const registered = vertices.map(([x, y, z]) => {
  const u = (x - (minX + maxX) / 2) * scaleXY;
  const v = (y - (minY + maxY) / 2) * scaleXY;
  return [u * east - v * north + centreEast, (z - minZ) * scaleZ, -(u * north + v * east + centreNorth)].map(Math.fround);
});

const api = await ManifoldModule();
api.setup();
const solid = new api.Manifold(new api.Mesh({
  numProp: 3, vertProperties: Float32Array.from(registered.flat()), triVerts: Uint32Array.from(sourceIndices),
}));
assert.equal(solid.status(), 'NoError', 'Manifold import status');
// Read back the canonical topology. Incident face rings at point contacts
// have separate indices, even when they retain the same world coordinates.
const { vertProperties, triVerts: indices, mergeFromVert } = solid.getMesh();
solid.delete();
assert.equal(mergeFromVert.length, 0, 'The print profile needs explicit topology');
const placed = Array.from({ length: vertProperties.length / 3 }, (_, i) => Array.from(vertProperties.subarray(i * 3, i * 3 + 3)));
const keyAtHeight = (points, elevation) => [...new Set(points.filter(p => p[1] === elevation).map(p => p.join(',')))].sort();
for (const elevation of [0, height]) {
  assert.deepEqual(keyAtHeight(placed, elevation), keyAtHeight(registered, elevation), 'The feet and apex must stay fixed');
}

const edges = new Map();
const vertexLinks = Array.from({ length: placed.length }, () => []);
let signedVolume = 0;
for (let i = 0; i < indices.length; i += 3) {
  const [a, b, c] = indices.slice(i, i + 3);
  const [[x, y, z], [u, v, w], [p, q, r]] = [placed[a], placed[b], placed[c]];
  const crossX = (v - y) * (r - z) - (w - z) * (q - y);
  const crossY = (w - z) * (p - x) - (u - x) * (r - z);
  const crossZ = (u - x) * (q - y) - (v - y) * (p - x);
  assert(crossX !== 0 || crossY !== 0 || crossZ !== 0, 'Zero-area print triangle');
  signedVolume += (x * (v * r - w * q) + y * (w * p - u * r) + z * (u * q - v * p)) / 6;
  for (const [from, to, opposite] of [[a, b, c], [b, c, a], [c, a, b]]) {
    vertexLinks[from].push([to, opposite]);
    const key = from < to ? `${from},${to}` : `${to},${from}`;
    const edge = edges.get(key) ?? [0, 0];
    edge[0]++;
    edge[1] += from < to ? 1 : -1;
    edges.set(key, edge);
  }
}
assert([...edges.values()].every(([count, winding]) => count === 2 && winding === 0), 'The mesh must be closed with consistently oriented faces');
for (const neighbours of vertexLinks) {
  const links = new Map(neighbours);
  let next = links.keys().next().value;
  for (let i = 0; i < neighbours.length; i++) {
    assert(links.has(next), 'Each print vertex must have one incident face ring');
    const previous = next;
    next = links.get(next);
    links.delete(previous);
  }
  assert.equal(next, neighbours[0][0], 'Each incident face ring must close');
}
assert(signedVolume > 0, 'The mesh must have positive signed volume');
assert(placed.length <= 65_536, 'The mesh must fit 16-bit indices');

const vertexBytes = placed.length * 12;
const binary = Buffer.alloc(vertexBytes + indices.length * 2);
placed.forEach((point, index) => point.forEach((value, axis) => binary.writeFloatLE(value, index * 12 + axis * 4)));
indices.forEach((value, index) => binary.writeUInt16LE(value, vertexBytes + index * 2));
const axes = [0, 1, 2].map(axis => placed.reduce(([low, high], point) => [Math.min(low, point[axis]), Math.max(high, point[axis])], [Infinity, -Infinity]));
const gltf = {
  asset: {
    version: '2.0', generator: 'Open Place Models', copyright: attribution,
    extras: { license, licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', sourcePage, spatialSource },
  },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  buffers: [{ byteLength: binary.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: vertexBytes, target: 34962 },
    { buffer: 0, byteOffset: vertexBytes, byteLength: indices.length * 2, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: placed.length, type: 'VEC3', min: axes.map(axis => axis[0]), max: axes.map(axis => axis[1]) },
    { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
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
await writeFile(new URL('../' + mesh, import.meta.url), glb);
console.log(`${mesh}: ${placed.length} vertices, ${indices.length / 3} triangles, ${glb.length} bytes, ${Math.round(signedVolume)} m³ signed volume`);
