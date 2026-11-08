import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const catalogue = JSON.parse(await readFile(new URL('catalog.geojson', root), 'utf8'));
const id = 'great-pyramid-giza';
const group = catalogue.features.find(feature => feature.id === id).properties;
const components = catalogue.features.filter(feature => feature.properties.galleryParent === id);
assert.equal(group.kind, 'group');
assert.equal(components.length, 3);

// Read the tightly packed, untransformed GLBs used by the catalogue.
function readAccessor(buffer, gltf, binStart, index, type, componentType, elements) {
  const accessor = gltf.accessors[index];
  const view = gltf.bufferViews[accessor.bufferView];
  assert.equal(accessor.type, type);
  assert.equal(accessor.componentType, componentType);
  assert.equal(view.buffer, 0);
  assert.equal(view.byteStride, undefined);
  const length = accessor.count * elements * (componentType === 5123 ? 2 : 4);
  const start = binStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  assert(start + length <= buffer.length);
  return buffer.subarray(start, start + length);
}

const [longitude, latitude] = group.anchor;
const metresPerLongitude = lat => 111320 * Math.cos(lat * Math.PI / 180);
const longitudeScale = metresPerLongitude(latitude);
const base = Math.min(...components.map(({ properties }) => properties.terrainBaseElevation));
assert(Number.isFinite(base));
const positions = [], indices = [];

for (const { properties } of components) {
  const buffer = await readFile(new URL(properties.mesh, root));
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF');
  assert.equal(buffer.readUInt32LE(4), 2);
  const binHeader = 20 + buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString('utf8', 20, binHeader));
  assert.deepEqual(gltf.nodes, [{ mesh: 0 }]);
  assert.equal(gltf.meshes.length, 1);
  const [primitive] = gltf.meshes[0].primitives;
  const vertices = readAccessor(buffer, gltf, binHeader + 8, primitive.attributes.POSITION, 'VEC3', 5126, 3);
  const faces = readAccessor(buffer, gltf, binHeader + 8, primitive.indices, 'SCALAR', 5123, 1);
  const [lon, lat] = properties.anchor;
  const offsetX = (lon - longitude) * longitudeScale;
  const offsetY = properties.terrainBaseElevation - base;
  const offsetZ = (latitude - lat) * 111320;
  const horizontalRatio = longitudeScale / metresPerLongitude(lat);
  const start = positions.length / 3;
  for (let i = 0; i < vertices.length; i += 12) {
    positions.push(vertices.readFloatLE(i) * horizontalRatio + offsetX,
      vertices.readFloatLE(i + 4) + offsetY, vertices.readFloatLE(i + 8) + offsetZ);
  }
  for (let i = 0; i < faces.length; i += 2) indices.push(start + faces.readUInt16LE(i));
}

assert(positions.length / 3 < 65536);
const coordinates = Float32Array.from(positions);
const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < coordinates.length; i++) {
  const axis = i % 3;
  min[axis] = Math.min(min[axis], coordinates[i]);
  max[axis] = Math.max(max[axis], coordinates[i]);
}
const vertexBytes = Buffer.from(coordinates.buffer), indexBytes = Buffer.from(Uint16Array.from(indices).buffer);
const gltf = {
  asset: { version: '2.0', generator: 'Open Place Models', copyright: group.attribution,
    extras: { license: group.license, sources: group.sources } },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  buffers: [{ byteLength: vertexBytes.length + indexBytes.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: vertexBytes.length, target: 34962 },
    { buffer: 0, byteOffset: vertexBytes.length, byteLength: indexBytes.length, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: coordinates.length / 3, type: 'VEC3', min, max },
    { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
  ],
};
const json = Buffer.from(JSON.stringify(gltf));
const jsonSize = Math.ceil(json.length / 4) * 4;
const binSize = Math.ceil(gltf.buffers[0].byteLength / 4) * 4;
const glb = Buffer.alloc(28 + jsonSize + binSize);
glb.write('glTF');
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(jsonSize, 12);
glb.write('JSON', 16);
glb.fill(0x20, 20, 20 + jsonSize);
json.copy(glb, 20);
glb.writeUInt32LE(binSize, 20 + jsonSize);
glb.write('BIN\0', 24 + jsonSize);
vertexBytes.copy(glb, 28 + jsonSize);
indexBytes.copy(glb, 28 + jsonSize + vertexBytes.length);
await writeFile(new URL(group.mesh, root), glb);
console.log(JSON.stringify({ byteLength: glb.length, height: max[1] - min[1], min, max }));
