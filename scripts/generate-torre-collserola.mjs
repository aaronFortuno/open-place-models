import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'torre-collserola';
const directory = new URL('../models/torre-collserola/r1/', import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { Manifold, plate, turned, mesh } = await openSolids();
const [longitude, latitude] = survey.anchor.wgs84;
const metresPerDegree = 111320;
const metresPerLongitude = metresPerDegree * Math.cos(latitude * Math.PI / 180);
const attribution = 'Open Place Models contributors (original reconstruction); footprint and placement © OpenStreetMap contributors (ODbL 1.0).';
const previewDirection = [1, 0.25, 1.4];
const height = 266;

function position(lon, lat, y = 0) {
  return [(lon - longitude) * metresPerLongitude, y, (latitude - lat) * metresPerDegree];
}

function solidFrom(vertices, faces) {
  let volume = 0;
  for (const [a, b, c] of faces) {
    const p = vertices[a], q = vertices[b], r = vertices[c];
    volume += (p[0] * (q[1] * r[2] - q[2] * r[1]) +
      p[1] * (q[2] * r[0] - q[0] * r[2]) +
      p[2] * (q[0] * r[1] - q[1] * r[0])) / 6;
  }
  if (volume < 0) faces = faces.map(([a, b, c]) => [a, c, b]);
  const solid = mesh(vertices.flat(), faces.flat());
  assert.equal(solid.status(), 'NoError');
  assert(solid.volume() > 0);
  return solid;
}

function beam(start, end, radius, segments = 10, endRadius = radius) {
  const axis = end.map((value, i) => value - start[i]);
  const length = Math.hypot(...axis);
  const direction = axis.map(value => value / length);
  const reference = Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const right = [
    direction[1] * reference[2] - direction[2] * reference[1],
    direction[2] * reference[0] - direction[0] * reference[2],
    direction[0] * reference[1] - direction[1] * reference[0],
  ];
  const rightLength = Math.hypot(...right);
  for (let i = 0; i < 3; i++) right[i] /= rightLength;
  const up = [
    direction[1] * right[2] - direction[2] * right[1],
    direction[2] * right[0] - direction[0] * right[2],
    direction[0] * right[1] - direction[1] * right[0],
  ];
  const vertices = [], faces = [];
  for (const [centre, r] of [[start, radius], [end, endRadius]]) {
    for (let i = 0; i < segments; i++) {
      const angle = i * 2 * Math.PI / segments;
      vertices.push(centre.map((value, axis) => value +
        r * (right[axis] * Math.cos(angle) + up[axis] * Math.sin(angle))));
    }
  }
  vertices.push(start, end);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    faces.push([2 * segments, next, i], [2 * segments + 1, segments + i, segments + next]);
    faces.push([i, next, segments + next], [i, segments + next, segments + i]);
  }
  return solidFrom(vertices, faces);
}

const polar = (radius, angle, y) => [radius * Math.cos(angle), y, radius * Math.sin(angle)];
const platformRadius = angle => 11.38 + 3 * Math.cos(3 * angle);
const platformOutline = Array.from({ length: 48 }, (_, i) => {
  const angle = i * 2 * Math.PI / 48;
  const radius = platformRadius(angle);
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
});
const platformLevels = Array.from({ length: 13 }, (_, i) => 84 + i * (136 - 84) / 12);
const parts = [];

parts.push(plate(survey.outline.coordinates[0][0].slice(0, -1).map(([lon, lat]) => {
  const [x, , z] = position(lon, lat);
  return [x, z];
}), 1.2));
parts.push(turned(0, 0, [[0, 3.4], [1.2, 3.4], [2.4, 2.25], [205.5, 2.25]], 40));

for (const level of platformLevels) {
  parts.push(plate(platformOutline, 0.9).translate([0, level, 0]));
}
for (let i = 0; i < 12; i++) {
  const angle = i * 2 * Math.PI / 12;
  const main = i % 4 === 0;
  const radius = main ? 0.85 : 0.46;
  const distance = platformRadius(angle) - (main ? 0.85 : 0.32);
  const [x, , z] = polar(distance, angle, 0);
  parts.push(turned(x, z, [[83.5, radius], [152.7, radius]], main ? 16 : 10));
}

for (let i = 0; i < 3; i++) {
  const angle = i * 2 * Math.PI / 3;
  for (const offset of [-0.14, 0.14]) {
    const a = angle + offset;
    const [x, , z] = polar(26.5, a, 0);
    parts.push(turned(x, z, [[0, 1.25], [2.1, 1.25]], 12));
    parts.push(beam(polar(1.5, a, 0.9), polar(26.5, a, 0.9), 0.9, 10));
    parts.push(beam(polar(26.5, a, 1.1), polar(platformRadius(a) - 0.15, a, 84.45), 0.5, 10));
  }
  parts.push(beam(polar(13.45, angle, 151.65), polar(1.5, angle, 204.5), 0.5, 12));
}

parts.push(turned(0, 0, [[203.5, 2.15], [206, 2.15], [208, 1.55], [237.5, 1.35], [243.5, 1.05]], 32));
for (const level of [214, 224, 234]) {
  parts.push(turned(0, 0, [[level - 0.35, 1.7], [level + 0.35, 1.7]], 24));
  for (let i = 0; i < 3; i++) {
    const angle = i * 2 * Math.PI / 3 + level * 0.03;
    const [x, , z] = polar(1.45, angle, 0);
    parts.push(turned(x, z, [[level - 1.2, 0.7], [level + 1.5, 0.7]], 12));
  }
}
parts.push(turned(0, 0, [[242.5, 0.8], [258, 0.55], [266, 0.38]], 20));
for (let i = 0; i < 3; i++) {
  const angle = i * 2 * Math.PI / 3;
  parts.push(beam(polar(0.85, angle, 242.7), polar(0.3, angle, 265), 0.32, 8, 0.24));
}
for (const level of [246, 251, 256, 261, 264.5]) {
  const radius = 0.85 - (level - 242.7) * 0.55 / 22.3;
  for (let i = 0; i < 3; i++) {
    const a = i * 2 * Math.PI / 3, b = (i + 1) * 2 * Math.PI / 3;
    parts.push(beam(polar(radius, a, level), polar(radius, b, level), 0.24, 8));
  }
}

const tower = Manifold.union(parts);
for (const part of parts) part.delete();
assert.equal(tower.status(), 'NoError');
const components = tower.decompose();
assert.equal(components.length, 1, 'Every cable, platform and antenna must join the printable solid');
for (const component of components) component.delete();
const volume = tower.volume();
const { glb, min, max, vertices, triangles } = printGlb(tower, attribution, previewDirection);
tower.delete();
assert(Math.abs(min[1]) < 0.001);
assert(Math.abs(max[1] - height) < 0.001);
assert(glb.length < 4 * 1024 * 1024);
const meshPath = 'models/torre-collserola/r1/print.glb';
await writeFile(new URL('print.glb', directory), glb);

if (process.argv[2]) {
  const anchorCorridors = [];
  for (let i = 0; i < 3; i++) for (const offset of [-0.14, 0.14]) {
    const angle = i * 2 * Math.PI / 3 + offset;
    const radial = [Math.cos(angle), Math.sin(angle)], across = [-radial[1], radial[0]];
    const ring = [[17.8, -1.4], [28, -1.4], [28, 1.4], [17.8, 1.4]].map(([forward, side]) => {
      const x = forward * radial[0] + side * across[0];
      const z = forward * radial[1] + side * across[1];
      return [longitude + x / metresPerLongitude, latitude - z / metresPerDegree];
    });
    ring.push(ring[0]);
    anchorCorridors.push([ring]);
  }
  const geometry = { type: 'MultiPolygon', coordinates: [...survey.outline.coordinates, ...anchorCorridors] };
  const points = geometry.coordinates.flat(2);
  const bbox = [
    Math.min(...points.map(([lon]) => lon)), Math.min(...points.map(([, lat]) => lat)),
    Math.max(...points.map(([lon]) => lon)), Math.max(...points.map(([, lat]) => lat)),
  ];
  const osm = 'osm-relation-20725097';
  const feature = {
    type: 'Feature', id, bbox, geometry,
    properties: {
      name: 'Torre de Collserola',
      aliases: ['Collserola Tower', 'Torre de telecomunicacions de Collserola'],
      geometryType: 'monument',
      place: 'Barcelona, Spain', city: 'Barcelona', country: 'Spain',
      revision: 'r1', anchor: survey.anchor.wgs84, anchorElevation: survey.anchor.elevation,
      height, mesh: meshPath, byteLength: glb.length,
      thumbnail: meshPath.replace('print.glb', 'thumbnail.webp'),
      license: 'CC-BY-4.0', spatialDataLicense: 'ODbL-1.0', attribution,
      sources: [
        'https://www.torredecollserola.com/torre-collserola',
        'https://www.indus-eng.com/project/torre-collserola/',
        'https://structurae.net/en/structures/collserola-tower',
        'https://es.wikiarquitectura.com/edificio/torre-de-collserola/',
        survey.source.url,
      ],
      replacement: { featureIds: [osm], families: [osm] },
    },
  };
  await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
}
console.log(JSON.stringify({ bytes: glb.length, vertices, triangles, min, max, volume,
  platformLevels, sha256: createHash('sha256').update(glb).digest('hex') }));
