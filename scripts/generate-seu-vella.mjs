import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { Earcut } from 'three/src/extras/Earcut.js';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'seu-vella-lleida';
const revision = 'r1';
const directory = new URL(`../models/${id}/${revision}/`, import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { Manifold, box, prism, turned, mesh } = await openSolids();

function footprintTriangles(rings) {
  const points = rings.flatMap(ring => ring.slice(0, -1));
  const initial = Earcut.triangulate(points.flat(), [rings[0].length - 1]);
  const twiceArea = ([a, b], [c, d], [e, f]) => (c - a) * (f - b) - (d - b) * (e - a);
  const area = (p, q, r) => twiceArea(points[p], points[q], points[r]);
  const triangles = [];
  for (let index = 0; index < initial.length; index += 3) {
    const [a, b, c] = initial.slice(index, index + 3);
    triangles.push(area(a, b, c) < 0 ? [a, b, c] : [a, c, b]);
  }
  const directed = new Map();
  const addEdge = (a, b) => {
    if (!directed.delete(`${b},${a}`)) directed.set(`${a},${b}`, [a, b]);
  };
  for (const [a, b, c] of triangles) {
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }
  const boundary = [...directed.values()];

  // Subdivide boundary edges so the foundation follows the terrace shoulder.
  for (const [a, b] of boundary.slice()) {
    const start = points[a], end = points[b];
    const count = Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / 4);
    if (count < 2) continue;
    const index = triangles.findIndex(triangle => triangle.some((v, i) => v === a && triangle[(i + 1) % 3] === b));
    assert(index >= 0);
    const third = triangles[index].find(v => v !== a && v !== b);
    const split = [a];
    for (let i = 1; i < count; i++) {
      split.push(points.length);
      points.push(start.map((value, axis) => value + (end[axis] - value) * i / count));
    }
    split.push(b);
    const edges = split.slice(1).map((v, i) => [split[i], v]);
    triangles.splice(index, 1, ...edges.map(([p, q]) => [p, q, third]));
    const edgeIndex = boundary.findIndex(([p, q]) => p === a && q === b);
    boundary.splice(edgeIndex, 1, ...edges);
  }

  // Interior samples keep the lower surface close to the DTM on long faces.
  for (let v = -43.29; v < 32; v += 5) {
    for (let u = -33.71; u < 88; u += 5) {
      const p = [u, v];
      const index = triangles.findIndex(triangle => triangle.every((vertex, i) =>
        twiceArea(points[vertex], points[triangle[(i + 1) % 3]], p) < -0.015));
      if (index < 0) continue;
      const [a, b, c] = triangles[index], k = points.length;
      points.push(p);
      triangles.splice(index, 1, [a, b, k], [b, c, k], [c, a, k]);
    }
  }
  return { points, triangles, boundary };
}

const { points, triangles, boundary } = footprintTriangles(survey.localRings);
const { start, step, values } = survey.ground;
function terrain([u, v]) {
  const x = (u - start[0]) / step, z = (v - start[1]) / step;
  const col = Math.floor(x), row = Math.floor(z);
  const dx = x - col, dz = z - row;
  const samples = [values[row][col], values[row][col + 1], values[row + 1][col], values[row + 1][col + 1]];
  assert(samples.every(Number.isFinite), 'A ground sample falls outside the ICGC crop');
  const [a, b, c, d] = samples;
  return (a * (1 - dx) + b * dx) * (1 - dz) + (c * (1 - dx) + d * dx) * dz;
}

const baseLevels = points.map(point => terrain(point) - survey.groundEmbed);
const anchorElevation = Math.min(...baseLevels);
const baseTop = 227.8;
const height = elevation => elevation - anchorElevation;
const count = points.length;
const foundationVertices = [
  ...points.flatMap(([u, v]) => [u, height(baseTop), v]),
  ...points.flatMap(([u, v], i) => [u, height(baseLevels[i]), v]),
];
const foundationFaces = [
  ...triangles.flat(),
  ...triangles.flatMap(([a, b, c]) => [a + count, c + count, b + count]),
  ...boundary.flatMap(([a, b]) => [b, a, a + count, b, a + count, b + count]),
];
const foundation = mesh(foundationVertices, foundationFaces);
assert.equal(foundation.status(), 'NoError', 'Closed terrain-fitted foundation');

function roofAlong(start, end, profile) {
  const points = [[profile[0][0], baseTop - 0.3], ...profile, [profile.at(-1)[0], baseTop - 0.3]];
  return prism(points.map(([v, h]) => [-v, height(h)]), start, end).rotate(0, 90, 0);
}

function roofAcross(start, end, profile) {
  const points = [[profile[0][0], baseTop - 0.3], ...profile, [profile.at(-1)[0], baseTop - 0.3]];
  return prism(points.map(([u, h]) => [u, height(h)]), start, end);
}

const gallery = box(-29, 27.75, height(227.5), height(233.45), -30.7, 27.4);
const canonja = roofAlong(-24.3, 28.4, [[-45, 228.9], [-38.5, 229.3], [-31, 233.3], [-27.3, 232.1]]);
const northAisle = roofAlong(25.7, 55.3, [[-36, 228.7], [-28, 230.1], [-25, 232.7], [-17.9, 233.55]]);
const southAisle = roofAlong(22.7, 53.7, [[-1.2, 233.4], [10.1, 232.5], [19.5, 229.4], [27.4, 228.35]]);
const nave = roofAlong(20.5, 59.6, [[-18.2, 239.7], [-10.1, 241.0], [-0.5, 239.9]]);
const transept = roofAcross(-39.7, 20.6, [[49.2, 238.5], [58.8, 240.8], [61.3, 241.5], [70.9, 239.5]]);
const choir = roofAlong(67.2, 78.0, [[-29.7, 232.6], [-18, 233.5], [-17.1, 239.8], [-9.8, 241.7],
  [-1.6, 239.6], [-1.0, 233.9], [16.4, 231.0]]);
const apse = turned(77.15, -10.2, [[height(227.5), 11.1], [height(238.6), 11.1],
  [height(240.1), 7.5], [height(241.7), 0.9]], 20, 0.80);
const chapels = roofAlong(72.0, 89.0, [[-30.4, 231.4], [-21.4, 234.2], [-16.9, 232.1],
  [-3.5, 232.3], [1.1, 234.1], [13.1, 233.4], [16.1, 230.2]]);

const [outerPlan, innerPlan] = survey.localRings.map((ring, index) =>
  prism(ring.slice(0, -1).map(([u, v]) => [u, -v]), -index, 1 + index));
const plan = outerPlan.subtract(innerPlan);
const section = plan.slice(0.5);
// A slight wall setback avoids coincident faces at the upper edge of the foundation.
const inset = section.offset(-0.065, 'Miter');
const outline = inset.extrude(265 - 227.4).rotate(-90, 0, 0).translate([0, height(227.4), 0]);
for (const part of [outerPlan, innerPlan, plan, section, inset]) part.delete();
assert.equal(outline.status(), 'NoError');
const roofPieces = [gallery, canonja, northAisle, southAisle, nave, transept, choir, apse, chapels];
const mass = Manifold.union(roofPieces);
const roofedWalls = mass.intersect(outline);
for (const part of [...roofPieces, mass, outline]) part.delete();

const crossing = turned(61.3, -10.0, [[height(239.5), 9.15], [height(254.7), 9.15],
  [height(255.35), 9.32], [height(255.7), 9.24], [height(259.4), 0.54]], 8, 1.12);
const southLantern = turned(54.35, 8.7, [[height(236), 3.6], [height(247.7), 3.6], [height(251.4), 0.5]], 8);

const towerCentre = [-28.75, 24.65];
const towerGround = survey.probes['bell-tower-terrace'].dtm;
const shaft = turned(...towerCentre, [
  [height(225.5), 6.3], [height(241.1), 6.3], [height(241.5), 6.52], [height(242.1), 6.32],
  [height(252.7), 6.31], [height(253.2), 6.57], [height(253.8), 6.31], [height(262.3), 6.22],
  [height(262.65), 6.85], [height(263.5), 6.85], [height(264.0), 6.1],
  [height(264.2), 4.94], [height(273.5), 4.94], [height(274.25), 5.19], [height(275.0), 5.19],
], 8);
const pinnacles = Array.from({ length: 8 }, (_, i) => {
  const theta = (i + 0.5) * Math.PI / 4;
  const u = towerCentre[0] + 4.45 * Math.cos(theta), v = towerCentre[1] + 4.45 * Math.sin(theta);
  return turned(u, v, [[height(274.65), 0.94], [height(276.65), 0.8],
    [height(towerGround + 60), 0.28]], 4);
});
const terraceCut = turned(...towerCentre, [[height(273.9), 3.47], [height(280), 3.47]], 8);

const building = Manifold.union([foundation, roofedWalls, crossing, southLantern, shaft, ...pinnacles]);
for (const part of [foundation, roofedWalls, crossing, southLantern, shaft, ...pinnacles]) part.delete();
const openings = [-18.45, -9.5, -0.55, 8.4, 17.35].map(u => prism([
  [u - 2.75, height(221.5)], [u + 2.75, height(221.5)], [u + 2.75, height(228.0)],
  [u + 1.65, height(230.4)], [u, height(232.0)], [u - 1.65, height(230.4)], [u - 2.75, height(228.0)],
], 13.0, 28.5));
const cuts = Manifold.union([terraceCut, ...openings]);
const cut = building.subtract(cuts);
const aligned = cut.rotate(0, survey.heading, 0);
const simplified = aligned.simplify(0.08);
const model = simplified.setTolerance(0.001);
for (const part of [building, cuts, terraceCut, ...openings, cut, aligned, simplified]) part.delete();

assert.equal(model.status(), 'NoError');
const components = model.decompose();
assert.equal(components.length, 1, 'The cathedral must form a single connected solid');
for (const part of components) part.delete();
assert.equal(model.rayCast([0, 58, 0], [0, -2, 0]).length, 0, 'The cloister courtyard stays open');
const attribution = 'Open Place Models contributors (reconstruction); ICGC terrain, surface and orthophoto (CC BY 4.0); footprint © OpenStreetMap contributors (ODbL 1.0).';
const { glb, min, max, vertices, triangles: triangleCount } = printGlb(model, attribution, [0.30, 0.66, 1.0]);
assert(Math.abs(min[1]) < 0.001 && Math.abs(max[1] + anchorElevation - (towerGround + 60)) < 0.001);
const volume = model.volume();
model.delete();

const outer = survey.footprint[0];
const bbox = [0, 1].map(axis => Math.min(...outer.map(point => point[axis])))
  .concat([0, 1].map(axis => Math.max(...outer.map(point => point[axis]))));
const sources = [
  'https://patrimoni.gencat.cat/en/collection/seu-vella',
  'https://drac.cultura.gencat.cat/handle/20.500.12368/36310',
  'https://www.lleidaturisme.cat/ca/recursos/llibret-top10_v6_cat-i-cast.pdf',
  'https://whc.unesco.org/en/tentativelists/6079/',
  'https://www.icgc.cat/en/Geoinformation-and-Maps/Data-and-products/Elevations/Territorial-elevations/Elevation-models',
  'https://www.icgc.cat/es/Geoinformacion-y-mapas/Datos-y-productos/Imagen/Ortofoto-Territorial',
  'https://www.openstreetmap.org/relation/4008211',
];
const feature = {
  type: 'Feature', id, bbox, geometry: { type: 'Polygon', coordinates: survey.footprint },
  properties: {
    name: 'Seu Vella de Lleida', place: 'Lleida, Spain', city: 'Lleida', country: 'Spain',
    geometryType: 'monument', aliases: ['La Seu Vella', 'Catedral vella de Lleida', 'Old Cathedral of Lleida', 'Seo Vieja de Lérida'],
    revision, anchor: survey.anchor, anchorElevation: Number(anchorElevation.toFixed(3)), height: Number(max[1].toFixed(3)),
    mesh: `models/${id}/${revision}/print.glb`, thumbnail: `models/${id}/${revision}/thumbnail.webp`,
    byteLength: glb.length, license: 'CC-BY-4.0', spatialDataLicense: 'ODbL-1.0', attribution,
    replacement: { featureIds: ['osm-relation-4008211'] },
    sources,
  },
};
await writeFile(new URL('print.glb', directory), glb);
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
console.log(JSON.stringify({ bytes: glb.length, vertices, triangles: triangleCount, min, max, volume, anchorElevation }));
