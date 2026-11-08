import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { Earcut } from 'three/src/extras/Earcut.js';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'monestir-poblet';
const revision = 'r1';
const directory = new URL('../models/monestir-poblet/r1/', import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { Manifold, prism, turned, mesh } = await openSolids();

function footprintTriangles(rings) {
  const points = rings.flatMap(ring => ring.slice(0, -1));
  const indices = Earcut.triangulate(points.flat(), [rings[0].length - 1]);
  const twiceArea = ([a, b], [c, d], [e, f]) => (c - a) * (f - b) - (d - b) * (e - a);
  const triangles = [];
  const edges = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = indices.slice(i, i + 3);
    const triangle = twiceArea(points[a], points[b], points[c]) < 0 ? [a, b, c] : [a, c, b];
    triangles.push(triangle);
    triangle.forEach((p, j) => {
      const q = triangle[(j + 1) % 3];
      if (!edges.delete(q + ',' + p)) edges.set(p + ',' + q, [p, q]);
    });
  }

  const boundary = [];
  for (const [a, b] of edges.values()) {
    const start = points[a], end = points[b];
    const segments = Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / 5);
    const split = [a];
    for (let i = 1; i < segments; i++) {
      split.push(points.length);
      points.push(start.map((value, axis) => value + (end[axis] - value) * i / segments));
    }
    split.push(b);
    const parts = split.slice(1).map((p, i) => [split[i], p]);
    boundary.push(...parts);
    if (segments < 2) continue;
    const index = triangles.findIndex(t => t.some((p, i) => p === a && t[(i + 1) % 3] === b));
    assert(index >= 0);
    const third = triangles[index].find(p => p !== a && p !== b);
    triangles.splice(index, 1, ...parts.map(([p, q]) => [p, q, third]));
  }

  // Interior samples keep the foundation below terrain under the long roofs.
  for (let v = -13.3; v < 55; v += 6) {
    for (let u = -31.7; u < 52; u += 6) {
      const point = [u, v];
      const index = triangles.findIndex(t => t.every((p, i) =>
        twiceArea(points[p], points[t[(i + 1) % 3]], point) < -0.015));
      if (index < 0) continue;
      const [a, b, c] = triangles[index], next = points.length;
      points.push(point);
      triangles.splice(index, 1, [a, b, next], [b, c, next], [c, a, next]);
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
  assert(samples.every(Number.isFinite), 'Foundation fits inside the measured terrain grid');
  const [a, b, c, d] = samples;
  return (a * (1 - dx) + b * dx) * (1 - dz) + (c * (1 - dx) + d * dx) * dz;
}

const baseLevels = points.map(point => terrain(point) - survey.groundEmbed);
const anchorElevation = Math.min(...baseLevels);
const baseTop = 496.0;
const roofBase = baseTop - 0.35;
const height = elevation => elevation - anchorElevation;
const count = points.length;
const foundation = mesh([
  ...points.flatMap(([u, v]) => [u, height(baseTop), v]),
  ...points.flatMap(([u, v], i) => [u, height(baseLevels[i]), v]),
], [
  ...triangles.flat(),
  ...triangles.flatMap(([a, b, c]) => [a + count, c + count, b + count]),
  ...boundary.flatMap(([a, b]) => [b, a, a + count, b, a + count, b + count]),
]);
assert.equal(foundation.status(), 'NoError');

function roofAlong(start, end, profile) {
  const points = [[profile[0][0], roofBase], ...profile, [profile.at(-1)[0], roofBase]];
  return prism(points.map(([v, level]) => [-v, height(level)]), start, end).rotate(0, 90, 0);
}

function roofAcross(start, end, profile) {
  const points = [[profile[0][0], roofBase], ...profile, [profile.at(-1)[0], roofBase]];
  return prism(points.map(([u, level]) => [u, height(level)]), start, end);
}

const westGallery = roofAcross(-17.2, 20.1, [[-21.8, 498.8], [-19.5, 499.0], [-14.3, 497.8]]);
const eastGallery = roofAcross(-17.2, 20.1, [[14.4, 497.8], [19.5, 498.9], [21.8, 498.7]]);
const northGallery = roofAlong(-21.8, 21.7, [[-17.2, 498.75], [-15.9, 498.9], [-12.7, 498.0]]);
const southGallery = roofAlong(-21.8, 21.7, [[12.8, 498.1], [17.2, 499.0], [20.1, 498.8]]);
const lavatoriumLink = roofAlong(1.7, 6.2, [[-14.1, 498.6], [-10, 498.7], [-7.8, 498.4]]);
const lavatorium = turned(0, 0, [[height(roofBase), 5.9], [height(498.3), 5.9],
  [height(499.55), 0.52]], 6).rotate(0, 30, 0).translate([3.72, 0, -5.28]);

const churchWest = roofAlong(-34.6, -28.0, [[18.4, 502.0], [24.4, 511.7], [31.9, 514.65],
  [39.3, 510.7], [45.7, 506.5]]);
const northAisle = roofAlong(-29.2, 23.0, [[18.5, 502.1], [24.0, 503.25], [27.0, 502.5]]);
const nave = roofAlong(-29.0, 37.5, [[24.15, 511.55], [31.55, 514.55], [39.35, 511.2]]);
const southAisle = roofAlong(-32.0, 30.0, [[38.6, 506.3], [42.0, 504.55], [46.9, 501.9]]);
const southChapel = roofAlong(-26.7, -16.8, [[43.4, 504.75], [47.6, 506.0], [52.6, 502.5]]);
const transept = roofAcross(13.5, 49.35, [[18.9, 511.0], [26.4, 514.1], [35.9, 511.25]]);
const apseAmbulatory = roofAlong(34.9, 52.3, [[13.2, 501.1], [29.2, 503.2], [40.9, 502.9], [48.2, 501.0]]);
const apseUpper = turned(37.7, 32.55, [[height(roofBase), 7.0], [height(511.85), 7.0],
  [height(513.7), 2.3]], 14, 1.13);
const eastAnnex = roofAlong(28.25, 38.3, [[44.7, 508.4], [49.1, 511.8], [54.9, 501.8]]);

const [outer, inner] = survey.localRings.map((ring, index) =>
  prism(ring.slice(0, -1).map(([u, v]) => [u, -v]), -index, index + 1));
const plan = outer.subtract(inner);
const section = plan.slice(0.5);
const inset = section.offset(-0.065, 'Miter');
const outline = inset.extrude(537 - roofBase).rotate(-90, 0, 0).translate([0, height(roofBase), 0]);
for (const part of [outer, inner, plan, section, inset]) part.delete();

const roofPieces = [westGallery, eastGallery, northGallery, southGallery, lavatoriumLink, lavatorium,
  churchWest, northAisle, nave, southAisle, southChapel, transept, apseAmbulatory, apseUpper, eastAnnex];
const mass = Manifold.union(roofPieces);
const roofedWalls = mass.intersect(outline);
for (const part of [...roofPieces, mass, outline]) part.delete();

const crossing = turned(26.45, 32.0, [[height(511.0), 7.05], [height(526.8), 7.05],
  [height(527.4), 7.32], [height(528.1), 7.32], [height(532.7), 3.0],
  [height(534.383), 0.65]], 8, 1.04);
const northBell = prism([[22.6, height(511.0)], [29.9, height(511.0)], [29.9, height(522.8)],
  [28.0, height(525.1)], [25.1, height(525.1)], [22.6, height(522.8)]], 14.55, 17.65);
const southBell = turned(26.05, 46.1, [[height(511.2), 4.7], [height(518.1), 4.7], [height(520.65), 3.8],
  [height(521.8), 2.35], [height(522.65), 1.8], [height(523.65), 0.52]], 8, 0.83);
const building = Manifold.union([foundation, roofedWalls, crossing, northBell, southBell]);

// Keep a backing on the arcade recesses so the gallery roofs print as one piece.
function arcade(centres, from, to, rotation, crown) {
  return centres.map(centre => prism([
    [centre - 1.47, height(492.8)], [centre + 1.47, height(492.8)], [centre + 1.47, height(495.0)],
    [centre + 1.0, height(crown - 0.45)], [centre, height(crown)],
    [centre - 1.0, height(crown - 0.45)], [centre - 1.47, height(495.0)],
  ], from, to).rotate(0, rotation, 0));
}

const bays = [-12.3, -7.4, -2.5, 2.4, 7.3, 12.2];
const sideBays = [-10.9, -6.55, -2.2, 2.15, 6.5, 10.85];
const arches = [
  ...arcade(bays, 13.06, 14.53, 0, 496.6),
  ...arcade([-12.3, -7.4, -2.5, 12.2], -14.56, -13.10, 0, 497.15),
  ...arcade(sideBays, 14.48, 15.89, 90, 497.05),
  ...arcade(sideBays, -15.86, -14.43, 90, 497.05),
];
const arcadeVoids = Manifold.union(arches);
const carved = building.subtract(arcadeVoids);
const aligned = carved.rotate(0, survey.heading, 0);
const simplified = aligned.simplify(0.075);
const model = simplified.setTolerance(0.001);
for (const part of [foundation, roofedWalls, crossing, northBell, southBell, building,
  ...arches, arcadeVoids, carved, aligned, simplified]) part.delete();

assert.equal(model.status(), 'NoError');
const components = model.decompose();
assert.equal(components.length, 1, 'The church, cloister and lavatorium form one connected solid');
for (const part of components) part.delete();
assert.equal(model.rayCast([0, 49, 0], [0, -2, 0]).length, 0, 'The cloister courtyard stays open');
const attribution = 'Open Place Models contributors (reconstruction); ICGC terrain, surface and orthophoto (CC BY 4.0); footprint © OpenStreetMap contributors (ODbL 1.0).';
const { glb, min, max, vertices, triangles: triangleCount } = printGlb(model, attribution, [0.78, 0.86, -1]);
assert(Math.abs(min[1]) < 0.001 && Math.abs(max[1] + anchorElevation - 534.383) < 0.001);
const volume = model.volume();
model.delete();

const exterior = survey.footprint[0];
const bbox = [0, 1].map(axis => Math.min(...exterior.map(point => point[axis])))
  .concat([0, 1].map(axis => Math.max(...exterior.map(point => point[axis]))));
const feature = {
  type: 'Feature', id, bbox, geometry: { type: 'Polygon', coordinates: survey.footprint },
  properties: {
    name: 'Monestir de Poblet', place: 'Vimbodí i Poblet, Spain', city: 'Vimbodí i Poblet', country: 'Spain',
    geometryType: 'monument', aliases: ['Reial Monestir de Santa Maria de Poblet', 'Poblet Abbey', 'Royal Abbey of Santa Maria de Poblet'],
    revision, anchor: survey.anchor, anchorElevation: Number(anchorElevation.toFixed(3)), height: Number(max[1].toFixed(3)),
    mesh: 'models/monestir-poblet/r1/print.glb', thumbnail: 'models/monestir-poblet/r1/thumbnail.webp',
    byteLength: glb.length, license: 'CC-BY-4.0', spatialDataLicense: 'ODbL-1.0', attribution,
    replacement: { featureIds: ['osm-way-174173363', 'osm-relation-2325532'] },
    sources: [
      'https://www.poblet.cat/ca/el-monument/esglesia-major/',
      'https://www.poblet.cat/ca/el-monument/claustre-major/',
      'https://whc.unesco.org/en/list/518/',
      'https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023',
      'https://catalegs.ide.cat/geonetwork/hub-litoral/api/records/model-superficies-lidar-catalunya-1m-2021-2023',
      'https://www.openstreetmap.org/way/174173363',
      'https://www.openstreetmap.org/relation/2325532',
    ],
  },
};
await writeFile(new URL('print.glb', directory), glb);
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
console.log(JSON.stringify({ bytes: glb.length, vertices, triangles: triangleCount, min, max, volume, anchorElevation }));
