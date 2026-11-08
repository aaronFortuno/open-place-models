import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'elizabeth-tower';
const revision = 'r1';
const directory = new URL('../models/elizabeth-tower/r1/', import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { Manifold, box, plate, prism, turned, mesh } = await openSolids();
const embed = survey.nominalGrade - survey.baseElevation;
const y = height => height + embed;
const quarterTurns = [0, 90, 180, 270];

function squareLoft(levels) {
  const ring = ([height, half, bevel]) => [
    [half - bevel, -half], [half, bevel - half], [half, half - bevel], [half - bevel, half],
    [bevel - half, half], [-half, half - bevel], [-half, bevel - half], [bevel - half, -half],
  ].flatMap(([x, z]) => [x, y(height), z]);
  const corners = 8;
  const vertices = levels.flatMap(ring);
  const faces = [];
  const last = (levels.length - 1) * corners, centre = levels.length * corners;
  vertices.push(0, y(levels[0][0]), 0, 0, y(levels.at(-1)[0]), 0);
  for (let i = 0; i < corners; i++) {
    const next = (i + 1) % corners;
    faces.push(centre, i, next, centre + 1, last + next, last + i);
    for (let offset = 0; offset < last; offset += corners) {
      const a = offset + i, b = offset + next;
      faces.push(a, a + corners, b, b, a + corners, b + corners);
    }
  }
  return mesh(vertices, faces);
}

const phi = survey.anchor[1] * Math.PI / 180;
const a = 6378137, eccentricitySquared = 0.0066943799901413165;
const latitudeFactor = 1 - eccentricitySquared * Math.sin(phi) ** 2;
const metresPerLongitude = a * Math.cos(phi) / Math.sqrt(latitudeFactor) * Math.PI / 180;
const metresPerLatitude = a * (1 - eccentricitySquared) / latitudeFactor ** 1.5 * Math.PI / 180;
const angle = survey.heading * Math.PI / 180;
const cos = Math.cos(angle), sin = Math.sin(angle);
const localFootprint = survey.footprint.slice(0, -1).map(([lon, lat]) => {
  const east = (lon - survey.anchor[0]) * metresPerLongitude;
  const north = (lat - survey.anchor[1]) * metresPerLatitude;
  return [east * cos + north * sin, east * sin - north * cos];
});
// Use the full outline for registration and a simpler plinth for printing.
const plinth = localFootprint.filter(([x, z], i) => {
  const previous = localFootprint[(i + localFootprint.length - 1) % localFootprint.length];
  const next = localFootprint[(i + 1) % localFootprint.length];
  const [dx, dz] = [next[0] - previous[0], next[1] - previous[1]];
  return Math.abs(dx * (z - previous[1]) - dz * (x - previous[0])) > Math.hypot(dx, dz) * 0.15;
});
const foundation = plate(plinth, y(0.65));

const shaftHalf = survey.shaftWidth / 2;
const shaftLevels = [[-0.6, shaftHalf, 0.50], [2.1, shaftHalf, 0.50], [2.45, 5.97, 0.54]];
for (const level of [15.3, 25.7, 36.0, 46.2]) {
  shaftLevels.push([level - 0.15, 5.97, 0.54], [level + 0.19, 6.21, 0.46],
    [level + 0.64, 5.97, 0.54]);
}
shaftLevels.push([48.10, 5.97, 0.54], [48.58, 6.37, 0.48], [49.17, 6.37, 0.48],
  [49.52, 6.10, 0.50], [51.06, 6.42, 0.45],
  [59.16, 6.42, 0.45], [59.43, 6.62, 0.43], [59.85, 6.62, 0.43],
  [60.12, 6.30, 0.50], [60.62, 6.30, 0.50], [60.86, 5.48, 0.40],
  [65.15, 5.48, 0.40], [65.48, 5.64, 0.40], [65.83, 5.64, 0.40]);
const shaft = squareLoft(shaftLevels);

const roof = squareLoft([[65.60, 5.55, 0.39], [65.96, 5.56, 0.40], [67.55, 4.89, 0.35],
  [70.13, 3.78, 0.28], [72.55, 3.05, 0.22], [72.71, 3.20, 0.23],
  [73.06, 3.20, 0.23], [73.23, 2.91, 0.22], [76.33, 2.91, 0.22],
  [76.59, 3.06, 0.21], [76.95, 3.06, 0.21], [78.22, 2.66, 0.19],
  [81.62, 1.91, 0.17], [85.20, 1.25, 0.15], [88.70, 0.72, 0.13],
  [91.18, 0.54, 0.12], [91.53, 0.72, 0.12], [92.06, 0.71, 0.11],
  [92.44, 0.47, 0.08], [94.04, 0.47, 0.08]]);

const pinnacles = [];
for (const x of [-5.67, 5.67]) {
  for (const z of [-5.67, 5.67]) {
    pinnacles.push(turned(x, z, [[y(56.4), 0.89], [y(60.81), 0.91],
      [y(61.43), 1.06], [y(63.15), 0.36]], 4));
  }
}
const orb = turned(0, 0, [[y(92.91), 0.39], [y(93.26), 0.71], [y(94.04), 0.71], [y(94.38), 0.39]], 8);
const stem = box(-0.37, 0.37, y(93.80), y(survey.heightAboveGrade), -0.37, 0.37);
const cross = box(-0.99, 0.99, y(94.92), y(95.61), -0.30, 0.30);
const volumes = [foundation, shaft, roof, ...pinnacles, orb, stem, cross];
const body = Manifold.union(volumes);
volumes.forEach(part => part.delete());

function opening(x, width, bottom, shoulder, top, inner, outer) {
  const left = x - width / 2, right = x + width / 2;
  return prism([[left, y(bottom)], [right, y(bottom)], [right, y(shoulder)],
    [x, y(top)], [left, y(shoulder)]], inner, outer);
}

const facadeCuts = [];
for (const [bottom, shoulder, top] of [[17.2, 23.4, 24.55], [27.8, 34.0, 35.17], [38.15, 44.4, 45.55]]) {
  for (const centre of [-1.5, 1.5]) {
    facadeCuts.push(opening(centre, 1.31, bottom, shoulder, top, 5.54, 7.6));
  }
}
for (const centre of [-2.92, 0, 2.92]) {
  facadeCuts.push(opening(centre, 2.1, 61.18, 63.49, 64.54, 4.66, 6.3));
}
for (const centre of [-1.13, 1.13]) {
  facadeCuts.push(opening(centre, 1.26, 73.38, 75.40, 75.98, 2.37, 3.3));
}
const clock = survey.clockCentreHeight;
const radius = survey.clockDiameter / 2;
const dialSegments = 16;
const dialCut = turned(0, 0, [[0, radius - 0.34], [0.54, radius], [1.70, radius]], dialSegments);
const horizontalDialCut = dialCut.rotate(90, 0, 0);
facadeCuts.push(horizontalDialCut.translate([0, y(clock), 5.76]));
for (const part of [dialCut, horizontalDialCut]) part.delete();
const cuts = facadeCuts.flatMap(cut => quarterTurns.map(turn => cut.rotate(0, turn, 0)));
const recesses = Manifold.union(cuts);
const carved = body.subtract(recesses);
for (const part of [...facadeCuts, ...cuts, body, recesses]) part.delete();

function hand(angleDegrees, length, width) {
  const angle = angleDegrees * Math.PI / 180;
  const along = [Math.sin(angle), Math.cos(angle)];
  const normal = [along[1], -along[0]];
  const outline = [[-0.35, -width / 2], [length - 0.41, -width / 2], [length, 0],
    [length - 0.41, width / 2], [-0.35, width / 2]].map(([d, w]) =>
    [along[0] * d + normal[0] * w, y(clock + along[1] * d + normal[1] * w)]);
  return prism(outline, 5.56, 6.28);
}

const shortHand = hand(-47, 1.98, 0.78), longHand = hand(56, 2.90, 0.70);
const hands = Manifold.union([shortHand, longHand]);
const dials = quarterTurns.map(turn => hands.rotate(0, turn, 0));
const building = Manifold.union([carved, ...dials]);
for (const part of [carved, shortHand, longHand, hands, ...dials]) part.delete();
const aligned = building.rotate(0, survey.heading, 0);
const leaned = aligned.warp(vertex => {
  const ratio = Math.max(0, vertex[1] - embed) / survey.clockCentreHeight;
  vertex[0] -= survey.tiltAtClock.west * ratio;
  vertex[2] -= survey.tiltAtClock.north * ratio;
});
const simplified = leaned.simplify(0.19);
const model = simplified.setTolerance(0.001);
for (const part of [building, aligned, leaned, simplified]) part.delete();
assert.equal(model.status(), 'NoError');
const components = model.decompose();
assert.equal(components.length, 1, 'The tower forms a single printable solid');
components.forEach(part => part.delete());

const attribution = 'Open Place Models contributors (reconstruction); Environment Agency DTM (Open Government Licence); footprint © OpenStreetMap contributors (ODbL 1.0).';
const { glb, min, max, vertices, triangles } = printGlb(model, attribution, [-0.80, 0.31, -1]);
assert(Math.abs(min[1]) < 0.001 && Math.abs(max[1] - y(survey.heightAboveGrade)) < 0.001);
const volume = model.volume();
model.delete();

const footprint = survey.footprint;
const bbox = [0, 1].map(axis => Math.min(...footprint.map(point => point[axis])))
  .concat([0, 1].map(axis => Math.max(...footprint.map(point => point[axis]))));
const family = 'osm-way-' + survey.osm.outline.way;
const feature = {
  type: 'Feature', id, bbox, geometry: { type: 'Polygon', coordinates: [footprint] },
  properties: {
    name: 'Elizabeth Tower (Big Ben)', place: 'London, United Kingdom', city: 'London', country: 'United Kingdom',
    geometryType: 'monument', aliases: ['Big Ben', 'Westminster Clock Tower', 'Clock Tower'],
    revision, anchor: survey.anchor, anchorElevation: survey.baseElevation, height: Number(max[1].toFixed(3)),
    mesh: 'models/elizabeth-tower/r1/print.glb', thumbnail: 'models/elizabeth-tower/r1/thumbnail.webp',
    byteLength: glb.length, license: 'CC-BY-4.0', spatialDataLicense: 'ODbL-1.0', attribution,
    replacement: { featureIds: [family], families: [family] },
    sources: [
      'https://www.parliament.uk/about/living-heritage/building/palace/architecture/palacestructure/towers-of-parliament/',
      'https://www.parliament.uk/about/living-heritage/building/palace/big-ben/facts-figures/',
      'https://www.parliament.uk/globalassets/documents/commons-information-office/Big-Ben.pdf',
      'https://virtualtours-assets.parliament.uk/elizabeth-tower/index.html',
      'https://committees.parliament.uk/writtenevidence/78705/html/',
      'https://www.data.gov.uk/dataset/01b3ee39-da3f-47b6-83da-dc98e73a461f/lidar-composite-digital-terrain-model-dtm-1m',
      'https://www.openstreetmap.org/way/123557148',
    ],
  },
};
await writeFile(new URL('print.glb', directory), glb);
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
console.log(JSON.stringify({ bytes: glb.length, vertices, triangles, min, max, volume }));
