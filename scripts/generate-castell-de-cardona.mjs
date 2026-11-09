import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'castell-de-cardona';
const path = 'models/' + id + '/r1/';
const directory = new URL('../' + path, import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { Manifold, box, prism, mesh } = await openSolids();
const { elevation, gridEastNorthToEnu } = survey.anchor;
const { measured } = survey;
const previewDirection = [-.72, .81, 1.25];
const attribution = 'Open Place Models contributors (reconstruction); Institut Cartogràfic i Geològic de Catalunya (CC BY 4.0); plan © OpenStreetMap contributors (ODbL 1.0).';
const sources = [
  'https://patrimoni.gencat.cat/ca/monuments/monuments/castell-de-cardona',
  'https://patrimoni.gencat.cat/ca/monuments/content/download/726/file/Guia%20visita%20catal%C3%A0',
  'https://calaix.gencat.cat/bitstream/handle/10687/24062/qmem6007.pdf?sequence=648',
  'https://www.cardona.cat/arees/359-turisme/el-castell-i-la-collegiata-de-sant-vicenc',
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions',
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Imatge/Ortofoto-territorial',
  'https://www.openstreetmap.org/way/155044257',
  'https://www.openstreetmap.org/way/155044258',
  'https://www.openstreetmap.org/relation/2652263',
];

function block(x0, x1, y0, y1, bottom, top) {
  return box(x0, x1, y0, y1, bottom - elevation, top - elevation);
}

function building(outline, bottom, top) {
  return prism(outline, bottom - elevation, top - elevation);
}

function union(parts) {
  const solid = Manifold.union(parts);
  for (const part of parts) part.delete();
  assert.equal(solid.status(), 'NoError');
  return solid;
}

function intersection(a, b) {
  const solid = a.intersect(b);
  a.delete();
  b.delete();
  assert.equal(solid.status(), 'NoError');
  return solid;
}

function subtract(a, tools) {
  const cutter = union(tools);
  const solid = a.subtract(cutter);
  a.delete();
  cutter.delete();
  assert.equal(solid.status(), 'NoError');
  return solid;
}

function simplify(solid, tolerance) {
  const result = solid.simplify(tolerance);
  solid.delete();
  assert.equal(result.status(), 'NoError');
  return result;
}

function envelope({ points, faces, edges }) {
  const n = points.length;
  const solid = mesh([
    ...points.flatMap(([x, y, , bottom]) => [x, y, bottom - elevation]),
    ...points.flatMap(([x, y, top]) => [x, y, top - elevation]),
  ], [
    ...faces.flatMap(([a, b, c]) => [a, c, b, a + n, b + n, c + n]),
    ...edges.flatMap(([a, b]) => [a, b, b + n, a, b + n, a + n]),
  ]);
  assert.equal(solid.status(), 'NoError');
  return solid;
}

function ring(x, y, rx, ry, count, phase = 0) {
  return Array.from({ length: count }, (_, i) => {
    const a = phase + 2 * Math.PI * i / count;
    return [x + rx * Math.cos(a), y + ry * Math.sin(a)];
  });
}

function loft(sections) {
  const n = sections[0][1].length;
  const vertices = sections.flatMap(([z, outline]) => outline.flatMap(([x, y]) => [x, y, z - elevation]));
  const last = (sections.length - 1) * n;
  const faces = [];
  for (let i = 1; i < n - 1; i++) faces.push(0, i + 1, i, last, last + i, last + i + 1);
  for (let row = 0; row < last; row += n) {
    for (let i = 0; i < n; i++) {
      const a = row + i;
      const b = row + (i + 1) % n;
      faces.push(a, b, b + n, a, b + n, a + n);
    }
  }
  const solid = mesh(vertices, faces);
  assert.equal(solid.status(), 'NoError');
  return solid;
}

// Two horizontal planes of constant slope meet at a crest, which can run obliquely.
function ridgeRoof(x0, x1, left, right, bottom, eaves, ridge) {
  const profile = y => [
    [y[0], bottom], [y[1], bottom], [y[1], eaves[1]],
    [(y[0] + y[1]) / 2, ridge], [y[0], eaves[0]],
  ];
  const sections = [[x0, profile(left)], [x1, profile(right)]];
  const n = sections[0][1].length;
  const points = sections.flatMap(([x, p]) => p.flatMap(([y, z]) => [x, y, z - elevation]));
  const faces = [];
  for (let i = 1; i < n - 1; i++) faces.push(0, i + 1, i, n, n + i, n + i + 1);
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    faces.push(i, next, next + n, i, next + n, i + n);
  }
  const solid = mesh(points, faces);
  assert.equal(solid.status(), 'NoError');
  return solid;
}

function halfApse(x, y, rx, ry, bottom, roofBase, roofTop, n = 8) {
  const semi = (f) => Array.from({ length: n + 1 }, (_, i) => {
    const a = Math.PI * (i / n - .5);
    return [x + Math.cos(a) * rx * f, y + Math.sin(a) * ry * f];
  });
  return loft([[bottom, semi(1)], [roofBase, semi(1)], [roofTop, semi(.12)]]);
}

// The fortress follows the surveyed hill. The embedded underside closes the
// terrain plug and connects the retaining walls to the higher buildings.
const base = simplify(envelope(survey.foundation), .30);
const walls = survey.walls.map(section => simplify(envelope(section), .19));

const [tx, ty] = [-41.30, 7.90];
const towerSection = (radius) => ring(tx, ty, radius, radius, 24, Math.PI / 24);
const tower = loft([
  [565.2, towerSection(7.0)],
  [569.7, towerSection(6.96)],
  [measured.minyonaDeck - .3, towerSection(5.18)],
  [measured.minyonaCrown, towerSection(5.0)],
]);
const towerSteps = [
  building([[-41.7, 1.78], [-33.0, 1.39], [-30.7, 3.4], [-35.25, 5.16], [-41.0, 5.05]], 566.6, 573.44),
  building([[-38.34, 1.62], [-32.48, 2.2], [-33.64, 4.18], [-38.6, 4.8]], 573.1, 575.76),
  building([[-39.28, 2.23], [-35.63, 2.29], [-34.91, 4.1], [-39.12, 4.93]], 575.4, 578.92),
];
const armsCourt = building([
  [-33.85, 2.0], [-16.7, 1.16], [-15.84, 10.87], [-20.48, 16.62], [-31.18, 17.8], [-35.08, 11.7],
], 567.3, measured.armsCourtFloor);

const palaceMask = survey.osm.palaceOutline;
const palaceFoundation = intersection(
  building(palaceMask, 549.2, 571.23),
  block(-35, 24.7, -26.7, 33.5, 548.5, 572),
);
const ducal = [
  palaceFoundation,
  ridgeRoof(-33.3, -7.9, [21.45, 30.78], [21.0, 32.07], 565.8, [575.65, 575.44], 578.24),
  ridgeRoof(-8.08, 28.94, [21.05, 32.06], [20.35, 28.98], 565.7, [575.82, 575.49], 578.15),
  ridgeRoof(-15.7, 11.87, [10.26, 21.13], [10.33, 20.78], 569.7, [580.53, 581.65], 583.31),
  ridgeRoof(-16.32, 4.1, [-2.62, 10.42], [-3.63, 10.42], 567.9, [580.21, 581.25], 583.19),
  ridgeRoof(1.2, 11.66, [-4.67, 11.01], [-4.78, 11.53], 567.7, [580.5, 581.56], 583.3),
  ridgeRoof(-8.18, 8.39, [-14.85, -2.48], [-17.28, -2.48], 567.85, [577.04, 580.16], 583.14),
  ridgeRoof(7.32, 23.62, [-20.37, -7.62], [-20.04, -8.3], 567.2, [579.02, 580.17], 584.82),
  ridgeRoof(-16.88, -7.9, [-17.91, -12.32], [-20.2, -9.65], 556.5, [571.91, 574.16], 576.12),
  building([[19.02, 12.3], [28.99, 12.3], [28.93, 20.3], [20.51, 20.79]], 565.4, 575.1),
  building([[17.82, -17.22], [66.46, -14.9], [66.47, -7.09], [39.3, -7.06], [18.8, -9.45]], 551.8, 566.95),
];
const westCloisterFloor = building([[11.45, .95], [22.71, 1.03], [22.66, 12.04], [11.55, 12.31]], 564.5, 568.74);
const westCloisterWalls = [
  block(11.46, 12.72, .8, 12.3, 567.95, 572.42),
  block(21.42, 22.82, .84, 12.2, 568.05, 573.20),
  block(12.02, 22.40, .62, 1.81, 568.05, 572.64),
  block(12.26, 22.28, 10.97, 12.53, 568.05, 572.88),
];

const church = [
  building(survey.osm.churchOutline, 555.1, 575.22),
  ridgeRoof(22.57, 59.30, [-.72, 10.66], [-.28, 11.10], 574.65, [584.12, 582.52], measured.churchNaveRidge),
  ridgeRoof(28.68, 62.77, [9.63, 13.23], [9.88, 13.53], 574.71, [581.35, 579.80], 581.12),
  ridgeRoof(23.02, 63.11, [-5.04, -.13], [-4.65, .07], 574.82, [578.86, 581.20], 580.72),
  ridgeRoof(52.65, 62.89, [-6.98, 15.58], [-6.79, 15.62], 574.88, [580.5, 582.04], 584.55),
  halfApse(66.82, 5.42, 5.48, 5.40, 555.54, 579.42, measured.churchCentralApseTop),
  halfApse(62.22, -2.61, 3.24, 2.21, 555.62, 576.98, 579.02, 6),
  halfApse(62.36, 12.87, 2.54, 2.19, 555.68, 577.06, 579.11, 6),
];
const octagon = (a, b) => ring(58.29, 5.31, a, b, 8, Math.PI / 8);
const crossing = loft([
  [582.14, octagon(5.15, 4.95)],
  [588.84, octagon(5.11, 4.91)],
  [589.31, octagon(5.26, 5.04)],
  [measured.churchCrossingTop, octagon(.48, .52)],
]);

function archedRecess(centre, width, low, shoulder, apex, x0, x1) {
  const r = width / 2;
  const points = [[centre - r, low], [centre + r, low], [centre + r, shoulder],
    [centre + r * .72, shoulder + .62 * (apex - shoulder)], [centre, apex],
    [centre - r * .72, shoulder + .62 * (apex - shoulder)], [centre - r, shoulder]];
  return prism(points.map(([a, z]) => [a, z - elevation]), x0, x1).transform([
    0, 1, 0, 0,
    0, 0, 1, 0,
    1, 0, 0, 0,
    0, 0, 0, 1,
  ]);
}

const exterior = union([base, ...walls, tower, ...towerSteps, armsCourt, ...ducal,
  westCloisterFloor, ...westCloisterWalls, ...church, crossing]);
const carving = subtract(exterior, [
  building(ring(tx, ty, 4.04, 4.04, 24), measured.minyonaDeck, 586.0),
  building(survey.osm.ducalCourt, measured.ducalCourtFloor, 586.75),
  archedRecess(5.35, 1.31, 587.12, 588.22, 588.75, 62.63, 63.63),
  archedRecess(5.24, 1.24, 587.07, 588.16, 588.72, 52.96, 54.39),
]);
const simplified = simplify(carving, .28);
// Internal pockets left at the joints of terrain and buildings are filled.
const shells = simplified.decompose();
const outside = shells.filter(shell => shell.volume() > 0);
assert.equal(outside.length, 1, 'one connected exterior shell');
for (const shell of shells) if (shell !== outside[0]) shell.delete();
simplified.delete();

const [[ee, en], [ne, nn]] = gridEastNorthToEnu;
const registered = outside[0].transform([
  ee, 0, -en, 0,
  ne, 0, -nn, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
]);
outside[0].delete();
const volume = registered.volume();
const genus = registered.genus();
const { glb, min, max, vertices, triangles } = printGlb(registered, attribution, previewDirection);
registered.delete();

const height = Math.round((measured.churchCrossingTop - elevation) * 1000) / 1000;
assert(Math.abs(min[1]) < .001, 'foundation minimum');
assert(Math.abs(max[1] - height) < .001, 'church crossing maximum');
await writeFile(new URL('print.glb', directory), glb);

if (process.argv[2]) {
  const { geometry, replacementWays } = survey.footprint;
  const [outer] = geometry.coordinates;
  const longitude = outer.map(([lon]) => lon);
  const latitude = outer.map(([, lat]) => lat);
  const osmIds = replacementWays.map(way => 'osm-way-' + way);
  osmIds.push('osm-relation-' + survey.osm.paradorRelation.id);
  const feature = {
    type: 'Feature', id,
    bbox: [Math.min(...longitude), Math.min(...latitude), Math.max(...longitude), Math.max(...latitude)],
    geometry,
    properties: {
      name: 'Castell de Cardona',
      aliases: ['Castle of Cardona', 'Castillo de Cardona', 'Parador de Cardona', 'Canònica de Sant Vicenç', 'Torre de la Minyona'],
      geometryType: 'building',
      place: 'Cardona, Spain',
      city: 'Cardona',
      country: 'Spain',
      revision: 'r1',
      anchor: survey.anchor.wgs84,
      anchorElevation: elevation,
      height,
      mesh: path + 'print.glb',
      byteLength: glb.length,
      thumbnail: path + 'thumbnail.webp',
      license: 'CC-BY-4.0',
      attribution,
      spatialDataLicense: 'ODbL-1.0',
      sources,
      replacement: { featureIds: osmIds, families: osmIds },
    },
  };
  await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
}
console.log(JSON.stringify({
  bytes: glb.length, vertices, triangles, min, max, genus, volume, anchorElevation: elevation,
  sha256: createHash('sha256').update(glb).digest('hex'),
}));
