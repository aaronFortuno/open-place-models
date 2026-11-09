import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'sant-climent-de-taull';
const path = 'models/' + id + '/r1/';
const directory = new URL('../' + path, import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { Manifold, box, prism, mesh } = await openSolids();
const { elevation, alongAndAcrossToEnu } = survey.anchor;
const { nave, apses, tower } = survey;
const attribution = 'Open Place Models contributors (reconstruction); Institut Cartogràfic i Geològic de Catalunya (CC BY 4.0); plan © OpenStreetMap contributors (ODbL 1.0).';
const previewDirection = [1.2, .55, .77];
const sources = [
  'https://www.centreromanic.com/esglesia/sant-climent-de-taull/',
  survey.sources.survey.url,
  survey.sources.corpus.url,
  'https://patrimoni.gencat.cat/ca/coleccio/sant-climent-de-taull',
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions',
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Imatge/Ortofoto-territorial',
  'https://www.openstreetmap.org/way/197867117',
];

function block(x0, x1, y0, y1, bottom, top) {
  return box(x0, x1, y0, y1, bottom - elevation, top - elevation);
}

function ring(width, depth) {
  return [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]];
}

function level(outline, height) {
  return outline.map(([x, y]) => [x, y, height]);
}

function polyhedron(vertices, faces) {
  const body = mesh(vertices.flatMap(([x, y, z]) => [x, y, z - elevation]), faces);
  assert.equal(body.status(), 'NoError');
  return body;
}

function loft(rings) {
  const n = rings[0].length;
  const vertices = rings.flat();
  const last = vertices.length - n;
  const faces = [];
  for (let i = 1; i < n - 1; i++) faces.push(0, i + 1, i, last, last + i, last + i + 1);
  for (let row = 0; row < last; row += n) {
    for (let i = 0; i < n; i++) {
      const a = row + i;
      const b = row + (i + 1) % n;
      faces.push(a, b, b + n, a, b + n, a + n);
    }
  }
  return polyhedron(vertices, faces);
}

function union(parts) {
  const solid = Manifold.union(parts);
  for (const part of parts) part.delete();
  assert.equal(solid.status(), 'NoError');
  return solid;
}

function subtract(solid, parts) {
  const cutter = union(parts);
  const result = solid.subtract(cutter);
  solid.delete();
  cutter.delete();
  assert.equal(result.status(), 'NoError');
  return result;
}

// Extrude a vertical profile along the horizontal normal of a façade.
function recess(profile, origin, across, from, to) {
  const [x, y] = origin;
  const [dx, dy] = across;
  return prism(profile.map(([u, z]) => [u, z - elevation]), from, to).transform([
    dx, dy, 0, 0,
    0, 0, 1, 0,
    dy, -dx, 0, 0,
    x, y, 0, 1,
  ]);
}

function arch(centre, width, sill, shoulder, apex) {
  const radius = width / 2;
  const top = Array.from({ length: 5 }, (_, i) => {
    const a = i * Math.PI / 4;
    return [centre + radius * Math.cos(a), shoulder + (apex - shoulder) * Math.sin(a)];
  });
  return [[centre - radius, sill], [centre + radius, sill], ...top];
}

function circle(centre, height, radius) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = i * Math.PI / 5;
    return [centre + radius * Math.cos(a), height + radius * Math.sin(a)];
  });
}

// A single pitched roof covers all three naves, with unequal wall alignments.
const shell = polyhedron([
  ...nave.base,
  ...nave.base.map(([x, y], i) => [x, y, nave.eaves[i]]),
  ...nave.ridge,
], [
  0, 2, 1, 0, 3, 2,
  0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5,
  2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  4, 5, 9, 4, 9, 8, 6, 7, 8, 6, 8, 9,
  7, 4, 8, 5, 6, 9,
]);

const eastBodies = apses.map(({ base, centre: [cx, cy], eave, roof }) => loft([
  base,
  level(base, eave),
  level(base.map(([x, y]) => [cx + .08 * (x - cx), cy + .08 * (y - cy)]), roof),
]));

const gable = recess([
  [-.67, 1489.99], [.67, 1489.99], [.67, 1491.17], [.36, 1491.49],
  [0, 1491.59], [-.36, 1491.49], [-.67, 1491.17],
], [9.12, -4.23], [0, 1], -.36, .25);

const shaft = loft([
  tower.base,
  level(ring(4.21, 4.51), tower.stoneTop),
]);
const hip = loft([
  level(ring(4.47, 4.75), tower.stoneTop - .17),
  level(ring(4.45, 4.73), tower.stoneTop + .045),
  level(ring(3.50, 3.78), 1503.43),
  level(ring(1.56, 1.71), 1504.38),
  level(ring(.29, .30), 1505.17),
  level(ring(.19, .19), tower.roofTop),
]);
const courses = tower.openings.slice(1).map(({ sill }, i) => {
  const w = 2.20 - .012 * i;
  const d = 2.35 - .012 * i;
  return block(-w, w, -d, d, sill - .19, sill - .075);
});
const towerCutouts = [];
for (const [storey, { count, width, mullion, sill, shoulder, apex, through }] of tower.openings.entries()) {
  for (let i = 0; i < count; i++) {
    const centre = (i - (count - 1) / 2) * (width + mullion);
    const profile = arch(centre, width, sill, shoulder, apex);
    if (through) {
      towerCutouts.push(recess(profile, [0, 0], [1, 0], -2.55, 2.55));
      towerCutouts.push(recess(profile, [0, 0], [0, 1], -2.55, 2.55));
      continue;
    }
    towerCutouts.push(recess(profile, [0, 0], [1, 0], 1.74, 2.55));
    if (storey > 0) towerCutouts.push(recess(profile, [0, 0], [1, 0], -2.55, -1.74));
    towerCutouts.push(recess(profile, [0, 0], [0, 1], -2.55, -1.58));
    towerCutouts.push(recess(profile, [0, 0], [0, 1], 1.58, 2.55));
  }
}
const towerBody = subtract(union([shaft, hip, ...courses]), towerCutouts);
const rotatedTower = towerBody.rotate(0, 0, tower.angleDegrees);
const bellTower = rotatedTower.translate([...tower.centre, 0]);
towerBody.delete();
rotatedTower.delete();

// This low masonry joint is visible between the church and tower in the survey.
const joint = block(7.60, 9.31, -11.80, -10.58, 1479.01, 1484.21);
const openings = [
  recess(arch(0, 1.39, 1480.06, 1482.02, 1482.66), [-9.12, -4.40], [-.157, .988], -.69, .72),
  recess(arch(0, .57, 1486.17, 1487.50, 1487.85), [-9.15, -4.23], [-.157, .988], -.64, .63),
  recess(arch(0, .38, 1485.73, 1486.69, 1486.95), [-9.88, .35], [-.157, .988], -.66, .65),
  recess(arch(0, .38, 1485.28, 1486.16, 1486.42), [-8.42, -8.77], [-.157, .988], -.63, .68),
  recess(arch(0, .43, 1490.63, 1491.07, 1491.25), [9.16, -4.23], [0, 1], -.49, .42),
  recess(arch(0, 1.15, 1480.99, 1482.25, 1482.71), [0.85, -11.43], [.998, .068], .03, .87),
  recess(arch(0, 1.02, 1481.39, 1482.49, 1482.89), [6.60, -11.13], [.998, .068], -.09, .84),
  recess(arch(0, .39, 1484.90, 1485.78, 1485.99), [2.34, -11.39], [.998, .068], -.11, .77),
];
for (const [x, y, sill, shoulder, apex, width] of [
  [13.80, -4.16, 1483.61, 1485.49, 1485.82, .49],
  [10.81, .54, 1483.29, 1484.53, 1484.82, .40],
  [11.94, -8.87, 1483.22, 1484.39, 1484.67, .40],
]) openings.push(recess(arch(0, width, sill, shoulder, apex), [x, y], [0, 1], -.45, .68));
openings.push(recess(circle(0, 1486.22, .20), [12.80, -2.49], [-.69, .724], -.45, .51));
openings.push(recess(circle(0, 1486.16, .20), [13.19, -5.91], [.67, .742], -.46, .52));

const detailed = subtract(union([shell, ...eastBodies, gable, bellTower, joint]), openings);
const simplified = detailed.simplify(.032);
detailed.delete();
const [[ee, en], [ne, nn]] = alongAndAcrossToEnu;
const registered = simplified.transform([
  ee, 0, -en, 0,
  ne, 0, -nn, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
]);
simplified.delete();
const parts = registered.decompose();
const extents = parts.map(part => ({ bounds: part.boundingBox(), volume: part.volume() }));
for (const part of parts) part.delete();
assert.equal(parts.length, 1, JSON.stringify(extents));
const genus = registered.genus();
assert(genus >= 16, 'major tower openings must remain open');
const volume = registered.volume();
const { glb, min, max, vertices, triangles } = printGlb(registered, attribution, previewDirection);
registered.delete();

const height = Math.round((tower.roofTop - elevation) * 1000) / 1000;
assert(Math.abs(min[1]) < .001, 'foundation minimum');
assert(Math.abs(max[1] - height) < .001, 'tower summit');
await writeFile(new URL('print.glb', directory), glb);

if (process.argv[2]) {
  const { geometry, id: way } = survey.footprint;
  const [outer] = geometry.coordinates;
  const longitude = outer.map(([lon]) => lon);
  const latitude = outer.map(([, lat]) => lat);
  const osm = 'osm-way-' + way;
  const feature = {
    type: 'Feature', id,
    bbox: [Math.min(...longitude), Math.min(...latitude), Math.max(...longitude), Math.max(...latitude)],
    geometry,
    properties: {
      name: 'Sant Climent de Taüll',
      aliases: ['Sant Climent de Taull', 'Sant Climent de Tahull', 'San Clemente de Tahull', 'Church of Saint Clement of Taüll'],
      geometryType: 'building',
      place: 'Taüll, Spain',
      city: 'Taüll',
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
      replacement: { featureIds: [osm], families: [osm] },
    },
  };
  await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
}
console.log(JSON.stringify({
  bytes: glb.length, vertices, triangles, min, max, genus, volume, anchorElevation: elevation,
  sha256: createHash('sha256').update(glb).digest('hex'),
}));
