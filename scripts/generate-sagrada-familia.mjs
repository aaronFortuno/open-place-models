import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const directory = new URL('../models/sagrada-familia/r1/', import.meta.url);
const layout = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const api = await ManifoldModule();
api.setup();
const pieces = [];
const ground = layout.municipal.referenceGround;
const height = 172.5;
const attribution = 'Ajuntament de Barcelona (municipal CAD geometry). Institut Cartogràfic i Geològic de Catalunya (2014 aerial survey). Open Place Models contributors (reconstruction).';
const municipal = 'https://portaldades.ajuntament.barcelona.cat/mapes/146';
const survey = 'https://betaportal.icgc.cat/model-3d-de-la-sagrada-familia-en-alta-resolucio/';
const operator = 'https://sagradafamilia.org/en/-/una-creu-que-arriba-al-cel-de-barcelona';

function add(solid) {
  assert.equal(solid.status(), 'NoError');
  assert(!solid.isEmpty());
  pieces.push(solid);
}

function prism(rings, bottom, top) {
  const section = api.CrossSection.ofPolygons(rings, 'NonZero');
  const extrusion = section.extrude(top - bottom);
  add(extrusion.translate(0, 0, bottom));
  extrusion.delete();
  section.delete();
}

prism(layout.base, 0, 0.5);
for (const part of layout.parts) {
  const top = part.replacementRoof ?? part.sourceRoof - ground;
  for (const polygon of part.polygons) prism(polygon, 0.25, top);
}

function meshSolid(points, faces) {
  return new api.Manifold(new api.Mesh({
    numProp: 3,
    vertProperties: Float32Array.from(points.flat()),
    triVerts: Uint32Array.from(faces),
  }));
}

function loft(rings) {
  const size = rings[0].length;
  const last = (rings.length - 1) * size;
  const faces = [];
  for (let i = 1; i < size - 1; i++) faces.push(0, i + 1, i, last, last + i, last + i + 1);
  for (let start = 0; start < last; start += size) {
    for (let i = 0; i < size; i++) {
      const a = start + i;
      const b = start + (i + 1) % size;
      faces.push(a, b, b + size, a, b + size, a + size);
    }
  }
  add(meshSolid(rings.flat(), faces));
}

function radial(centre, sides, profile, orientation = 0) {
  const [x, y] = centre;
  const cos = Math.cos(orientation);
  const sin = Math.sin(orientation);
  loft(profile.map(([z, a, b = a, dx = 0, dy = 0]) => Array.from({ length: sides }, (_, i) => {
    const angle = i * 2 * Math.PI / sides;
    const u = a * Math.cos(angle);
    const v = b * Math.sin(angle);
    return [x + dx + u * cos - v * sin, y + dy + u * sin + v * cos, z];
  })));
}

function reduceProfile(profile, tolerance) {
  const first = profile[0];
  const last = profile.at(-1);
  let split = -1;
  let maxError = tolerance;
  for (let i = 1; i < profile.length - 1; i++) {
    const level = profile[i];
    const ratio = (level[0] - first[0]) / (last[0] - first[0]);
    const error = Math.max(...[1, 2].map(axis =>
      Math.abs(level[axis] - first[axis] - ratio * (last[axis] - first[axis]))));
    if (error > maxError) {
      maxError = error;
      split = i;
    }
  }
  if (split === -1) return [first, last];
  return [...reduceProfile(profile.slice(0, split + 1), tolerance).slice(0, -1),
    ...reduceProfile(profile.slice(split), tolerance)];
}

for (const bell of layout.bells) {
  // Rays passing through attached masonry produce incomplete lower sections.
  // A short moving average preserves the surveyed taper and leaves the
  // measured upper re-expansion of the pinnacle intact.
  const sections = bell.profiles.map(([z, , , radius, , east, north], index, profiles) => {
    if (index > 0 && index < profiles.length - 1 && z < bell.top - 9) {
      east = (east * 2 + profiles[index - 1][5] + profiles[index + 1][5]) / 4;
      north = (north * 2 + profiles[index - 1][6] + profiles[index + 1][6]) / 4;
    }
    if (z >= bell.top - 8.1) east = north = radius;
    const tipBlend = Math.max(0, (z - 65) / (bell.top - 65));
    return [z - ground, east, north, ...bell.tip.map((value, axis) => (value - bell.centre[axis]) * tipBlend)];
  });
  const [, east, north] = sections[0];
  const [, lastEast, lastNorth] = sections.at(-1);
  const tipOffset = bell.tip.map((value, axis) => value - bell.centre[axis]);
  const terminal = sections.findIndex(([z]) => z >= bell.top - ground - 8.1);
  const shaft = reduceProfile(sections.slice(0, terminal), 0.14);
  radial(bell.centre, bell.facade === 'Nativity' ? 12 : 14, [
    [30, east, north],
    ...shaft,
    ...sections.slice(terminal),
    [bell.top - ground, Math.max(0.34, lastEast * 0.55), Math.max(0.34, lastNorth * 0.55), ...tipOffset],
  ]);
}

const { Jesus, Mary, Luke, John, Matthew, Mark } = layout.lanterns;
const [cx, cy] = Jesus.centre;
const nativity = Math.atan2(John.centre[1] - cy, John.centre[0] - cx);

// The operator documents a twelve-part dome and a two-metre bronze crown.
// Place the simplified dome on the municipal roof ring at the west corner.
radial(layout.sacristy.centre, 12, [[23.6, 9.05], [26, 8.95], [31, 7.65], [35.4, 5.45],
  [38.4, 3.12], [41.05, 1.07], [43, 0.63]], nativity);

const facade = layout.nativityRelief;
const along = Math.cos(facade.bearing);
const across = Math.sin(facade.bearing);
// The measured front and side envelopes are closed with solid sections for
// printing. The low stations overlap the municipal Nativity façade volume.
radial(facade.origin, 10, facade.sections.map(([z, halfWidth, halfDepth, u, v]) =>
  [z - ground, halfWidth, halfDepth, along * u - across * v, across * u + along * v]), facade.bearing);

// The CAD ends at flat levels below the new lanterns. Preserve the measured
// crossing and apse platforms and interpolate the documented tower envelopes.
radial(Jesus.centre, 12, [[68.2, 7.0], [73, 7.55], [80, 8.4], [85, 9]], nativity);
radial(Jesus.centre, 12, [
  [84.75, 9], [93, 8.85], [105, 8.5], [117, 7.85], [129, 6.8], [137, 5.75], [142.5, 4.75],
  [143.5, 4.7], [148.8, 4.05], [155.6, 2.85],
], nativity);

function bevelSquare(half, bevel) {
  const h = half;
  const t = h - bevel;
  return [[h, -t], [h, t], [t, h], [-t, h], [-h, t], [-h, -t], [-t, -h], [t, -h]];
}

function crossArm(angle, direction, profile) {
  const u = Math.cos(angle);
  const v = Math.sin(angle);
  loft(profile.map(([distance, half, bevel]) => bevelSquare(half, bevel).map(([a, b]) => {
    if (direction === 'up') return [cx + a * u - b * v, cy + a * v + b * u, distance];
    return [cx + distance * u - a * v, cy + distance * v + a * u, 165.45 + b];
  })));
}

crossArm(nativity, 'up', [[155.5, 2.47, 0.73], [158.25, 2.26, 0.82], [163, 2.35, 0.94],
  [167.6, 2.25, 0.88], [170.3, 2.25, 0.53], [172.5, 2.25, 0.43]]);
for (let i = 0; i < 4; i++) {
  crossArm(nativity + i * Math.PI / 2, 'out', [[1.45, 2.25, 0.83], [4.40, 2.25, 0.65], [6.75, 2.25, 0.34]]);
}

for (const lantern of [Luke, John, Matthew, Mark]) {
  const [x, y] = lantern.centre;
  const bearing = Math.atan2(y - cy, x - cx);
  radial(lantern.centre, 8, [
    [43.7, 3.45], [45, 3.55], [67, 3.43], [74, 3.38], [85, 3.19],
    [97, 2.83], [105, 2.42], [112.5, 1.92], [120.2, 1.42], [123.8, 1.28], [125.3, 1.8],
    [126.5, 1.58], [130.6, 1.5], [133.3, 1.32], [135, 0.76],
  ], bearing + Math.PI / 8);
  // Common nine-metre wing envelope, with the individual sculptures omitted.
  radial(lantern.centre, 8, [[125.6, 1.27, 1.53], [127.6, 1.18, 2.08], [131.6, 0.91, 2.12], [134.6, 0.63, 1.64]], bearing);
  const distance = Math.hypot(x - cx, y - cy);
  const u = (x - cx) / distance;
  const v = (y - cy) / distance;
  const bridge = [[7.7, -1.04], [distance - 2.3, -1.04], [distance - 2.3, 1.04], [7.7, 1.04]]
    .map(([along, across]) => [cx + along * u - across * v, cy + along * v + across * u]);
  prism([bridge], 84.2, 86.25);
}

radial(Mary.centre, 14, [[63, 8.9], [69, 9], [80, 8.52], [89, 7.76], [100, 6.41], [108, 4.75], [111, 3.97]], nativity);
radial(Mary.centre, 12, [[108, 4.45], [110, 4.5], [114, 3.37]], nativity);
radial(Mary.centre, 12, [[112.8, 3.62], [118, 2.52], [123.5, 1.75], [128.4, 1.49], [131.5, 1.75], [133.5, 1.31]], nativity);

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function cross([a, b, c], [x, y, z]) {
  return [b * z - c * y, c * x - a * z, a * y - b * x];
}

function subtract(a, b) {
  return a.map((value, index) => value - b[index]);
}

function normalised(vector, radius = 1) {
  const magnitude = Math.hypot(...vector);
  return vector.map(value => value * radius / magnitude);
}

// A pentagonal pyramid on each face of a regular dodecahedron. The twelve
// outward axes are the vertices of its dual icosahedron.
function maryStar() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const axes = [];
  for (const a of [-1, 1]) for (const b of [-phi, phi]) axes.push([0, a, b], [b, 0, a], [a, b, 0]);
  const adjacent = (i, j) => Math.abs(Math.hypot(...subtract(axes[i], axes[j])) - 2) < 1e-8;
  const star = axes.map(axis => normalised(axis, 3.75));
  const edgeFaces = new Map();
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) {
    if (!adjacent(i, j) || !adjacent(j, k) || !adjacent(i, k)) continue;
    const index = star.length;
    const centre = axes[i].map((value, axis) => value + axes[j][axis] + axes[k][axis]);
    star.push(normalised(centre, 1.95));
    for (const [a, b] of [[i, j], [i, k], [j, k]]) {
      const key = a * 12 + b;
      if (!edgeFaces.has(key)) edgeFaces.set(key, []);
      edgeFaces.get(key).push(index);
    }
  }
  const triangles = [];
  for (const [key, [i, j]] of edgeFaces) for (const tip of [Math.floor(key / 12), key % 12]) {
    const side = cross(subtract(star[i], star[tip]), subtract(star[j], star[tip]));
    triangles.push(...(dot(side, star[tip]) > 0 ? [tip, i, j] : [tip, j, i]));
  }
  const up = normalised(axes[0]);
  const east = normalised(cross([0, 0, 1], up));
  const north = cross(up, east);
  const [x, y] = Mary.centre;
  add(meshSolid(star.map(point => [x + dot(point, east), y + dot(point, north), 134.25 + dot(point, up)]), triangles));
}

maryStar();

const mass = api.Manifold.union(pieces);
for (const piece of pieces) piece.delete();
assert.equal(mass.status(), 'NoError', 'Combined basilica');
const components = mass.decompose();
// Intersecting measured tiers can enclose air. Keep the outside shell of the
// print volume, leaving exterior openings in its connected boundary.
const substantial = components.filter(component => component.volume() > 1e-5);
assert.equal(substantial.length, 1, `Connected basilica (component volumes ${components.map(component => component.volume())})`);
for (const [level, contours] of [[115, 6], [130, 6], [136, 2], [163.45, 1], [165.45, 1]]) {
  const section = substantial[0].slice(level);
  assert.equal(section.numContour(), contours, `Expected tower or cross section at ${level} metres`);
  section.delete();
}
const simplified = substantial[0].simplify(0.12);
const { vertProperties, triVerts, mergeFromVert } = simplified.getMesh();
simplified.delete();
for (const component of components) component.delete();
mass.delete();
assert.equal(mergeFromVert.length, 0);

const [[eastX, northX], [eastY, northY]] = layout.gridToENU;
const enu = Array.from({ length: vertProperties.length / 3 }, (_, index) => {
  const [x, y, z] = vertProperties.subarray(index * 3, index * 3 + 3);
  return [x * eastX + y * eastY, z, -(x * northX + y * northY)].map(Math.fround);
});
const registered = meshSolid(enu, triVerts);
assert.equal(registered.status(), 'NoError');
const precise = registered.setTolerance(0.001);
registered.delete();
const mesh = precise.getMesh();
assert.equal(mesh.mergeFromVert.length, 0);
const finalComponents = precise.decompose();
assert.equal(finalComponents.length, 1, 'One component after coordinate conversion');
for (const component of finalComponents) component.delete();
precise.delete();

const faces = mesh.triVerts;
const count = mesh.vertProperties.length / 3;
const points = Array.from({ length: count }, (_, index) => Array.from(mesh.vertProperties.subarray(index * 3, index * 3 + 3)));
const links = Array.from({ length: count }, () => new Map());
let volume = 0;
for (let index = 0; index < faces.length; index += 3) {
  const [a, b, c] = faces.subarray(index, index + 3);
  const normal = cross(subtract(points[b], points[a]), subtract(points[c], points[a]));
  assert(Math.hypot(...normal) > 0, 'Non-degenerate triangle');
  volume += dot(points[a], cross(points[b], points[c])) / 6;
  for (const [from, to, next] of [[a, b, c], [b, c, a], [c, a, b]]) {
    assert(!links[from].has(to), 'Consistent edge orientation');
    links[from].set(to, next);
  }
}
for (const link of links) {
  const start = link.keys().next().value;
  let cursor = start;
  const size = link.size;
  for (let i = 0; i < size; i++) {
    assert(link.has(cursor), 'One incident face ring per vertex');
    const previous = cursor;
    cursor = link.get(cursor);
    link.delete(previous);
  }
  assert.equal(cursor, start, 'Closed incident face ring');
}
assert(volume > 0, 'Positive signed volume');
assert(count < 65536, 'Indices fit in unsigned 16-bit integers');
const extrema = [0, 1, 2].map(axis => [Math.min(...points.map(point => point[axis])), Math.max(...points.map(point => point[axis]))]);
assert.deepEqual(extrema[1], [0, height]);

const positionBytes = count * 12;
const indexBytes = faces.length * 2;
const binary = Buffer.alloc(positionBytes + indexBytes);
points.forEach((point, index) => point.forEach((value, axis) => binary.writeFloatLE(value, index * 12 + axis * 4)));
faces.forEach((index, offset) => binary.writeUInt16LE(index, positionBytes + offset * 2));
const gltf = {
  asset: {
    version: '2.0', generator: 'Open Place Models', copyright: attribution,
    extras: { license: 'CC-BY-4.0', sources: [municipal, survey, operator] },
  },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  buffers: [{ byteLength: binary.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: positionBytes, target: 34962 },
    { buffer: 0, byteOffset: positionBytes, byteLength: indexBytes, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count, type: 'VEC3', min: extrema.map(([min]) => min), max: extrema.map(([, max]) => max) },
    { bufferView: 1, componentType: 5123, count: faces.length, type: 'SCALAR' },
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
const coincident = count - new Set(points.map(point => point.join(','))).size;
console.log(`${count} vertices, ${faces.length / 3} triangles, ${glb.length} bytes, ${Math.round(volume)} m³ signed volume, ${coincident} coincident positions`);
console.log('Extent (east, up, south):', extrema);
