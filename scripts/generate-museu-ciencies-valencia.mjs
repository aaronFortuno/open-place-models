import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { ShapeUtils, Vector2 } from 'three';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'museu-ciencies-valencia';
const directory = new URL(`../models/${id}/r1/`, import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { elevation, eastNorth, local: [, anchorV] } = survey.anchor;
const [axisEast, axisSouth] = survey.axis.direction;
const { Manifold, mesh } = await openSolids();

// Model in metres along the building, above its foundation, and across toward the south terrace.
function sweep(sections) {
  const ringSize = sections[0].length;
  const vertices = sections.flat(2);
  const faces = [];
  for (let i = 0; i < sections.length - 1; i++) {
    for (let j = 0; j < ringSize; j++) {
      const a = i * ringSize + j;
      const b = i * ringSize + (j + 1) % ringSize;
      faces.push(a, b, b + ringSize, a, b + ringSize, a + ringSize);
    }
  }
  for (const i of [0, sections.length - 1]) {
    const ring = sections[i].map(([, y, v]) => new Vector2(y, v));
    for (let [a, b, c] of ShapeUtils.triangulateShape(ring, [])) {
      const normal = ring[b].clone().sub(ring[a]).cross(ring[c].clone().sub(ring[a]));
      if ((i === 0 && normal > 0) || (i > 0 && normal < 0)) [b, c] = [c, b];
      const offset = i * ringSize;
      faces.push(offset + a, offset + b, offset + c);
    }
  }
  const solid = mesh(vertices, faces);
  assert.equal(solid.status(), 'NoError');
  assert(solid.volume() > 0);
  return solid;
}

function wing(first, last, profile) {
  return sweep([first, last].map(u => profile.map(([v, y]) => [u, y - elevation, v])));
}

// Across- and height controls for the glazed recess and exposed rib at each level.
// The north curtain climbs to the ridge and the roof falls to the serrated south edge.
const profile = [
  [24.7, 2, 24.7, 2], [24.2, 10.8, 22.5, 10.8],
  [22, 17, 19.5, 17], [23.5, 27.6, 20.6, 30],
  [30.2, 41.3, 29.2, 43.2], [38.8, 49.8, 39.1, 52.7],
  [48.1, 54.6, 46.5, 57], [55.2, 52.8, 55.7, 55],
  [66.4, 47.6, 67.4, 50], [82.2, 40.4, 83.5, 43],
  [95, 34.4, 97.7, 37], [98, 30.9, 109, 34.9],
  [96, 26.7, 104.8, 27.4], [98.1, 21.2, 107.4, 21.8, 2.8],
  [97.8, 14.3, 105.6, 14.7, -2], [101.1, 7.1, 109.4, 7.1, 1.4],
  [103, 2, 110, 2]
];
const { bayPitch, bays } = survey.measurements;
const firstRib = -104.7;
const sections = Array.from({ length: 2 * bays + 1 }, (_, i) => {
  const u = firstRib + i * bayPitch / 2;
  return profile.map(([recessV, recessY, ribV, ribY, diagonal = 0]) => i % 2
    ? [u + diagonal, recessY - elevation, recessV]
    : [u + diagonal, ribY - elevation, ribV]);
});

const parts = [
  sweep(sections),
  wing(-121, 121.5, [[1, 2], [1, 9.7], [22, 9.7], [30.8, 7.2], [30.8, 2]]),
  wing(-102.5, 102.5, [[95, 9.8], [95, 21], [118.4, 21], [118.4, 19.4], [111, 17.4]]),
  wing(-99.2, -90.8, [[116.8, 16.9], [116.8, 20.6], [121, 20.6],
    [155.4, 3.2], [155.4, 2], [152, 2], [121, 17.1]]),
  wing(91.2, 100.5, [[116.8, 16.9], [116.8, 20.6], [121, 20.6],
    [155.4, 3.2], [155.4, 2], [152, 2], [121, 17.1]])
];

// Inclined supports at the end elevations tie the high shell to the forecourt.
const supports = [
  [119.4, 119.4, 38, 28, 30], [119.1, 120.2, 47, 39, 45], [118.4, 120, 56, 47, 51.8],
  [116.2, 118.4, 65, 57, 49.7], [112.5, 115.5, 74, 68, 44.5], [106.1, 110.5, 82, 78, 39]
];
for (const side of [-1, 1]) {
  const end = side < 0 ? firstRib : firstRib + bays * bayPitch;
  for (const [westFoot, eastFoot, forecourtV, shellV, top] of supports) {
    const foot = side < 0 ? -westFoot : eastFoot;
    const rings = [
      [foot, 0, forecourtV, 1.45, 1.15],
      [end - side * 2.6, top - elevation, shellV, 1.6, 1.45]
    ];
    const vertices = rings.flatMap(([u, y, v, du, dv]) =>
      [[-du, -dv], [du, -dv], [du, dv], [-du, dv]].flatMap(([x, z]) => [u + x, y, v + z]));
    const faces = [0,1,2,0,2,3,4,6,5,4,7,6,
      0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];
    const support = mesh(vertices, faces);
    assert.equal(support.status(), 'NoError');
    parts.push(support);
  }
}

const assembled = Manifold.union(parts);
for (const part of parts) part.delete();
assert.equal(assembled.status(), 'NoError');
const reduced = assembled.simplify(.045);
assembled.delete();
const { vertProperties, triVerts } = reduced.getMesh();
const positions = [];
const [[eastE, eastN], [northE, northN]] = eastNorth;
for (let i = 0; i < vertProperties.length; i += 3) {
  const [u, y, v] = vertProperties.subarray(i, i + 3);
  const across = v - anchorV;
  const easting = u * axisEast - across * axisSouth;
  const northing = -u * axisSouth - across * axisEast;
  positions.push(eastE * easting + eastN * northing, y, -northE * easting - northN * northing);
}
const finished = mesh(positions, triVerts);
reduced.delete();
assert.equal(finished.status(), 'NoError');
assert.equal(finished.decompose().length, 1);

const meshCredits = 'Open Place Models contributors (local reconstruction); PNOA / Instituto Geográfico Nacional (CC BY 4.0); plan © OpenStreetMap contributors, via OpenFreeMap (ODbL 1.0).';
const camera = [-1.2, .30, .42];
const { glb, min, max, triangles } = printGlb(finished, meshCredits, camera);
assert.equal(min[1], 0);
assert(Math.abs(max[1] - 55) < .01);
assert(glb.length < 31000);
await writeFile(new URL('print.glb', directory), glb);

const [output] = process.argv.slice(2);
if (output) {
  const root = `models/${id}/r1/`;
  const { bbox, coordinates } = survey.footprint;
  const feature = { type: 'Feature', id, bbox, geometry: { type: 'Polygon', coordinates }, properties: {
    kind: 'building', geometryType: 'building', name: 'Museu de les Ciències Príncep Felip',
    place: 'València, Spain', city: 'València', country: 'Spain',
    aliases: ['Museo de las Ciencias Príncipe Felipe', 'Príncipe Felipe Science Museum'],
    revision: 'r1', anchor: survey.anchor.coordinates, terrainBaseElevation: elevation,
    height: max[1], mesh: root + 'print.glb', byteLength: glb.length, thumbnail: root + 'thumbnail.webp',
    license: 'CC-BY-4.0', spatialDataLicense: 'ODbL-1.0',
    attribution: 'Open Place Models contributors (original reconstruction); PNOA / Instituto Geográfico Nacional (CC BY 4.0); plan © OpenStreetMap contributors, via OpenFreeMap (ODbL 1.0). The mesh licence covers the contributed geometry only. See the revision notes for separate rights in the building’s image and design.',
    replacement: { featureIds: [
      'osm-relation-14693200', 'osm-way-23433775', 'osm-way-1103649055', 'osm-way-1103800106'
    ] },
    sources: [
      'https://cac.es/museu-de-les-ciencies/',
      'https://prod.calatrava.com/projects/ciudad-de-las-artes-y-de-las-ciencias-valencia.html',
      'https://informesdelaconstruccion.revistas.csic.es/index.php/informesdelaconstruccion/article/view/688',
      'https://riunet.upv.es/bitstream/10251/31662/1/TESIS%20FJ%20SANCHIS.pdf',
      'https://pnoa.ign.es/pnoa-lidar/visualizadores-y-servicios-web',
      'https://www.openstreetmap.org/relation/14693200',
      'https://www.openstreetmap.org/way/1103800106',
      'https://servicios.cac.es/portalocupacio/ofertas/139/Manuales_Temario/IV.2.pdf',
      'https://github.com/aaronFortuno/open-place-models/blob/main/models/museu-ciencies-valencia/r1/README.md#rights-and-licence'
    ]
  } };
  await writeFile(output, JSON.stringify(feature, null, 2) + '\n');
}
console.log(JSON.stringify({ triangles, bytes: glb.length, volume: finished.volume(), min, max,
  sha256: createHash('sha256').update(glb).digest('hex') }));
