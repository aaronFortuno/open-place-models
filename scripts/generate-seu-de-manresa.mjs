import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'seu-de-manresa';
const path = 'models/' + id + '/r1/';
const directory = new URL('../' + path, import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { Manifold, box, prism, mesh } = await openSolids();
const { elevation, alongAndAcrossToEnu } = survey.anchor;
const { naveRoof, aisleRoofs, towerCrown, stairTowerTop, baptistryTop, northChapelRoof, southBays, northBays } = survey.reconstruction;
const attribution = 'Open Place Models contributors (reconstruction); Institut Cartogràfic i Geològic de Catalunya (CC BY 4.0); plan © OpenStreetMap contributors (ODbL 1.0).';
const previewDirection = [-.77, .50, .90];
const sources = [
  'https://seudemanresa.cat/arquitectura/',
  'https://web.manresa.cat/media/docs/arxius/doc_contingut_10578.pdf',
  'https://campaners.com/php/torrepdf.php?numer=2042',
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions',
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Imatge/Ortofoto-territorial',
  'https://www.openstreetmap.org/way/383196253',
];

function block(x0, x1, y0, y1, bottom, top) {
  return box(x0, x1, y0, y1, bottom - elevation, top - elevation);
}

function building(outline, bottom, top) {
  return prism(outline, bottom - elevation, top - elevation);
}

function polygon(x, y, width, depth, count, phase = Math.PI / 8) {
  return Array.from({ length: count }, (_, i) => {
    const a = 2 * Math.PI * i / count + phase;
    return [x + width * Math.cos(a) / 2, y + depth * Math.sin(a) / 2];
  });
}

function square(x, y, width, depth) {
  return [[x - width / 2, y - depth / 2], [x + width / 2, y - depth / 2],
    [x + width / 2, y + depth / 2], [x - width / 2, y + depth / 2]];
}

function loft(sections) {
  const count = sections[0][1].length;
  const points = sections.flatMap(([z, ring]) => ring.flatMap(([x, y]) => [x, y, z - elevation]));
  const last = (sections.length - 1) * count;
  const faces = [];
  for (let i = 1; i < count - 1; i++) faces.push(0, i + 1, i, last, last + i, last + i + 1);
  for (let offset = 0; offset < last; offset += count) {
    for (let i = 0; i < count; i++) {
      const a = offset + i;
      const b = offset + (i + 1) % count;
      faces.push(a, b, b + count, a, b + count, a + count);
    }
  }
  return mesh(points, faces);
}

// A vertical profile measured along d, extruded sideways by the two offsets.
function section(profile, origin, direction, low, high) {
  const [x, y] = origin;
  const [dx, dy] = direction;
  return prism(profile.map(([u, z]) => [u, z - elevation]), low, high).transform([
    dx, dy, 0, 0,
    0, 0, 1, 0,
    dy, -dx, 0, 0,
    x, y, 0, 1,
  ]);
}

function lancet(centre, width, sill, shoulder, tip) {
  const r = width / 2;
  return [
    [centre - r, sill], [centre + r, sill], [centre + r, shoulder],
    [centre + .71 * r, shoulder + .53 * (tip - shoulder)], [centre, tip],
    [centre - .71 * r, shoulder + .53 * (tip - shoulder)], [centre - r, shoulder],
  ];
}

function combine(parts) {
  const solid = Manifold.union(parts);
  for (const part of parts) part.delete();
  assert.equal(solid.status(), 'NoError');
  return solid;
}

function intersect(a, b) {
  const solid = a.intersect(b);
  a.delete();
  b.delete();
  assert.equal(solid.status(), 'NoError');
  return solid;
}

function cut(solid, tools) {
  const cutter = combine(tools);
  const result = solid.subtract(cutter);
  solid.delete();
  cutter.delete();
  assert.equal(result.status(), 'NoError');
  return result;
}

const { top, points, faces, edges } = survey.foundation;
const count = points.length;
const foundation = mesh([
  ...points.flatMap(([x, y, z]) => [x, y, z - elevation]),
  ...points.flatMap(([x, y]) => [x, y, top - elevation]),
], [
  ...faces.flatMap(([a, b, c]) => [a, c, b, a + count, b + count, c + count]),
  ...edges.flatMap(([a, b]) => [a, b, b + count, a, b + count, a + count]),
]);
assert.equal(foundation.status(), 'NoError');
const base = foundation.simplify(.16);
foundation.delete();

// The foundation projects slightly beyond the walls at their lower joint.
const aisleRoof = (aisleRoofs[0] + aisleRoofs[1]) / 2;
const aisles = intersect(
  building(survey.footprint.upperOutline, 240.95, aisleRoof),
  block(-28.1, 45.2, -20, 22, 240, 257),
);
// The flat high nave roof steps down at the polygonal east ambulatory.
const naveOutline = [
  [-28.63, -6.04], [30.96, -6.03], [34.34, -5.55], [36.78, -3.74],
  [38.50, -.36], [38.57, 6.62], [36.58, 9.73], [33.95, 11.50],
  [30.43, 12.13], [-28.62, 12.16],
];
const nave = building(naveOutline, 254.7, naveRoof);

const flyers = [];
function addFlyer(inner, outer, width, innerSoffit, outerShoulder) {
  const distance = Math.hypot(outer[0] - inner[0], outer[1] - inner[1]);
  const direction = outer.map((v, i) => (v - inner[i]) / distance);
  const lip = distance - .70;
  const arc = Array.from({ length: 5 }, (_, i) => {
    const f = i / 4;
    return [lip * f, innerSoffit - (innerSoffit - 255.97) * (1 - Math.sqrt(1 - f ** 2))];
  });
  const profile = [
    [-.40, innerSoffit - .10], ...arc, [distance + .26, 255.55],
    [distance + .26, outerShoulder], [-.40, innerSoffit + 2.16],
  ];
  const pier = [
    [lip - .10, 254.92], [distance + .45, 254.92], [distance + .35, 260.4],
    [distance - .12, outerShoulder + .32], [lip - .10, outerShoulder - .15],
  ];
  flyers.push(section(profile, inner, direction, -width / 2, width / 2));
  flyers.push(section(pier, inner, direction, -width * .62, width * .62));
}
for (const x of southBays) addFlyer([x, -5.95], [x, x === 28.25 ? -16.01 : -15.77], 1.39, 264.28, 262.2);
for (const x of northBays) addFlyer([x, 12.08], [x, x >= 27 ? 19.65 : 20.05], 1.34, 264.15, 262.06);
for (const [inner, outer, width] of [
  [[34.55, -5.00], [37.27, -11.36], 1.38],
  [[38.30, .68], [43.22, -2.21], 1.38],
  [[38.32, 6.51], [43.52, 7.15], 1.26],
  [[35.80, 10.13], [37.66, 15.78], 1.31],
]) addFlyer(inner, outer, width, 264.36, 262.27);

const octagon = (x, y, w, d) => polygon(x, y, w, d, 8);
const eastStair = loft([
  [254.71, octagon(42.60, -2.02, 4.15, 4.76)],
  [263.05, octagon(42.60, -2.02, 4.13, 4.72)],
  [263.36, octagon(42.58, -2.04, 3.70, 4.30)],
  [stairTowerTop - .34, octagon(42.58, -2.04, 3.70, 4.30)],
  [stairTowerTop, octagon(42.58, -2.04, 3.59, 4.17)],
]);

const towerX = .33, towerY = 15.5;
const tower = loft([
  [254.70, square(towerX, towerY, 9.58, 9.46)],
  [274.88, square(towerX, towerY, 9.56, 9.43)],
  [275.24, square(towerX, towerY, 9.88, 9.73)],
  [275.62, square(towerX, towerY, 9.56, 9.43)],
  [287.64, square(towerX, towerY, 9.52, 9.40)],
  [288.18, square(towerX, towerY, 10.04, 9.92)],
  [towerCrown, square(towerX, towerY, 9.92, 9.80)],
]);

const chapel = loft([
  [240.65, octagon(-33.77, 16.67, 10.68, 10.45)],
  [252.45, octagon(-33.77, 16.67, 10.68, 10.45)],
  [252.81, octagon(-33.77, 16.67, 10.89, 10.64)],
  [northChapelRoof, octagon(-33.77, 16.67, .95, .9)],
]);
const baptistry = loft([
  [239.75, octagon(-33.52, -12.02, 10.36, 11.71)],
  [255.58, octagon(-33.52, -12.02, 10.36, 11.71)],
  [256.20, octagon(-33.52, -12.02, 10.75, 12.00)],
  [256.69, octagon(-33.52, -12.02, 9.95, 10.68)],
  [262.28, octagon(-33.52, -12.02, 9.94, 10.65)],
  [baptistryTop, octagon(-33.52, -12.02, .57, .60)],
]);
const porch = block(-33.86, -27.30, -6.35, 11.60, 239.28, 254.16);
const porchGables = [];
const openings = [];
for (const y of [-3.62, 2.28, 8.14]) {
  const arch = lancet(y, 4.57, 238.86, 246.18, 252.05);
  openings.push(section(arch, [0, 0], [0, 1], -34.7, -28.25));
  porchGables.push(section([
    [y - 2.86, 253.64], [y + 2.86, 253.64], [y + 2.86, 254.08],
    [y, 257.44], [y - 2.86, 254.08],
  ], [0, 0], [0, 1], -34.12, -32.72));
}

openings.push(section(polygon(2.86, 261.56, 8.74, 8.74, 20, 0), [0, 0], [0, 1], -29.60, -27.39));
openings.push(block(-3.47, 4.13, 11.74, 19.24, 288.62, 290.16));
for (const y of [towerY - 1.70, towerY + 1.70]) {
  const arch = lancet(y, 1.80, 277.0, 284.6, 286.38);
  openings.push(section(arch, [0, 0], [0, 1], -4.73, -3.21));
  openings.push(section(arch, [0, 0], [0, 1], 4.0, 5.38));
}
for (const x of [towerX - 1.70, towerX + 1.70]) {
  const arch = lancet(x, 1.80, 277.0, 284.6, 286.38);
  openings.push(section(arch, [0, 0], [1, 0], -20.65, -18.63));
  openings.push(section(arch, [0, 0], [1, 0], -12.37, -10.33));
}
for (const x of [-22.46, -14.95, -7.05, .93, 8.95, 17.05, 24.68]) {
  openings.push(section(lancet(x, 3.75, 257.12, 263.98, 267.04), [0, 0], [1, 0], 5.23, 6.54));
}
for (const x of [-22.43, -14.98, 8.86, 16.35, 24.35]) {
  openings.push(section(lancet(x, 3.75, 257.16, 263.97, 266.98), [0, 0], [1, 0], -12.74, -11.23));
}
for (const x of [-21.82, -13.78, -5.98, 1.88, 9.95, 18.12, 25.5]) {
  openings.push(section(lancet(x, 2.08, 247.35, 251.13, 253.48), [0, 0], [1, 0], 13.93, 15.52));
}
openings.push(section(lancet(-12.02, 1.72, 256.87, 260.64, 261.98), [0, 0], [0, 1], -39.2, -37.53));

const carved = cut(combine([
  base, aisles, nave, ...flyers, eastStair, tower, chapel, baptistry, porch, ...porchGables,
]), openings);
const simplified = carved.simplify(.058);
carved.delete();

const [[ee, en], [ne, nn]] = alongAndAcrossToEnu;
const registered = simplified.transform([
  ee, 0, -en, 0,
  ne, 0, -nn, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
]);
simplified.delete();
const components = registered.decompose();
const extents = components.map(part => part.boundingBox());
for (const part of components) part.delete();
assert.equal(components.length, 1, JSON.stringify(extents));
const genus = registered.genus();
assert.equal(genus, survey.publishedDimensions.flyers, 'open flying buttresses');
const volume = registered.volume();
const { glb, min, max, vertices, triangles } = printGlb(registered, attribution, previewDirection);
registered.delete();

const height = Math.round((towerCrown - elevation) * 1000) / 1000;
assert(Math.abs(min[1]) < .002, 'foundation minimum');
assert(Math.abs(max[1] - height) < .001, 'bell tower top');
await writeFile(new URL('print.glb', directory), glb);

if (process.argv[2]) {
  const { geometry, id: osmId } = survey.footprint;
  const [outer] = geometry.coordinates;
  const longitude = outer.map(([lon]) => lon);
  const latitude = outer.map(([, lat]) => lat);
  const osmWay = 'osm-way-' + osmId;
  const feature = {
    type: 'Feature', id,
    bbox: [Math.min(...longitude), Math.min(...latitude), Math.max(...longitude), Math.max(...latitude)],
    geometry,
    properties: {
      name: 'Seu de Manresa',
      aliases: ['La Seu de Manresa', 'Basílica de Santa Maria de Manresa', 'Basílica de Santa Maria de la Seu', 'Manresa Basilica'],
      geometryType: 'building',
      place: 'Manresa, Spain',
      city: 'Manresa',
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
      replacement: { featureIds: [osmWay, 'icgc-1530154'], families: [osmWay] },
    },
  };
  await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
}
console.log(JSON.stringify({
  bytes: glb.length, vertices, triangles, min, max, genus, volume, anchorElevation: elevation,
  sha256: createHash('sha256').update(glb).digest('hex'),
}));
