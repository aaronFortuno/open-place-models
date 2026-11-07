import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const directory = new URL('../models/statue-of-liberty/r1/', import.meta.url);
const layout = JSON.parse(await readFile(new URL('layout.json', directory), 'utf8'));
const bronze = JSON.parse(await readFile(new URL('figure.json', directory), 'utf8'));
const api = await ManifoldModule();
api.setup();

const attribution = 'Jerry Fisher (Statue Of Liberty Bronze Model, CC BY 4.0). Open Place Models contributors (registration, new torch, pedestal and Fort Wood). NPS/HAER and NYC LiDAR measurements. Fort Wood plan © OpenStreetMap contributors (ODbL 1.0).';
const sources = [
  bronze.source,
  'https://www.loc.gov/item/ny1251/',
  'https://www.loc.gov/pictures/item/ny1251.sheet.00026a/',
  'https://www.loc.gov/pictures/item/ny1251.sheet.00035a/',
  'https://www.nps.gov/stli/learn/historyculture/statue-statistics.htm',
  'https://www.fisheries.noaa.gov/inport/item/64728',
  'https://www.openstreetmap.org/way/32965412',
];

function solid(vertices, faces) {
  const result = new api.Manifold(new api.Mesh({
    numProp: 3, vertProperties: Float32Array.from(vertices.flat()), triVerts: Uint32Array.from(faces.flat()),
  }));
  assert.equal(result.status(), 'NoError', 'Oriented solid');
  return result;
}

function loft(rings) {
  const sides = rings[0].length;
  const last = (rings.length - 1) * sides;
  const faces = [];
  for (let i = 1; i < sides - 1; i++) faces.push([0, i, i + 1], [last, last + i + 1, last + i]);
  for (let start = 0; start < last; start += sides) {
    for (let i = 0; i < sides; i++) {
      const a = start + i;
      const b = start + (i + 1) % sides;
      faces.push([a, a + sides, b + sides], [a, b + sides, b]);
    }
  }
  return solid(rings.flat(), faces);
}

function rectangularRings(levels, x = 0, z = 0) {
  return levels.map(([y, width, depth]) => [
    [x - width / 2, y, z - depth / 2],
    [x + width / 2, y, z - depth / 2],
    [x + width / 2, y, z + depth / 2],
    [x - width / 2, y, z + depth / 2],
  ]);
}

function box(width, bottom, top, depth, x = 0, z = 0) {
  return loft(rectangularRings([[bottom, width, depth], [top, width, depth]], x, z));
}

function union(parts) {
  const model = api.Manifold.union(parts);
  for (const part of parts) part.delete();
  assert.equal(model.status(), 'NoError', 'Joined structure');
  return model;
}

function placeSection(section, bottom, top) {
  const prism = section.extrude(top - bottom);
  const oriented = prism.transform([1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, bottom, 0, 1]);
  prism.delete();
  return oriented;
}

const outline = api.CrossSection.ofPolygons([layout.fortOutline.map(([x, z]) => [x, -z])], 'EvenOdd');
const inside = outline.offset(-1.24, 'Miter');
const rim = outline.subtract(inside);
const fort = placeSection(outline, 0, 7.79);
const parapet = placeSection(rim, 7.68, 8.47);
outline.delete();
inside.delete();
rim.delete();

// Measured perimeter, terrace steps and the stepped stone pedestal.
const parts = [fort, parapet, loft(rectangularRings(layout.tiers))];
for (const [depth, start, step, widths] of [
  [44.35, 7.77, 0.475, [27.4, 24.7, 22.1, 19.5, 16.9, 14.2, 11.6, 8.9]],
  [29.15, 11.54, 0.405, [18.0, 16.3, 14.6, 12.9, 11.0, 9.3, 8.0, 6.4]],
]) {
  for (const [i, width] of widths.entries()) {
    parts.push(box(width, start + i * step - 0.12, start + (i + 1) * step, depth));
  }
}

function terraceRail(y, width, depth, opening) {
  const wall = 1.13;
  parts.push(
    box(wall, y - 0.11, y + 0.99, depth, (width - wall) / 2),
    box(wall, y - 0.11, y + 0.99, depth, -(width - wall) / 2),
  );
  const length = (width - opening) / 2 + 0.08;
  for (const side of [-1, 1]) {
    const z = side * (depth - wall) / 2;
    parts.push(box(length, y - 0.11, y + 0.99, wall, (width + opening) / 4, z));
    parts.push(box(length, y - 0.11, y + 0.99, wall, -(width + opening) / 4, z));
  }
}
terraceRail(11.57, 40.35, 40.7, 8.7);
terraceRail(14.77, 25.85, 25.6, 6.2);
terraceRail(37.12, 17.3, 17.2, 0.03);

// The four pilasters on each façade face follow the HAER elevation.
for (const rotation of [0, 90, 180, 270]) {
  for (const station of [-4.6, -1.53, 1.53, 4.6]) {
    const pilaster = loft(rectangularRings([
      [29.11, 1.48, 1.46], [29.67, 1.48, 1.46], [29.94, 1.11, 1.2],
      [34.61, 0.92, 1.04], [34.91, 1.43, 1.43], [35.47, 1.43, 1.43],
    ], station, 7.57));
    parts.push(pilaster.rotate([0, rotation, 0]));
    pilaster.delete();
  }
}

// The body, tablet, crown and raised hand preserve the bronze scan. Its old
// flame is replaced by the envelope of the current torch measured in New York.
const replica = solid(bronze.vertices, bronze.triangles);
const figure = replica.trimByPlane([0, -1, 0], -layout.torchCut);
replica.delete();
const flame = loft(layout.flame.map(([height, x, z, width, depth], layer) =>
  Array.from({ length: 10 }, (_, i) => {
    const angle = 2 * Math.PI * i / 10;
    const fluting = i % 2 === 0 ? 1.0 : 0.83;
    return [x + width * fluting * Math.cos(angle + layer * 0.09), height,
      z + depth * fluting * Math.sin(angle + layer * 0.09)];
  })));
parts.push(figure, flame);

function cross([a, b, c], [x, y, z]) {
  return [b * z - c * y, c * x - a * z, a * y - b * x];
}

function unit(vector) {
  const length = Math.hypot(...vector);
  return vector.map(value => value / length);
}

// QEM reduction can shorten the thin cast rays. Restore all seven to their
// registered scan tips and taper the reinforcement towards each tip.
for (const [root, tip] of layout.crownRays) {
  const delta = tip.map((value, axis) => value - root[axis]);
  const direction = unit(delta);
  const u = unit(cross(direction, [0, 0, 1]));
  const v = cross(u, direction);
  parts.push(loft([[0, 0.54], [0.44, 0.45], [0.74, 0.32], [1, 0.065]].map(([t, radius]) =>
    Array.from({ length: 6 }, (_, side) => {
      const angle = side * Math.PI / 3;
      return root.map((coordinate, axis) => coordinate + t * delta[axis]
        + radius * (Math.cos(angle) * u[axis] + Math.sin(angle) * v[axis]));
    }))));
}

const assembled = union(parts);
const oriented = assembled.rotate([0, 180 - layout.frontBearing, 0]);
assembled.delete();
const simplified = oriented.simplify(0.014);
oriented.delete();
const components = simplified.decompose();
simplified.delete();
// Remove numerical debris left by coplanar joins.
const printable = components.filter(component => {
  if (component.volume() > 1e-7) return true;
  component.delete();
  return false;
});
assert.equal(printable.length, 1, 'Single connected component');
const [final] = printable;
const manifoldVolume = final.volume();
const mesh = final.getMesh();
assert.equal(mesh.mergeFromVert.length, 0, 'Geometric indices are welded');
const genus = final.genus();
final.delete();

const vertices = Array.from({ length: mesh.vertProperties.length / 3 }, (_, index) => {
  return Array.from(mesh.vertProperties.subarray(3 * index, 3 * index + 3));
});
const triangles = mesh.triVerts;
const vertexLinks = vertices.map(() => new Map());
let volume = 0;
for (let i = 0; i < triangles.length; i += 3) {
  const [a, b, c] = triangles.subarray(i, i + 3);
  const [[x, y, z], [u, v, w], [p, q, r]] = [vertices[a], vertices[b], vertices[c]];
  const area = Math.hypot((v - y) * (r - z) - (w - z) * (q - y), (w - z) * (p - x) - (u - x) * (r - z), (u - x) * (q - y) - (v - y) * (p - x));
  assert(area > 1e-8, `Non-degenerate triangle ${i / 3}: ${JSON.stringify([vertices[a], vertices[b], vertices[c]])}`);
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
const extrema = [0, 1, 2].map(axis => [Math.min(...vertices.map(point => point[axis])), Math.max(...vertices.map(point => point[axis]))]);
assert.deepEqual(extrema[1], [0, Math.fround(layout.height)]);

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
await writeFile(process.argv[2] ?? new URL('print.glb', directory), glb);
console.log(JSON.stringify({
  vertices: vertices.length, triangles: triangles.length / 3,
  bytes: glb.length, volume: Math.round(volume * 100) / 100, genus, extrema,
}));
