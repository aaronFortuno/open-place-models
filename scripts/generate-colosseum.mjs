import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const directory = new URL('../models/colosseum/r1/', import.meta.url);
const plan = JSON.parse(await readFile(new URL('osm-layout.json', directory), 'utf8'));
const api = await ManifoldModule();
api.setup();

const attribution = 'Open Place Models contributors (reconstruction). Plan and geographic footprint © OpenStreetMap contributors (ODbL 1.0).';
const sources = [
  'https://www.openstreetmap.org/relation/1834818',
  'https://www.openstreetmap.org/relation/3371742',
  'https://colosseo.it/restauri/colosseo/',
  'https://colosseo.it/ambulacri-meridionali/',
  'https://colosseo.it/opere/montacarichi-e-piattaforme/',
  'https://exhibits.lib.ttu.edu/s/openarch/item/18831',
  'https://emidius.mi.ingv.it/GNDT2/Pubblicazioni/Liberatore_Beni_Archeologici/Cap1_Liberatore.htm',
];

function section(polygons) {
  return api.CrossSection.ofPolygons(polygons.flat(), 'NonZero');
}

function extrude(polygons, bottom, top) {
  const profile = section(polygons);
  const solid = profile.extrude(top - bottom);
  const result = solid.translate([0, 0, bottom]);
  profile.delete();
  solid.delete();
  return result;
}

function combine(operation, pieces) {
  const result = api.Manifold[operation](pieces);
  for (const piece of pieces) piece.delete();
  assert.equal(result.status(), 'NoError', operation);
  return result;
}

// A flat print base unifies the excavated floor with the surviving walls.
const base = extrude(plan.outline, 0, 1.12);
const walls = plan.hypogeumWalls.map(polygon => extrude([polygon], 0.8, 3.55));
const deck = extrude(plan.eastDeck, 0.8, 6.82);

// The podium and six broad cavea steps are based on offsets of the mapped arena.
// Small mapped wall fragments remain visible where they rise above these steps.
const podiumTop = [11.3, 12.35, 13.4, 14.45, 15.5, 16.5];
const cavea = plan.cavea.map((step, index) => extrude(step, 0.8, podiumTop[index]));
const fragments = plan.caveaFragments.map(polygon => extrude([polygon], 1.0, 17.2));
const middle = extrude(plan.middle, 0.8, 23.6);
const exposed = extrude(plan.exposedRing, 0.8, 36.0);
// The collapsed south crown is lower. The crest varies across the exposed ring
// while the adjacent northern gallery retains its original, taller profile.
const slope = 0.038;
const crest = exposed.trimByPlane([0, slope / Math.hypot(1, slope), -1 / Math.hypot(1, slope)], -33.4 / Math.hypot(1, slope));
exposed.delete();
function westButtress(solid) {
  // The Valadier end falls down towards the western entrance. Retain the
  // mapped perimeter and use a single slope to approximate the stepped end.
  const normal = [1.625, 1.9, -1];
  const scale = Math.hypot(...normal);
  const offset = (normal[0] * -88 + normal[1] * 35 - 23.5) / scale;
  const clipped = solid.trimByPlane(normal.map(value => value / scale), offset);
  solid.delete();
  return clipped;
}

const gallery = westButtress(extrude(plan.northGallery, 0.8, 38.6));
const north = westButtress(extrude(plan.northWall, 0.8, plan.height));

// Intersect the radial stations with the registered outlines, rather than
// placing the arches on a hypothetical complete outer ellipse.
const [centreX, centreY] = plan.arenaCentre;
function surface(polygons, angle) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let radius = -Infinity;
  for (const [outline] of polygons) {
    for (let i = 0; i < outline.length; i++) {
      const [px, py] = outline[i];
      const [qx, qy] = outline[(i + 1) % outline.length];
      const sx = qx - px;
      const sy = qy - py;
      const cross = dx * sy - dy * sx;
      if (Math.abs(cross) < 1e-7) continue;
      const t = ((px - centreX) * sy - (py - centreY) * sx) / cross;
      const u = ((px - centreX) * dy - (py - centreY) * dx) / cross;
      if (u >= 0 && u <= 1 && t > 0) radius = Math.max(radius, t);
    }
  }
  return radius;
}

function originalBayAngles() {
  const orientation = plan.eastAxisDegrees * Math.PI / 180;
  const [major, minor] = plan.originalOuterAxes.map(length => length / 2);
  const stations = [];
  let length = 0;
  let previous = [major, 0];
  for (let i = 0; i <= 800; i++) {
    const t = 2 * Math.PI * i / 800;
    const point = [major * Math.cos(t), minor * Math.sin(t)];
    length += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    stations.push({ length, angle: Math.atan2(point[1], point[0]) + orientation });
    previous = point;
  }
  return Array.from({ length: 80 }, (_, index) => stations.find(station => station.length >= length * index / 80).angle);
}

function aperture(width, bottom, spring, rise) {
  const half = width / 2;
  return [[-half, bottom], [half, bottom], ...Array.from({ length: 5 }, (_, index) => {
    const t = Math.PI * index / 4;
    return [half * Math.cos(t), spring + rise * Math.sin(t)];
  })];
}

function recess(profile, x, y, normalX, normalY, depth) {
  const cut = api.CrossSection.ofPolygons([profile], 'NonZero');
  const prism = cut.extrude(depth + 1.35);
  const result = prism.transform([
    normalY, -normalX, 0, 0,
    0, 0, 1, 0,
    -normalX, -normalY, 0, 0,
    x + 1.35 * normalX, y + 1.35 * normalY, 0, 1,
  ]);
  cut.delete();
  prism.delete();
  return result;
}

const archCounts = { north: 0, south: 0, attic: 0 };
const openings = [];
for (const [index, angle] of originalBayAngles().entries()) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const n = surface(plan.northWall, angle);
  const northBay = n > 65;
  const ring = northBay ? plan.northWall : plan.exposedRing;
  const distance = northBay ? n : surface(ring, angle);
  if (surface(plan.outline, angle) - distance > 2.2) continue;

  const before = surface(ring, angle - 0.018);
  const after = surface(ring, angle + 0.018);
  // Keep the mapped end buttresses solid where the wall turns sharply.
  if (![before, after].every(radius => Math.abs(radius - distance) < 3.3)) continue;
  const tangentX = after * Math.cos(angle + 0.018) - before * Math.cos(angle - 0.018);
  const tangentY = after * Math.sin(angle + 0.018) - before * Math.sin(angle - 0.018);
  const tangentLength = Math.hypot(tangentX, tangentY);
  const x = centreX + distance * dx;
  const y = centreY + distance * dy;
  const normalX = tangentY / tangentLength;
  const normalY = -tangentX / tangentLength;

  const rows = northBay
    ? [[4.3, 0.92, 5.87, 2.15, 6.0], [4.3, 12.35, 16.7, 2.15, 6.0], [4.3, 24.18, 28.43, 2.15, 15.8]]
    : [[3.35, 0.92, 6.9, 1.65, 2.65], [3.2, 12.2, 17.4, 1.6, 2.65]];
  const localNorthTop = Math.min(plan.height, 23.5 + 1.625 * (x + 88) + 1.9 * (y - 35));
  for (const [width, bottom, spring, rise, depth] of rows) {
    if (northBay && spring + rise > localNorthTop - 3.0) continue;
    openings.push(recess(aperture(width, bottom, spring, rise), x, y, normalX, normalY, depth));
    archCounts[northBay ? 'north' : 'south']++;
  }
  if (northBay && index % 2 === 0 && localNorthTop > 44.5) {
    const window = [[-1, 39.5], [1, 39.5], [1, 41.5], [-1, 41.5]];
    openings.push(recess(window, x, y, normalX, normalY, 3.8));
    archCounts.attic++;
  }
}

const shell = combine('union', [base, ...walls, deck, ...cavea, ...fragments, middle, crest, gallery, north]);
const cut = combine('difference', [shell, ...openings]);
const simplified = cut.simplify(0.032);
cut.delete();
const components = simplified.decompose();
simplified.delete();
// Polygon clipping can leave zero-volume fragments at touching boundaries.
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
  const [east, north, height] = mesh.vertProperties.subarray(3 * index, 3 * index + 3);
  return [east, height, -north];
});
const triangles = mesh.triVerts;
const vertexLinks = vertices.map(() => new Map());
let volume = 0;
for (let i = 0; i < triangles.length; i += 3) {
  const [a, b, c] = triangles.subarray(i, i + 3);
  const [[x, y, z], [u, v, w], [p, q, r]] = [vertices[a], vertices[b], vertices[c]];
  const area = Math.hypot((v - y) * (r - z) - (w - z) * (q - y), (w - z) * (p - x) - (u - x) * (r - z), (u - x) * (q - y) - (v - y) * (p - x));
  assert(area > 1e-8, 'Non-degenerate triangle');
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
assert.deepEqual(extrema[1], [0, plan.height]);

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
  bytes: glb.length, volume: Math.round(volume * 100) / 100, genus, extrema, archCounts,
}));
