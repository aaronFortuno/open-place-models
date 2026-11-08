import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'catedral-de-mallorca';
const directory = new URL('../models/' + id + '/r1/', import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { Manifold, box, prism, mesh } = await openSolids();
const { elevation } = survey.anchor;
const levels = survey.measurements.model;
const previewDirection = [-1.2, .60, .51];
const attribution = 'Open Place Models contributors (reconstruction); PNOA / Instituto Geográfico Nacional (CC BY 4.0); plan © OpenStreetMap contributors (ODbL 1.0).';
const sources = [
  'https://blog.catedraldemallorca.org/opinion/joan-bauza/tomando-medidas/',
  'https://catedraldemallorca.org/catedral/historia/',
  'https://msp.org/jomms/2018/13-5/jomms-v13-n5-p03-s.pdf',
  'https://www.cultura.gob.es/planes-nacionales/dam/jcr%3A0aaa0ddb-564b-4a41-9070-77c289f6dd2e/catedral-palma-mallorca.pdf',
  'https://artsandculture.google.com/asset/fachada-principal-juan-bautista-peyronnet/bQGH_toamEb9yw?hl=es',
  'https://pnoa.ign.es/pnoa-lidar/visualizadores-y-servicios-web',
  'https://pnoa.ign.es/pnoa-imagen/visualizadores-y-servicios-web',
  'https://www.openstreetmap.org/way/25883629',
];

function building(outline, floor, roof) {
  return prism(outline, floor - elevation, roof - elevation);
}

function block(x0, x1, n0, n1, floor, roof) {
  return box(x0, x1, n0, n1, floor - elevation, roof - elevation);
}

function union(parts) {
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

function subtract(a, parts) {
  const b = union(parts);
  const solid = a.subtract(b);
  a.delete();
  b.delete();
  assert.equal(solid.status(), 'NoError');
  return solid;
}

// The input uses metres along the nave, across the nave and in absolute elevation.
function sliceAlongNave(profile, x0, x1) {
  return prism(profile.map(([n, z]) => [n, z - elevation]), x0, x1).transform([
    0, 1, 0, 0,
    0, 0, 1, 0,
    1, 0, 0, 0,
    0, 0, 0, 1,
  ]);
}

function sliceAcrossNave(profile, n0, n1) {
  return prism(profile.map(([x, z]) => [x, z - elevation]), -n1, -n0).transform([
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, -1, 0, 0,
    0, 0, 0, 1,
  ]);
}

function ring(x, n, rx, rn, segments) {
  return Array.from({ length: segments }, (_, i) => {
    const a = 2 * Math.PI * i / segments;
    return [x + rx * Math.cos(a), n + rn * Math.sin(a)];
  });
}

function crown(x, n, w, depth, shoulder, tip) {
  const profile = [[x - w / 2, n - depth / 2], [x + w / 2, n - depth / 2],
    [x + w / 2, n + depth / 2], [x - w / 2, n + depth / 2]];
  return mesh([
    ...profile.flatMap(([px, pn]) => [px, pn, shoulder - elevation]),
    x, n, tip - elevation,
  ], [0, 2, 1, 0, 3, 2, 0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]);
}

function pinnacle(x, n, floor) {
  const corners = [[-.8, -.88], [.8, -.88], [.8, .88], [-.8, .88]];
  const points = [
    ...corners.flatMap(([dx, dn]) => [x + dx, n + dn, floor - elevation]),
    ...corners.flatMap(([dx, dn]) => [x + dx * .84, n + dn * .84, 59.92 - elevation]),
    x, n, 62.4 - elevation,
  ];
  const faces = [0, 2, 1, 0, 3, 2];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    faces.push(i, j, j + 4, i, j + 4, i + 4, i + 4, j + 4, 8);
  }
  return mesh(points, faces);
}

function pointed(center, width, floor, shoulder, tip) {
  const radius = width / 2;
  return [
    [center - radius, floor], [center + radius, floor], [center + radius, shoulder],
    [center + .73 * radius, shoulder + .51 * (tip - shoulder)], [center, tip],
    [center - .73 * radius, shoulder + .51 * (tip - shoulder)], [center - radius, shoulder],
  ];
}

const { outline } = survey.footprint;
const base = building(outline, elevation, 26.4);
const church = intersect(
  building(outline, 25.7, levels.chapelTerrace),
  block(-60, 42.1, -39, 22.45, 25.2, 39),
);
const sanctuaryTerrace = intersect(
  building(outline, 25.8, 37.9),
  block(40.8, 65.0, -35, 15, 25.0, 40.0),
);
const nave = sliceAlongNave([
  [-16.35, 35.1], [4.50, 35.1], [4.50, levels.naveEaves],
  [-5.85, levels.naveRidge], [-16.35, levels.naveEaves + .03],
], -51.2, 31.45);
const aisles = [
  block(-49.7, 34.0, -25.70, -15.92, 34.5, levels.aisleRoof),
  block(-49.5, 33.5, 4.06, 14.12, 34.1, levels.aisleRoof + .22),
];
const chapelRoyal = building([
  [30.65, -14.0], [52.3, -14.0], [55.65, -11.02], [55.45, -1.20],
  [52.55, 1.34], [30.65, 1.85],
], 35.4, 48.45);
const chapelTrinity = building([
  [51.1, -12.70], [60.5, -12.48], [62.85, -9.31], [62.82, -5.53],
  [60.15, -2.30], [51.1, -2.39],
], 36.8, 42.0);
const apseSides = [
  building([[29.6, -25.5], [40.1, -25.7], [42.5, -22.05], [42.1, -14.4], [29.6, -14.4]], 34.4, 44.2),
  building([[29.8, 1.2], [41.6, 1.4], [41.14, 10.62], [39.5, 13.6], [29.8, 13.98]], 34.2, 44.6),
];

// Fig. 9 provides the typical radius and span. The upper surface is the sloping
// masonry cap. Two different heights place the paired arches above the side aisles.
const { flyingButtressSoffitRadius: radius, flyingButtressTypicalSpan: span } = survey.measurements.published;
function flyer(x, side, start, soffit, capInner, capOuter, width) {
  const arc = Array.from({ length: 6 }, (_, i) => {
    const t = span * i / 5;
    const dx = Math.min(t - .65, radius - .045);
    const z = soffit + Math.sqrt(radius ** 2 - dx ** 2) - Math.sqrt(radius ** 2 - .65 ** 2);
    return [start + side * t, z];
  });
  const profile = [
    [start - side * .45, soffit - .1], ...arc,
    [start + side * (span + .42), arc.at(-1)[1] - .15],
    [start + side * (span + .42), capOuter], [start - side * .45, capInner],
  ];
  return sliceAlongNave(profile, x - width / 2, x + width / 2);
}

const supports = [];
for (const [index, x] of levels.buttressBayXWestToEast.entries()) {
  for (const side of [-1, 1]) {
    const inner = side === -1 ? -16.25 : 4.42;
    const outerEdge = side === -1 ? -31.7 - index * .29 : 23.36 - index * .15;
    const shoulder = inner + side * (span - .37);
    const width = 1.74;
    const pier = [
      [shoulder, 34.5], [outerEdge, 34.5], [outerEdge - side * .15, 46.9],
      [outerEdge - side * 1.8, 55.45], [shoulder, 55.68],
    ];
    supports.push(sliceAlongNave(pier, x - 1.08, x + 1.08));
    supports.push(flyer(x, side, inner, 51.70, 53.85, 50.80, width));
    supports.push(flyer(x, side, inner, 57.14, 59.55, 56.08, width));
    const pin = inner + side * 12.0;
    supports.push(pinnacle(x, pin, 54.98));
  }
}

// The floor of the open court is supplied by terrain. The surrounding roofs
// follow the lower attached volumes visible north of the church.
const annex = [
  building([[-10.4, 20.5], [7.3, 20.5], [7.9, 38.4], [2.0, 39.8], [-10.1, 38.2]], 25.5, 32.9),
  intersect(building(outline, 25.9, 29.7), block(7.0, 31.0, 23.0, 51.4, 24.0, 31.0)),
  building([[8.15, 28.1], [13.08, 28.2], [12.53, 48.9], [8.65, 48.95], [8.3, 42.75]], 29.25, 32.15),
  building([[20.4, 27.1], [27.5, 27.0], [26.97, 49.8], [20.13, 49.4]], 28.6, 32.8),
];
const bellTower = [
  building([[-9.0, 22.18], [2.85, 23.05], [1.97, 34.75], [-9.9, 33.79]], 28.2, 65.32),
  building([[-9.53, 21.83], [3.34, 22.77], [2.48, 35.23], [-10.39, 34.22]], 46.8, 47.55),
  building([[-9.48, 21.87], [3.3, 22.8], [2.42, 35.14], [-10.34, 34.18]], 57.68, 58.40),
  building([[-9.59, 21.74], [3.40, 22.67], [2.52, 35.35], [-10.48, 34.32]], 64.82, 66.45),
  building([[-9.12, 22.27], [2.92, 23.13], [2.08, 34.88], [-9.99, 33.97]], 66.2, levels.bellTowerTop),
];

// Peyronnet's west front has four pinnacled towers. The middle pair is taller.
const westCenter = -3.9;
const westFront = [
  sliceAlongNave([
    [-16.6, 25.7], [8.05, 25.7], [8.05, 64.5], [westCenter, 72.9], [-16.6, 64.5],
  ], -54.25, -49.3),
  block(-51.9, -47.5, 6.7, 24.55, 25.65, 49.7),
  block(-52.22, -47.9, -30.9, -15.95, 25.6, 49.45),
  flyer(-51.5, 1, 7.0, 55.7, 59.3, 55.8, 1.5),
  flyer(-51.7, -1, -14.8, 55.55, 59.15, 55.7, 1.55),
];
for (const [x, n, width, depth, shoulder, tip] of [
  [-51.0, -30.4, 5.7, 5.4, 57.8, 67.3],
  [-53.1, -13.68, 5.7, 5.2, 66.9, levels.westCrown],
  [-52.72, 6.75, 5.1, 5.45, 66.82, levels.westCrown - .07],
  [-49.38, 23.57, 5.2, 5.15, 57.75, 67.5],
]) {
  westFront.push(block(x - width / 2, x + width / 2, n - depth / 2, n + depth / 2, 25.48, shoulder));
  westFront.push(block(x - width / 2 - .17, x + width / 2 + .17, n - depth / 2 - .18, n + depth / 2 + .18, shoulder - 3.4, shoulder - 2.8));
  westFront.push(crown(x, n, width * .93, depth * .96, shoulder - .19, tip));
}
const westCrown = [
  // The shorter wings' open braces reach the outer towers beyond the side aisle.
  sliceAlongNave([[14.6, 51.0], [20.4, 47.7], [23.04, 50.9], [14.8, 56.57]], -52.19, -50.82),
  sliceAlongNave([[-30.03, 51.17], [-27.88, 47.4], [-23.03, 50.1], [-22.5, 56.53]], -52.46, -50.91),
];

const cutouts = [
  building(levels.cloisterCourt, elevation - .8, 34.65),
  sliceAlongNave(ring(-5.87, 54.24, 5.655, 5.655, 20), 29.84, 32.3),
  sliceAlongNave(ring(westCenter, 53.3, 4.8, 4.8, 20), -55.12, -52.76),
  sliceAlongNave(pointed(westCenter, 11.7, 16.4, 32.2, 43.6), -55.05, -51.64),
  sliceAcrossNave(pointed(-12.92, 7.55, 16.6, 27.4, 35.4), -35.5, -30.48),
  sliceAcrossNave(pointed(-12.72, 5.45, 16.8, 24.2, 31.15), 20.85, 23.9),
];
for (const n of [-23.1, 15.45]) {
  cutouts.push(sliceAlongNave(pointed(n, 3.8, 31.3, 37.9, 43.3), -53.0, -50.71));
}
for (const x of [-6.18, -2.89, .36]) {
  cutouts.push(sliceAcrossNave(pointed(x, 1.66, 58.75, 62.15, 63.22), 32.86, 35.6));
}
for (const n of [25.9, 29.4, 32.48]) {
  cutouts.push(sliceAlongNave(pointed(n, 1.65, 58.75, 62.15, 63.22), -10.6, -7.7));
}
for (const x of [-42.1, -32.9, -23.3, -13.04, -2.58, 7.07, 16.83, 26.35]) {
  cutouts.push(sliceAcrossNave(pointed(x, 2.95, 49.7, 54.15, 57.15), -16.9, -15.33));
}
for (const x of [-41.4, -32.9, -23.3, -2.58, 7.07, 16.83, 26.35]) {
  const edge = -32.16 - (x + 41.4) * .029;
  cutouts.push(sliceAcrossNave(pointed(x, 2.45, 26.7, 32.3, 34.56), edge - 1.0, edge + 1.22));
}

const carved = subtract(union([
  base, church, sanctuaryTerrace, nave, ...aisles, chapelRoyal, chapelTrinity, ...apseSides,
  ...supports, ...annex, ...bellTower, ...westFront, ...westCrown,
]), cutouts);
const simplified = carved.simplify(.075);
carved.delete();

const [[ee, en], [ne, nn]] = survey.anchor.localEastNorthToEnu;
const registered = simplified.transform([
  ee, 0, -en, 0,
  ne, 0, -nn, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
]);
simplified.delete();
const components = registered.decompose();
const disconnected = components.map(component => component.boundingBox());
for (const part of components) part.delete();
assert.equal(components.length, 1, JSON.stringify(disconnected));
const genus = registered.genus();
assert(genus >= 25, 'cloister and double-arcade openings must remain open: genus ' + genus);
const volume = registered.volume();
const { glb, min, max, vertices, triangles } = printGlb(registered, attribution, previewDirection);
registered.delete();

const height = Math.round((levels.westCrown - elevation) * 1000) / 1000;
assert(Math.abs(min[1]) < 1e-5, 'foundation plane');
assert(Math.abs(max[1] - height) < .001, 'highest west pinnacle');
await writeFile(new URL('print.glb', directory), glb);

if (process.argv[2]) {
  const { geometry, id: osmId } = survey.footprint;
  const [outer] = geometry.coordinates;
  const longitude = outer.map(([lon]) => lon);
  const latitude = outer.map(([, lat]) => lat);
  const osmWay = 'osm-way-' + osmId;
  const path = 'models/' + id + '/r1/';
  const feature = {
    type: 'Feature', id,
    bbox: [Math.min(...longitude), Math.min(...latitude), Math.max(...longitude), Math.max(...latitude)],
    geometry,
    properties: {
      name: 'Catedral de Mallorca',
      aliases: ['La Seu', 'Palma Cathedral', 'Catedral de Santa Maria de Mallorca', 'Catedral de Palma de Mallorca'],
      geometryType: 'building',
      place: 'Palma, Spain',
      city: 'Palma',
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
      replacement: { featureIds: [osmWay], families: [osmWay] },
    },
  };
  await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
}
console.log(JSON.stringify({
  bytes: glb.length, vertices, triangles, min, max, genus, volume, anchorElevation: elevation,
  sha256: createHash('sha256').update(glb).digest('hex'),
}));
