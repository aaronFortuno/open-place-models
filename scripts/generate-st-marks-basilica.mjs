import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const directory = new URL('../models/st-marks-basilica/r1/', import.meta.url);
const layout = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const api = await ManifoldModule();
api.setup();
const sources = [
  'https://geodati.gov.it/geoportale/visualizzazione-metadati/scheda-metadati?metadataid=p_ve:000045:20241031:114741',
  'https://globaluserfiles.com/media/226556_b97d1748ff3f8538eb11b775b021f44c1f8bcf65.pdf/o/articolo%20lps%20basilica%20san%20marco.pdf',
  'https://ongania-sanmarco.it/biblioteca_digitale/1-Portafoglio-1',
  'https://www.basilicasanmarco.it/en/sculpture/the-decoration-of-the-facades/',
  'https://www.openstreetmap.org/way/138800932',
];
const credit = 'Città Metropolitana di Venezia (2014 surface survey). Open Place Models contributors (reconstruction). Footprint © OpenStreetMap contributors.';
const pieces = [];
const recesses = [];

function solid(vertices, triangles) {
  const result = new api.Manifold(new api.Mesh({
    numProp: 3, vertProperties: Float32Array.from(vertices.flat()), triVerts: Uint32Array.from(triangles),
  }));
  assert.equal(result.status(), 'NoError');
  return result;
}

const { vertices: roof, triangles: roofFaces, boundary } = layout.roof;
const bottom = roof.length;
const walls = [];
for (const [index, start] of boundary.entries()) {
  const end = boundary[(index + 1) % boundary.length];
  walls.push(start + bottom, end + bottom, end, start + bottom, end, start);
}
pieces.push(solid(
  [...roof, ...roof.map(([x, y]) => [x, y, 0])],
  [...roofFaces.flat(), ...roofFaces.flatMap(([a, b, c]) => [a + bottom, c + bottom, b + bottom]), ...walls],
));

function radial(centre, levels, sides) {
  const [x, y] = centre;
  const vertices = levels.flatMap(([height, radius]) => Array.from({ length: sides }, (_, index) => {
    const angle = 2 * Math.PI * index / sides;
    return [x + radius * Math.cos(angle), y + radius * Math.sin(angle), height];
  }));
  const end = (levels.length - 1) * sides;
  const faces = [];
  for (let i = 1; i < sides - 1; i++) faces.push(0, i + 1, i, end, end + i, end + i + 1);
  for (let base = 0; base < end; base += sides) {
    for (let i = 0; i < sides; i++) {
      const a = base + i;
      const b = base + (i + 1) % sides;
      faces.push(a, b, b + sides, a, b + sides, a + sides);
    }
  }
  pieces.push(solid(vertices, faces));
}

function box(size, centre) {
  const cube = api.Manifold.cube(size, true);
  pieces.push(cube.translate(centre));
  cube.delete();
}

for (const dome of Object.values(layout.domes)) {
  radial(dome.centre, dome.levels, 14);
  const lower = dome.levels.at(-1)[0] - 0.25;
  const top = dome.finialTop;
  radial(dome.centre, [[lower, 0.56], [lower + 1.15, 0.62], [top - 2.4, 0.57], [top, 0.53]], 8);
  // The published sections show cross arms beneath the weather vanes.
  box([1.08, 3.2, 1.08], [...dome.centre, top - 2.65]);
}

const { panelFront, panelSkew, bays, pinnacleCentres } = layout.facade;
function rectangle(left, right, lower, upper) {
  return [[left, lower], [right, lower], [right, upper], [left, upper]];
}

function frontPrism(profile, setback, depth) {
  const section = api.CrossSection.ofPolygons([profile], 'NonZero');
  const prism = section.extrude(depth);
  const placed = prism.transform([
    panelSkew, 1, 0, 0,
    0, 0, 1, 0,
    1, 0, 0, 0,
    panelFront + setback, 0, 0, 1,
  ]);
  prism.delete();
  section.delete();
  return placed;
}

function arch(centre, width, bottom, spring, rise) {
  return [[centre - width, bottom], [centre + width, bottom], ...Array.from({ length: 9 }, (_, index) => {
    const angle = Math.PI * index / 8;
    return [centre + width * Math.cos(angle), spring + rise * Math.sin(angle)];
  })];
}

// The two orders, five recesses and central raised ogee follow Ongania's
// west elevation. The relief closes the entrances behind their outer arches.
pieces.push(
  frontPrism(rectangle(-25.6, 20.9, 0.18, 12.52), -0.01, 5.2),
  frontPrism(rectangle(-25.7, 20.95, 11.2, 12.33), -0.35, 2.3),
  frontPrism(rectangle(-25.1, 20.65, 11.55, 16.22), 0.82, 4.2),
);
for (const [centre, radius, central, lowerSill = 0.28] of bays) {
  const spring = 15.77;
  const shoulder = central ? 21.7 : 19.45;
  const crest = central ? 26.55 : 22.15;
  const rim = [[-1, 0], [1, 0], [0.96, 0.53], [0.76, shoulder - spring - 0.9],
    [0.46, shoulder - spring + 0.55], [0.22, (crest + shoulder) / 2 - spring], [0, crest - spring],
    [-0.22, (crest + shoulder) / 2 - spring], [-0.46, shoulder - spring + 0.55],
    [-0.76, shoulder - spring - 0.9], [-0.96, 0.53]];
  pieces.push(frontPrism(rim.map(([x, y]) => [centre + radius * x, spring + y]), 0.69, 4.65));
  if (central) {
    pieces.push(frontPrism(arch(centre, radius, 5.95, 7.8, 6.03), -0.61, 4.2));
  }
  const entranceSpring = central ? 7.65 : 7.52;
  const entranceRise = central ? 5.25 : 3.28;
  const entranceDepth = lowerSill > 1 ? 2.67 : central ? 4.04 : 3.24;
  recesses.push(
    frontPrism(arch(centre, radius * 0.86, lowerSill, entranceSpring, entranceRise), -0.95, entranceDepth),
    frontPrism(arch(centre, radius * 0.79, 15.89, 16.13, (central ? 21.42 : 19.25) - 16.13), 0.48, 1.24),
  );
}
for (const centre of pinnacleCentres) {
  const corner = centre < -22 || centre > 19;
  const width = corner ? 0.71 : 0.93;
  const top = corner ? 26.7 : 27.9;
  const profile = [[centre - width, 15.68], [centre + width, 15.68], [centre + width, 21.65],
    [centre + 0.56, 23.5], [centre + 0.21, top], [centre - 0.21, top],
    [centre - 0.56, 23.5], [centre - width, 21.65]];
  pieces.push(frontPrism(profile, 0.58, 2.53));
}
pieces.push(frontPrism([
  [-4.10, 25.44], [-2.60, 25.44], [-2.71, 28.38], [-2.98, 28.63],
  [-3.04, 31.3], [-3.65, 31.3], [-3.75, 28.56], [-4, 28.29],
], 0.83, 1.23));

const mass = api.Manifold.union(pieces);
const cut = api.Manifold.difference([mass, ...recesses]);
for (const piece of [mass, ...pieces, ...recesses]) piece.delete();
assert.equal(cut.status(), 'NoError', 'Combined basilica');
const components = cut.decompose();
const outer = components.filter(part => part.volume() > 1e-5);
assert.equal(outer.length, 1, `One external shell. Volumes ${components.map(part => part.volume())}`);
for (const [level, count, threshold] of [[1, 1, 5], [28, 5, 5], [38, 2, 2.7], [48, 1, 0.3]]) {
  const section = outer[0].slice(level);
  const areas = section.toPolygons().filter(points => {
    const area = points.reduce((sum, [x, y], i) => {
      const [u, v] = points[(i + 1) % points.length];
      return sum + x * v - y * u;
    }, 0) / 2;
    return area > threshold;
  });
  assert.equal(areas.length, count, `Landmark section at ${level} m`);
  section.delete();
}
const simplified = outer[0].simplify(0.09);
const mesh = simplified.getMesh();
for (const piece of [simplified, cut, ...components]) piece.delete();
assert.equal(mesh.mergeFromVert.length, 0);

const [e, n] = layout.basis;
const vertices = Array.from({ length: mesh.vertProperties.length / 3 }, (_, index) => {
  const [x, y, z] = mesh.vertProperties.subarray(index * 3, index * 3 + 3);
  return [e * x - n * y, z, -n * x - e * y].map(Math.fround);
});
const enu = solid(vertices, mesh.triVerts);
const precise = enu.setTolerance(0.001);
enu.delete();
const shells = precise.decompose();
assert.equal(shells.length, 1, 'One connected print component');
for (const shell of shells) shell.delete();
const final = precise.getMesh();
precise.delete();
assert.equal(final.mergeFromVert.length, 0);
const points = Array.from({ length: final.vertProperties.length / 3 }, (_, index) => Array.from(final.vertProperties.subarray(index * 3, index * 3 + 3)));
const faces = final.triVerts;
const vertexLinks = Array.from({ length: points.length }, () => new Map());
let volume = 0;
for (let index = 0; index < faces.length; index += 3) {
  const [a, b, c] = faces.subarray(index, index + 3);
  const [[x, y, z], [u, v, w], [p, q, r]] = [points[a], points[b], points[c]];
  assert(Math.hypot((v - y) * (r - z) - (w - z) * (q - y), (w - z) * (p - x) - (u - x) * (r - z), (u - x) * (q - y) - (v - y) * (p - x)) > 0, 'Non-degenerate triangle');
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
assert(volume > 0, 'Positive signed volume');
assert(points.length < 65536);
const extrema = [0, 1, 2].map(axis => [Math.min(...points.map(point => point[axis])), Math.max(...points.map(point => point[axis]))]);
assert.deepEqual(extrema[1], [0, 50]);

const positionBytes = points.length * 12;
const indexBytes = faces.length * 2;
const binary = Buffer.alloc(positionBytes + indexBytes);
points.forEach((point, index) => point.forEach((value, axis) => binary.writeFloatLE(value, index * 12 + axis * 4)));
faces.forEach((index, offset) => binary.writeUInt16LE(index, positionBytes + offset * 2));
const gltf = {
  asset: { version: '2.0', generator: 'Open Place Models', copyright: credit, extras: { license: 'CC-BY-4.0', sources } },
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
    { bufferView: 0, componentType: 5126, count: points.length, type: 'VEC3', min: extrema.map(([min]) => min), max: extrema.map(([, max]) => max) },
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
const coincident = points.length - new Set(points.map(point => point.join(','))).size;
console.log(`${points.length} vertices, ${faces.length / 3} triangles, ${glb.length} bytes, ${volume.toFixed(2)} m³, ${coincident} coincident positions`);
console.log('Extent (east, up, south):', extrema);
