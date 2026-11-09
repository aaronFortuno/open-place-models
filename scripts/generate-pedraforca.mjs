import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'pedraforca';
const folder = new URL(`../models/${id}/r1/`, import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', folder), 'utf8'));
const { grid, anchor, outline } = survey;
const [west, south, east, north] = grid.bounds;
const divisions = grid.divisions, stride = divisions + 1;
const stepEast = (east - west) / divisions, stepSouth = (north - south) / divisions;
const source = gunzipSync(await readFile(new URL('source-grid.bin.gz', folder)));
assert.equal(source.byteLength, 2 * stride ** 2);
assert.equal(createHash('sha256').update(source).digest('hex'), grid.uncompressedSHA256);

const key = (x, z) => x + z * stride;
const heights = new Float32Array(stride ** 2);
let lowest = Infinity;
for (let z = 0; z <= divisions; z++) {
  let decimetres = 0;
  for (let x = 0; x <= divisions; x++) {
    const i = key(x, z);
    decimetres += source.readInt16LE(2 * i);
    heights[i] = decimetres / 10;
    lowest = Math.min(lowest, heights[i]);
  }
}
const base = Math.floor((lowest - 18) / 5) * 5;
const pins = survey.pins.map(pin => ({ ...pin, x: (pin.utm[0] - west) / stepEast, z: (north - pin.utm[1]) / stepSouth }));

function elevation(x, z) { return heights[key(x, z)]; }

// Rank cells by the largest height error of the four triangles around their centre.
function cell(x, z, size) {
  const nw = elevation(x, z), ne = elevation(x + size, z);
  const sw = elevation(x, z + size), se = elevation(x + size, z + size);
  const centre = elevation(x + size / 2, z + size / 2);
  let error = 0;
  for (let j = 0; j <= size; j++) {
    const v = j / size;
    for (let i = 0; i <= size; i++) {
      const u = i / size;
      let value;
      if (v <= u && v <= 1 - u) value = (1 - u - v) * nw + (u - v) * ne + 2 * v * centre;
      else if (u <= v && u <= 1 - v) value = (1 - v - u) * nw + (v - u) * sw + 2 * u * centre;
      else if (1 - v <= u && 1 - v <= 1 - u) value = (v - u) * sw + (u + v - 1) * se + 2 * (1 - v) * centre;
      else value = (u - v) * ne + (u + v - 1) * se + 2 * (1 - u) * centre;
      error = Math.max(error, Math.abs(elevation(x + i, z + j) - value));
    }
  }
  const containsPin = size > 8 && pins.some(pin => pin.x >= x && pin.x < x + size && pin.z >= z && pin.z < z + size);
  return { x, z, size, priority: error + (containsPin ? 1000 : 0) };
}

const outside = (x, z) => x === 0 || z === 0 || x === divisions || z === divisions;
const corners = new Set([key(0, 0), key(0, divisions), key(divisions, divisions), key(divisions, 0)]);
let borderCount = corners.size;
const leaves = [cell(0, 0, divisions)];
const vertexLimit = 1200;
while (true) {
  leaves.sort((a, b) => b.priority - a.priority);
  let index = 0, additions = [];
  for (; index < leaves.length; index++) {
    const { x, z, size } = leaves[index];
    if (size <= 2) continue;
    const h = size / 2;
    additions = [[x + h, z], [x + h, z + size], [x, z + h], [x + size, z + h], [x + h, z + h]]
      .filter(([i, j]) => !corners.has(key(i, j)));
    const vertices = corners.size + additions.length + leaves.length + 3 + borderCount
      + additions.filter(([i, j]) => outside(i, j)).length + pins.length + 1;
    if (vertices <= vertexLimit) break;
  }
  if (index === leaves.length) break;
  const [{ x, z, size }] = leaves.splice(index, 1), h = size / 2;
  for (const [i, j] of additions) {
    corners.add(key(i, j));
    if (outside(i, j)) borderCount++;
  }
  leaves.push(cell(x, z, h), cell(x + h, z, h), cell(x, z + h, h), cell(x + h, z + h, h));
}

function perimeter(x, z, size) {
  const ring = [];
  for (let i = 0; i < size; i++) ring.push([x, z + i]);
  for (let i = 0; i < size; i++) ring.push([x + i, z + size]);
  for (let i = 0; i < size; i++) ring.push([x + size, z + size - i]);
  for (let i = 0; i < size; i++) ring.push([x + size - i, z]);
  return ring.filter(([i, j]) => corners.has(key(i, j)));
}

const points = [], indexed = new Map();
function gridPoint(x, z) {
  const id = key(x, z);
  if (!indexed.has(id)) {
    indexed.set(id, points.length);
    points.push([x, z, elevation(x, z)]);
  }
  return indexed.get(id);
}

for (const leaf of leaves) {
  const { x, z, size } = leaf;
  const ring = perimeter(x, z, size).map(([i, j]) => gridPoint(i, j));
  const centre = gridPoint(x + size / 2, z + size / 2);
  leaf.faces = ring.map((a, i) => [centre, a, ring[(i + 1) % ring.length]]);
}

function weights(face, x, z) {
  const [[ax, az], [bx, bz], [cx, cz]] = face.map(index => points[index]);
  const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
  const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d;
  const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
  const t = 1 - u - v;
  return Math.min(u, v, t) >= -1e-8 ? [u, v, t] : undefined;
}

for (const pin of pins) {
  const existing = points.find(point => Math.hypot(point[0] - pin.x, point[1] - pin.z) < 1e-8);
  if (existing) {
    existing[2] = pin.elevation;
    continue;
  }
  const index = points.length;
  points.push([pin.x, pin.z, pin.elevation]);
  let used = false;
  for (const leaf of leaves) {
    if (pin.x < leaf.x || pin.z < leaf.z || pin.x > leaf.x + leaf.size || pin.z > leaf.z + leaf.size) continue;
    leaf.faces = leaf.faces.flatMap(face => {
      const hit = weights(face, pin.x, pin.z);
      if (!hit) return [face];
      used = true;
      return face.flatMap((a, i) => hit[(i + 2) % 3] > 1e-8 ? [[a, face[(i + 1) % 3], index]] : []);
    });
  }
  assert(used, pin.name);
}

const residuals = [];
let sumSquares = 0;
for (const { x, z, size, faces } of leaves) {
  const endX = x + size, endZ = z + size;
  for (let j = z; j < endZ + Number(endZ === divisions); j++) {
    for (let i = x; i < endX + Number(endX === divisions); i++) {
      let height;
      for (const face of faces) {
        const hit = weights(face, i, j);
        if (!hit) continue;
        height = hit.reduce((sum, weight, k) => sum + weight * points[face[k]][2], 0);
        break;
      }
      assert(Number.isFinite(height));
      const error = Math.abs(elevation(i, j) - height);
      residuals.push(error);
      sumSquares += error * error;
    }
  }
}
assert.equal(residuals.length, heights.length);
residuals.sort((a, b) => a - b);
const metrics = { rmse: Math.sqrt(sumSquares / residuals.length), p95: residuals[Math.ceil(residuals.length * .95) - 1],
  max: residuals.at(-1) };

const [[eastE, eastN], [northE, northN]] = anchor.eastNorth;
function world(x, z, height) {
  const e = west + x * stepEast - anchor.utm[0], n = north - z * stepSouth - anchor.utm[1];
  return [eastE * e + eastN * n, height - base, -northE * e - northN * n];
}

const top = leaves.flatMap(leaf => leaf.faces.flat());
const ring = perimeter(0, 0, divisions).map(([x, z]) => gridPoint(x, z));
const vertices = points.flatMap(([x, z, height]) => world(x, z, height));
const lower = vertices.length / 3;
for (const i of ring) vertices.push(...world(points[i][0], points[i][1], base));
const centre = vertices.length / 3;
vertices.push(...world(divisions / 2, divisions / 2, base));
const triangles = [...top];
for (let i = 0; i < ring.length; i++) {
  const j = (i + 1) % ring.length, a = ring[i], b = ring[j], c = lower + i, d = lower + j;
  triangles.push(b, a, c, b, c, d, d, c, centre);
}

const { mesh } = await openSolids();
const solid = mesh(vertices, triangles);
assert.equal(solid.status(), 'NoError');
assert.equal(solid.decompose().length, 1);
const camera = [-1, .20, -.11];
const attribution = 'Open Place Models contributors (adaptive triangulation). Terrain © Institut Cartogràfic i Geològic de Catalunya, CC BY 4.0.';
const { glb, min, max, triangles: faceCount } = printGlb(solid, attribution, camera);
assert.equal(min[1], 0);
assert(glb.length < 31000);

const controls = pins.map(pin => {
  const [x, , z] = world(pin.x, pin.z, pin.elevation);
  const [hit] = solid.rayCast([x, max[1] + 30, z], [x, -1, z]);
  assert(hit, pin.name);
  const height = hit.position[1] + base;
  assert(Math.abs(height - pin.elevation) < .05, `${pin.name} ${height} m`);
  return { name: pin.name, observed: pin.elevation, model: Number(height.toFixed(2)) };
});
await writeFile(new URL('print.glb', folder), glb);

const [candidate] = process.argv.slice(2);
if (candidate) {
  const directory = `models/${id}/r1/`;
  const entry = { type: 'Feature', id, bbox: outline.bbox, geometry: { type: 'Polygon', coordinates: [outline.polygon] }, properties: {
    kind: 'terrain', geometryType: 'terrain', name: 'Pedraforca', place: 'Saldes and Gósol, Catalonia, Spain',
    city: 'Saldes / Gósol', country: 'Spain', aliases: ['Massís del Pedraforca', 'Pollegó Superior'],
    revision: 'r1', anchor: anchor.coordinates, height: Number(max[1].toFixed(4)),
    mesh: directory + 'print.glb', byteLength: glb.length, thumbnail: directory + 'thumbnail.webp',
    license: 'CC-BY-4.0', spatialDataLicense: 'CC-BY-4.0', attribution,
    sources: [
      'https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/pedraforca/el-paratge/patrimoni-natural-i-cultural/paisatge/',
      'https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/cadi/gaudeix-del-parc/guia-de-visita/arees-dinteres/interes-geologic/grans-arees-interes/massis-del-pedraforca/',
      'https://www.feec.cat/activitats/100-cims/cim/pollego-superior-pedraforca/',
      'https://www.feec.cat/agenda/activitats/100-cims/pollego-superior-100-cims/',
      'https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat',
      'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-cartografica/Noms-geografics'
    ]
  } };
  await writeFile(candidate, JSON.stringify(entry, null, 2) + '\n');
}
console.log(JSON.stringify({ base, height: max[1], faceCount, bytes: glb.length, metrics, controls,
  sha256: createHash('sha256').update(glb).digest('hex') }));
