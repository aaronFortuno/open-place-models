import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { Earcut } from 'three/src/extras/Earcut.js';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'monestir-santes-creus';
const revision = 'r1';
const directory = new URL('../models/monestir-santes-creus/r1/', import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { Manifold, box, prism, turned, mesh } = await openSolids();

function footprintTriangles(rings) {
  const points = rings.flatMap(ring => ring.slice(0, -1));
  let offset = 0;
  const holes = rings.slice(0, -1).map(ring => offset += ring.length - 1);
  const indices = Earcut.triangulate(points.flat(), holes);
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
    const segments = Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / 6);
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
  for (let v = -53.3; v < 54; v += 7) {
    for (let u = -31.7; u < 102; u += 7) {
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
const baseTop = 319.20;
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


const cloisterWest = roofAcross(-19.0, 20.4, [[-20.5, 323.0], [-17.9, 324.0], [-11.8, 322.4]]);
const cloisterEast = roofAcross(-18.7, 24.3, [[16.0, 322.35], [19.2, 323.15], [23.6, 324.0]]);
const cloisterNorth = roofAlong(-20.4, 23.8, [[-21.1, 325.75], [-17.2, 323.8], [-11.7, 322.55]]);
const cloisterSouth = roofAlong(-20.4, 23.8, [[10.9, 322.1], [16.4, 323.1], [20.3, 323.15]]);
const fountainLink = roofAlong(2.45, 9.3, [[9.6, 321.3], [11.8, 321.9], [14.1, 322.1]]);
const fountain = turned(5.78, 8.88, [[height(roofBase), 5.85], [height(321.1), 5.85],
  [height(322.65), 0.58]], 6);
const nave = roofAlong(-35, 31.4, [[-37.5, 333.95], [-31.05, 335.65], [-22.9, 333.95]]);
const northAisle = roofAlong(-35, 23.4, [[-47.0, 326.0], [-40.0, 327.25], [-35.7, 327.9]]);
const southAisle = roofAlong(-35, 25.0, [[-25.2, 327.9], [-22.0, 326.7], [-17.2, 325.7]]);
const transept = roofAcross(-57, -10.2, [[19.7, 334.10], [27.05, 336.45], [34.3, 334.1]]);
const eastApse = roofAlong(31.8, 43.0, [[-42.75, 333.85], [-35.1, 335.45], [-27.0, 333.85]]);
const chapterAndDormitory = roofAcross(-17.2, 45.7, [[20.15, 327.9], [28.70, 330.75],
  [39.8, 328.3]]);
const southWing = roofAcross(23.0, 46.7, [[11.2, 329.3], [18.7, 331.75],
  [26.7, 329.5]]);

// The rear cloister and palace wing are skewed relative to the nave.
const rearAngle = 7.1;
function rearRoof(start, end, profile) {
  const part = roofAlong(start, end, profile);
  const shifted = part.translate([0, 0, -20]);
  const rotated = shifted.rotate(0, rearAngle, 0);
  const result = rotated.translate([50, 0, 20]);
  for (const piece of [part, shifted, rotated]) piece.delete();
  return result;
}
const rearNorth = rearRoof(-17, 24.0, [[4.3, 321.5], [7.7, 322.3], [14.4, 321.3]]);
const rearEast = rearRoof(17.0, 23.9, [[9.9, 322.35], [25.0, 322.25], [35.9, 322.5]]);
const rearSouth = rearRoof(-16.5, 26.9, [[28.2, 322.2], [31.5, 322.9], [35.8, 324.0]]);
const palace = rearRoof(-19, 48.5, [[33.2, 326.55], [39.9, 329.65], [45.9, 327.5], [56.6, 326.3]]);
const palaceEast = roofAcross(25.1, 53.8, [[75.6, 326.5], [90.0, 329.6], [101.1, 328.0]]);
const connectingWall = roofAlong(35.0, 76.1, [[2.4, 321.5], [21.0, 321.1], [44.1, 321.6]]);
const frontWall = roofAlong(-35, -32.30, [[-46.0, 327.5], [-37.2, 327.6],
  [-36.9, 335.35], [-23.25, 335.35], [-22.9, 328.35], [-17.95, 328.25]]);

const [outer, ...courts] = survey.localRings.map((ring, index) =>
  prism(ring.slice(0, -1).map(([u, v]) => [u, -v]), -index, 1 + index));
const courtsSolid = Manifold.union(courts);
const plan = outer.subtract(courtsSolid);
const section = plan.slice(0.5);
const inset = section.offset(-0.065, 'Miter');
const outline = inset.extrude(355 - roofBase).rotate(-90, 0, 0).translate([0, height(roofBase), 0]);
for (const part of [outer, ...courts, courtsSolid, plan, section, inset]) part.delete();
const roofPieces = [cloisterWest, cloisterEast, cloisterNorth, cloisterSouth, fountainLink, fountain,
  nave, northAisle, southAisle, transept, eastApse, chapterAndDormitory, southWing,
  rearNorth, rearEast, rearSouth, palace, palaceEast, connectingWall, frontWall];
const mass = Manifold.union(roofPieces);
const roofedWalls = mass.intersect(outline);
for (const part of [...roofPieces, mass, outline]) part.delete();

const crossingTop = survey.probes['crossing-lantern-peak'].dsm;
const crossing = turned(26.95, -29.9, [[height(334.5), 5.7], [height(345.1), 5.7],
  [height(345.62), 5.95], [height(346.25), 5.8], [height(348.1), 4.75],
  [height(349.73), 3.32], [height(350.68), 1.45], [height(351.85), 1.36],
  [height(352.8), 0.74], [height(crossingTop), 0.41]], 8);
const towerTop = survey.probes['clock-tower-peak'].dsm;
const clockShaft = box(29.0, 36.1, height(328.3), height(towerTop - 0.85), -17.2, -10.0);
const clockCornice = box(28.84, 36.26, height(towerTop - 1.10), height(towerTop - 0.52), -17.36, -9.85);
const clockParapet = box(29.03, 36.08, height(towerTop - 0.79), height(towerTop), -17.14, -10.08);
const clockCrown = box(29.94, 35.15, height(towerTop - 0.57), height(towerTop + 0.16), -16.24, -10.98);

const merlons = [-35.65, -32.96, -30.27, -27.58, -24.89].map(v =>
  box(-33.90, -32.54, height(334.95), height(336.75), v - 0.72, v + 0.72));
const volumes = [foundation, roofedWalls, crossing, clockShaft, clockCornice, clockParapet, ...merlons];
const building = Manifold.union(volumes);
for (const part of volumes) part.delete();

function pointedOpening(centre, half, bottom, spring, crown, from, to, turn) {
  const profile = [[centre - half, height(bottom)], [centre + half, height(bottom)],
    [centre + half, height(spring)], [centre + half * 0.60, height(crown - 0.52)], [centre, height(crown)],
    [centre - half * 0.60, height(crown - 0.52)], [centre - half, height(spring)]];
  const solid = prism(profile, from, to);
  const rotated = solid.rotate(0, turn, 0);
  solid.delete();
  return rotated;
}

const facadeWindow = pointedOpening(-30.85, 2.28, 325.32, 330.05, 332.85, 32.4, 36.1, -90);
const facadePortal = pointedOpening(-30.78, 2.1, 316.1, 318.75, 321.52, 32.65, 36.1, -90);
const towerWindow = pointedOpening(32.54, 0.95, 342.0, 344.2, 344.95, -10.79, -9.4, 0);
const mainBays = [-10.0, -4.85, 0.3, 5.45, 10.6, 15.05];
const northArches = mainBays.map(u => pointedOpening(u, 1.46, 316.3, 318.4, 320.75, -13.95, -11.7, 0));
const westArches = [-9.6, -4.75, 0.1, 4.95, 9.68].map(v =>
  pointedOpening(-v, 1.44, 316.3, 318.35, 320.70, -13.72, -11.95, 90));
const eastArches = [-9.6, -4.75, 0.1, 4.95, 9.68].map(v =>
  pointedOpening(-v, 1.44, 316.3, 318.35, 320.70, 16.30, 18.73, 90));
const cuts = [facadeWindow, facadePortal, towerWindow, clockCrown, ...northArches, ...westArches, ...eastArches];
const voids = Manifold.union(cuts);
const carved = building.subtract(voids);
const aligned = carved.rotate(0, survey.heading, 0);
const simplified = aligned.simplify(0.075);
const model = simplified.setTolerance(0.001);
for (const part of [building, ...cuts, voids, carved, aligned, simplified]) part.delete();

assert.equal(model.status(), 'NoError');
const components = model.decompose();
assert.equal(components.length, 1, 'Both cloisters and the church form one connected solid');
for (const part of components) part.delete();
const angle = survey.heading * Math.PI / 180;
for (const [u, v] of [[0, 0], [49, 21]]) {
  const x = u * Math.cos(angle) + v * Math.sin(angle);
  const z = -u * Math.sin(angle) + v * Math.cos(angle);
  assert.equal(model.rayCast([x, 50, z], [x, -3, z]).length, 0, 'Both cloister courtyards stay open');
}

const attribution = 'Open Place Models contributors (reconstruction); ICGC terrain, surface and orthophoto (CC BY 4.0); footprint © OpenStreetMap contributors (ODbL 1.0).';
const { glb, min, max, vertices, triangles: triangleCount } = printGlb(model, attribution, [-0.66, 0.79, 1]);
assert(Math.abs(min[1]) < 0.001 && Math.abs(max[1] + anchorElevation - crossingTop) < 0.001);
const volume = model.volume();
model.delete();

const exterior = survey.footprint[0];
const bbox = [0, 1].map(axis => Math.min(...exterior.map(point => point[axis])))
  .concat([0, 1].map(axis => Math.max(...exterior.map(point => point[axis]))));
const feature = {
  type: 'Feature', id, bbox, geometry: { type: 'Polygon', coordinates: survey.footprint },
  properties: {
    name: 'Reial Monestir de Santes Creus', place: 'Aiguamúrcia, Spain', city: 'Aiguamúrcia', country: 'Spain',
    geometryType: 'monument', aliases: ['Monestir de Santes Creus', 'Santes Creus', 'Santes Creus Abbey', 'Royal Monastery of Santes Creus'],
    revision, anchor: survey.anchor, anchorElevation: Number(anchorElevation.toFixed(3)), height: Number(max[1].toFixed(3)),
    mesh: 'models/monestir-santes-creus/r1/print.glb', thumbnail: 'models/monestir-santes-creus/r1/thumbnail.webp',
    byteLength: glb.length, license: 'CC-BY-4.0', spatialDataLicense: 'ODbL-1.0', attribution,
    replacement: { featureIds: ['osm-relation-3628735'] },
    sources: [
      'https://patrimoni.gencat.cat/ca/monuments/monuments/reial-monestir-de-santes-creus/reial-monestir-de-santes-creus',
      'https://www.enciclopedia.cat/lart-gotic-a-catalunya/el-monestir-de-santes-creus-segles-xii-xiii',
      'https://www.enciclopedia.cat/lart-gotic-a-catalunya/el-monestir-de-santes-creus-segles-xiv-xv',
      'https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023',
      'https://catalegs.ide.cat/geonetwork/hub-litoral/api/records/model-superficies-lidar-catalunya-1m-2021-2023',
      'https://www.openstreetmap.org/relation/3628735',
    ],
  },
};
await writeFile(new URL('print.glb', directory), glb);
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
console.log(JSON.stringify({ bytes: glb.length, vertices, triangles: triangleCount, min, max, volume, anchorElevation }));
