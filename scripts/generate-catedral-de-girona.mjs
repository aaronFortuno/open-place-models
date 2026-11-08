import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'catedral-de-girona';
const directory = new URL('../models/catedral-de-girona/r1/', import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { Manifold, mesh } = await openSolids();
const { projected: [anchorX, anchorN], elevation } = survey.anchor;
const sources = [
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions',
  'https://betaportal.icgc.cat/model-3d-de-girona/',
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Imatge/Ortofoto-local',
  'https://www.guiavisualcatedralgirona.cat/la-facana-principal/',
  'https://www.guiavisualcatedralgirona.cat/la-capcalera-de-la-catedral/',
  'https://www.guiavisualcatedralgirona.cat/la-torre-de-carlemany/',
  'https://www.guiavisualcatedralgirona.cat/el-claustre/',
  'https://revistes.uab.cat/locus/article/download/188/188-pdf-ca',
  'https://www.openstreetmap.org/relation/1012115',
];
const attribution = 'Open Place Models contributors (reconstruction); Institut Cartogràfic i Geològic de Catalunya (CC BY 4.0); plan © OpenStreetMap contributors (ODbL 1.0).';
const previewDirection = [-1, 0.57, 0.67];

function polyhedron(points, faces) {
  const vertices = points.flatMap(([x, n, z]) => [x - anchorX, n - anchorN, z - elevation]);
  const solid = mesh(vertices, faces);
  assert.equal(solid.status(), 'NoError');
  return solid;
}

function loft(sections) {
  const count = sections[0][1].length;
  const points = sections.flatMap(([height, outline]) => outline.map(([x, n]) => [x, n, height]));
  const last = points.length - count;
  const faces = [];
  for (let i = 1; i < count - 1; i++) faces.push(0, i + 1, i, last, last + i, last + i + 1);
  for (let ring = 0; ring < last; ring += count) {
    for (let i = 0; i < count; i++) {
      const a = ring + i;
      const b = ring + (i + 1) % count;
      faces.push(a, b, b + count, a, b + count, a + count);
    }
  }
  return polyhedron(points, faces);
}

function building(outline, bottom, top) {
  return loft([[bottom, outline], [top, outline]]);
}

function rectangle(x0, x1, n0, n1) {
  return [[x0, n0], [x1, n0], [x1, n1], [x0, n1]];
}

function box(x0, x1, n0, n1, z0, z1) {
  return building(rectangle(x0, x1, n0, n1), z0, z1);
}

function ring(x, n, eastRadius, northRadius, count = 12, phase = 0) {
  return Array.from({ length: count }, (_, i) => {
    const angle = phase + 2 * Math.PI * i / count;
    return [x + eastRadius * Math.cos(angle), n + northRadius * Math.sin(angle)];
  });
}

// Extrude a convex arch or other vertical profile along a horizontal axis.
function verticalPrism(profile, from, to, direction = [1, 0]) {
  const [dx, dn] = direction;
  const count = profile.length;
  const points = [from, to].flatMap(([x, n]) => profile.map(([across, z]) => [x - dn * across, n + dx * across, z]));
  const faces = [];
  for (let i = 1; i < count - 1; i++) faces.push(0, i + 1, i, count, count + i, count + i + 1);
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    faces.push(i, next, next + count, i, next + count, i + count);
  }
  return polyhedron(points, faces);
}

function arch(width, low, shoulder, rise) {
  const half = width / 2;
  const crown = Array.from({ length: 7 }, (_, i) => {
    const angle = Math.PI * i / 6;
    return [half * Math.cos(angle), shoulder + rise * Math.sin(angle)];
  });
  return [[-half, low], [half, low], ...crown];
}

function archedRecess(x0, x1, centre, width, low, shoulder, rise) {
  return verticalPrism(arch(width, low, shoulder, rise), [x0, centre], [x1, centre]);
}

function roundRecess(x0, x1, centre, z, radius) {
  return verticalPrism(ring(0, z, radius, radius, 20), [x0, centre], [x1, centre]);
}

function union(parts) {
  const combined = Manifold.union(parts);
  for (const part of parts) part.delete();
  assert.equal(combined.status(), 'NoError');
  return combined;
}

function cut(solid, tools) {
  const cutout = union(tools);
  const carved = solid.subtract(cutout);
  cutout.delete();
  solid.delete();
  assert.equal(carved.status(), 'NoError');
  return carved;
}

const { points: basePoints, faces: baseFaces, edges } = survey.base;
const count = basePoints.length;
const base = polyhedron([
  ...basePoints.map(([x, n, z]) => [x, n, z]),
  ...basePoints.map(([x, n, , z]) => [x, n, z]),
], [
  ...baseFaces.flat(),
  ...baseFaces.flatMap(([a, b, c]) => [a + count, c + count, b + count]),
  ...edges.flatMap(([a, b]) => [a + count, b + count, b, a + count, b, a]),
]);
const foundation = base.simplify(0.22);
base.delete();

// Oblique cloud sections and the LiDAR surface agree on the nave's shallow two-sided roof.
const nave = verticalPrism([
  [372.6, 91.6], [398.5, 91.6], [398.5, 132.45],
  [385.2, survey.surface.naveRidge], [372.6, 132.52],
], [573.12, 0], [625.27, 0]);
const facade = box(572.02, 574.2, 371.5, 402.0, 93.6, 137.03);
const buttresses = [];
for (const x of [599.3, 611.3, 623.1]) {
  buttresses.push(verticalPrism([
    [366.95, 95.8], [373.6, 95.8], [373.6, 132.65], [370.3, 132.37],
    [369.5, 123.7], [368.72, 112.4],
  ], [x - 0.93, 0], [x + 0.93, 0]));
}
for (const x of [586.4, 599.2, 611.15]) {
  buttresses.push(verticalPrism([
    [397.6, 92], [405.7, 92], [404.0, 114], [402.36, 124.5], [400.6, 131.45], [397.6, 132.8],
  ], [x - 0.94, 0], [x + 0.94, 0]));
}

// The lower chevet roof and the higher flat choir roof are separate measured steps.
const ambulatory = building([
  [624.25, 371.0], [637.6, 371.0], [644.8, 372.5], [650.35, 376.9],
  [653.6, 383.0], [653.9, 387.7], [652.1, 392.0], [648.0, 396.0],
  [642.3, 398.1], [624.25, 399.1],
], 100, 113.0);
const choir = building([
  [624.3, 377.55], [644.45, 377.55], [647.9, 379.3], [649.72, 382.9],
  [649.72, 386.4], [647.42, 389.62], [644.2, 391.2], [624.3, 391.2],
], 111.4, survey.surface.choirRoof);
const flyingButtresses = [];
const choirCentre = [637.0, 384.45];
for (const [x, n] of [
  [632.0, 373.4], [639.2, 373.4], [645.8, 375.0], [650.6, 378.2],
  [653.5, 382.2], [653.9, 386.8], [651.1, 391.6], [647.4, 395.7],
  [640.8, 397.0], [633.2, 396.0],
]) {
  // A low masonry web and its pointed pier head retain the repeated silhouette.
  const length = Math.hypot(x - choirCentre[0], n - choirCentre[1]);
  const outward = [(x - choirCentre[0]) / length, (n - choirCentre[1]) / length];
  const [dx, dn] = outward;
  const pier = rectangle(x - 0.68, x + 0.68, n - 0.65, n + 0.65);
  flyingButtresses.push(loft([
    [106.2, pier], [114.1, pier],
    [115.8, rectangle(x - 0.20, x + 0.20, n - 0.19, n + 0.19)],
  ]));
  // The bands beneath these roof-height supports are represented by the stepped roof.
  const reach = length < 15 ? 6.2 : 4.7;
  const innerX = x - dx * reach;
  const innerN = n - dn * reach;
  const tangent = [dn, -dx];
  flyingButtresses.push(verticalPrism([
    [0, 111.0], [reach + .35, 111.0], [reach + .35, 115.0], [0, 120.75],
  ], [innerX - tangent[0] * .52, innerN - tangent[1] * .52],
  [innerX + tangent[0] * .52, innerN + tangent[1] * .52], tangent));
}

const facadeDecor = [];
const pilasterPairs = [[372.03, 373.52], [377.51, 378.5], [381.05, 382.0], [386.55, 387.50], [390.55, 391.52], [397.5, 399.2]];
for (const [lo, hi] of pilasterPairs) {
  facadeDecor.push(box(571.18, 572.56, lo, hi, 97.15, 115.3));
}
for (const [height, n0, n1] of [
  [104.6, 377.2, 391.8], [110.45, 371.55, 401.95], [115.1, 376.8, 392.0],
  [128.35, 375.6, 393.4], [135.83, 371.35, 402.15],
]) {
  facadeDecor.push(box(571.05, 572.8, n0, n1, height, height + 0.62));
}
facadeDecor.push(roundRecess(571.23, 572.43, 384.17, 122.02, 4.34));
const details = [
  archedRecess(570.7, 573.59, 384.17, 3.17, 97.27, 102.07, 1.52),
  roundRecess(570.65, 573.06, 384.17, 122.02, 3.44),
  roundRecess(623.83, 625.58, 384.54, 126.48, 3.70),
];
for (const n of [377.12, 379.47, 381.82, 384.17, 386.52, 388.87, 391.22]) {
  details.push(archedRecess(570.93, 572.86, n, 1.18, 129.48, 131.71, 0.69));
}
for (const n of [379.6, 388.76]) {
  for (const z of [99.15, 106.24, 112.0]) {
    details.push(archedRecess(570.97, 572.57, n, 1.18, z, z + 1.79, 0.65));
  }
}

const towerCentre = [580.18, 366.48];
const lowerTower = [
  [576.26, 360.26], [584.11, 360.24], [587.92, 363.53], [588.21, 369.06],
  [584.58, 373.06], [576.62, 373.52], [572.55, 370.04], [572.59, 363.86],
];
const octagon = [
  [577.62, 361.10], [582.23, 361.04], [586.72, 363.82], [586.86, 368.91],
  [582.41, 371.91], [577.74, 371.76], [573.68, 369.13], [573.56, 363.97],
];
function scaled(profile, factor) {
  const [x, n] = towerCentre;
  return profile.map(([px, pn]) => [x + (px - x) * factor, n + (pn - n) * factor]);
}
const tower = loft([
  [91.8, lowerTower], [133.8, lowerTower], [135.95, scaled(lowerTower, 1.053)],
  [136.63, scaled(lowerTower, 1.052)], [137.02, scaled(octagon, 1.045)],
  [137.78, octagon], [140.53, octagon], [141.02, scaled(octagon, 1.082)],
  [141.75, octagon], [150.18, octagon], [151.0, scaled(octagon, 1.06)],
  [151.77, scaled(octagon, 1.014)], [153.65, scaled(octagon, 1.074)],
  [154.28, scaled(octagon, 1.058)], [155.05, scaled(octagon, 0.78)],
  [156.0, scaled(octagon, 0.68)], [157.55, scaled(octagon, 0.57)],
  [158.60, scaled(octagon, 0.40)], [159.22, scaled(octagon, 0.22)],
  [159.92, scaled(octagon, 0.17)], [161.2, scaled(octagon, 0.196)],
  [162.56, scaled(octagon, 0.144)], [163.24, scaled(octagon, 0.103)],
  [survey.surface.bellTowerTop[2], scaled(octagon, 0.104)],
]);

for (let i = 0; i < octagon.length; i++) {
  const a = octagon[i];
  const b = octagon[(i + 1) % octagon.length];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const inward = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
  const [x, n] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  details.push(verticalPrism(arch(1.78, 142.0, 148.14, 0.91),
    [x - inward[0] * 0.4, n - inward[1] * 0.4],
    [x + inward[0] * 1.75, n + inward[1] * 1.75], inward));
}

const carlemany = [
  box(613.52, 621.48, 397.5, 406.14, 95.8, 134.25),
  box(613.24, 621.77, 397.22, 406.39, 133.79, 134.58),
];
for (const z of [115.35, 119.65, 123.9, 128.14]) {
  carlemany.push(box(613.37, 621.61, 399.12, 406.32, z, z + 0.36));
  for (const x of [616.46, 618.69]) {
    details.push(verticalPrism(arch(1.35, z + 0.58, z + 2.36, 0.65), [x, 406.66], [x, 405.33], [0, -1]));
  }
}
const facadeTowerJoint = box(573.7, 577.5, 371.02, 373.98, 91.8, 136.22);
const chapel = union([foundation, nave, facade, facadeTowerJoint, ...buttresses, ambulatory, choir,
  ...flyingButtresses, tower, ...carlemany, ...facadeDecor]);
const carved = cut(chapel, details);
const simplified = carved.simplify(0.065);
carved.delete();

const [[ee, en], [ne, nn]] = survey.anchor.gridEastNorthToEnu;
const registered = simplified.transform([
  ee, 0, -en, 0,
  ne, 0, -nn, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
]);
simplified.delete();
const baseShift = registered.boundingBox().min[1];
const final = registered.translate([0, -baseShift, 0]);
registered.delete();
const anchorElevation = Math.round((elevation + baseShift) * 1000) / 1000;
const components = final.decompose();
assert.equal(components.length, 1, 'one connected solid');
for (const part of components) part.delete();
assert.equal(final.genus(), 1, 'only the cloister courtyard passes through the model');
const { glb, min, max, vertices, triangles } = printGlb(final, attribution, previewDirection);
const volume = final.volume();
final.delete();
assert(Math.abs(min[1]) < 1e-4);
const height = Math.round((survey.surface.bellTowerTop[2] - anchorElevation) * 1000) / 1000;
assert(Math.abs(max[1] - height) < 0.001, 'summit ' + max[1] + ' expected ' + height);
const meshPath = 'models/catedral-de-girona/r1/print.glb';
await writeFile(new URL('print.glb', directory), glb);

if (process.argv[2]) {
  const { geometry, id: osmId } = survey.footprint;
  const [outer] = geometry.coordinates;
  const longitude = outer.map(([lon]) => lon);
  const latitude = outer.map(([, lat]) => lat);
  const relation = 'osm-relation-' + osmId;
  const feature = {
    type: 'Feature',
    id,
    bbox: [Math.min(...longitude), Math.min(...latitude), Math.max(...longitude), Math.max(...latitude)],
    geometry,
    properties: {
      name: 'Catedral de Girona',
      aliases: ['Girona Cathedral', 'Catedral de Santa Maria', 'Catedral de Gerona', 'Cathédrale Sainte-Marie de Gérone'],
      geometryType: 'building',
      place: 'Girona, Spain',
      city: 'Girona',
      country: 'Spain',
      revision: 'r1',
      anchor: survey.anchor.wgs84,
      anchorElevation,
      height,
      mesh: meshPath,
      byteLength: glb.length,
      thumbnail: meshPath.replace('print.glb', 'thumbnail.webp'),
      license: 'CC-BY-4.0',
      attribution,
      spatialDataLicense: 'ODbL-1.0',
      sources,
      replacement: { featureIds: [relation], families: [relation] },
    },
  };
  await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
}
console.log(JSON.stringify({ bytes: glb.length, vertices, triangles, min, max, volume, anchorElevation, sha256: createHash('sha256').update(glb).digest('hex') }));
