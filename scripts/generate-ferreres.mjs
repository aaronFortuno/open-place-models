import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {openSolids, printIndexedGlb} from './monument-solids.mjs';

const id = 'aqueducte-ferreres';
const modelPath = `models/${id}/r1/`;
const folder = new URL(`../${modelPath}`, import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey.json', folder), 'utf8'));
const {anchor, length, direction, elevationOrigin, parapetElevation, intermediateElevation,
  upperSpring, lowerSpring, firstUpperArchStation, spacing, upperFeet, lowerFeet} = survey;
const attribution = 'Open Place Models contributors · ICGC · OpenStreetMap contributors';
const sources = [
  'https://www.icac.cat/wp-content/uploads/2016/04/TARRACO_II_Arquitectura_y_urbanismo_de_una1.pdf#page=58',
  'https://www.tarragona.cat/patrimoni/patrimoni-mundial/conjunt-arqueologic-de-tarraco-1/museu-historia/monuments/laqueducte-del-francoli',
  'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Elevacions/WMS-Elevacions-territorial',
  'https://www.openstreetmap.org/way/87292930',
];

const {Manifold, box, prism} = await openSolids();
const level = elevation => elevation - elevationOrigin;
const [lowerStart, lowerEnd] = [lowerFeet[0][0], lowerFeet.at(-1)[0]];
const structureDepth = 1.86;
const conduitWidth = 1.05;
const rimWidth = 2.06;
const lowerWidth = 2.47;
const footingWidth = 3.108;
const bearing = Math.atan2(direction[1], direction[0]) * 180 / Math.PI;

function groundArcade(feet, top, width) {
  const bottom = feet.map(([x, ground]) => [x, level(ground)]);
  return prism([...bottom, [bottom.at(-1)[0], level(top)], [bottom[0][0], level(top)]],
    -width / 2, width / 2);
}

function archVoid(center, spring, bottom) {
  const radius = 5.90 / 2;
  const curve = Array.from({length: 11}, (_, i) => {
    const angle = i * Math.PI / 10;
    return [center + radius * Math.cos(angle), level(spring + radius * Math.sin(angle))];
  });
  return prism([[center - radius, level(bottom)], [center + radius, level(bottom)], ...curve],
    -footingWidth, footingWidth);
}

const seating = 1.15;
const lower = groundArcade(lowerFeet.map(([x, ground]) => [x, ground - seating]),
  intermediateElevation, lowerWidth);
const lowerHoles = lowerFeet.slice(0, -1).map(([x]) => archVoid(x + spacing / 2, lowerSpring, 29));
const steppedFeet = lowerFeet.flatMap(([x, ground]) => {
  const toe = ground - seating;
  const cap = Math.max(toe + .9, Math.min(ground + 3.0, lowerSpring));
  const mid = (toe + cap) / 2;
  return [
    box(x - 1.5875, x + 1.5875, level(toe), level(mid + .06), -footingWidth / 2, footingWidth / 2),
    box(x - 1.29, x + 1.29, level(mid), level(cap), -1.37, 1.37),
  ];
});
const upperBottom = upperFeet.flatMap(([x, ground]) => {
  if (x === lowerStart) return [[x - .06, ground - seating], [x, intermediateElevation - .12]];
  if (x === lowerEnd) return [[x, intermediateElevation - .12], [x + .06, ground - seating]];
  return [[x, x > lowerStart && x < lowerEnd ? intermediateElevation - .12 : ground - seating]];
});
const upper = groundArcade(upperBottom, elevationOrigin - .10, structureDepth);
const upperHoles = Array.from({length: 25}, (_, i) => {
  const x = firstUpperArchStation + spacing * i;
  return archVoid(x, upperSpring, x > lowerStart && x < lowerEnd ? intermediateElevation - .30 : 29);
});
const cornice = box(lowerStart, lowerEnd, level(intermediateElevation - .34),
  level(intermediateElevation), -1.31, 1.31);
const sill = box(0, length, -.56, -.08, -rimWidth / 2, rimWidth / 2);
const northWall = box(0, length, -.18, level(parapetElevation), -rimWidth / 2, -conduitWidth / 2);
const southWall = box(0, length, -.18, level(parapetElevation), conduitWidth / 2, rimWidth / 2);
const stonework = Manifold.union([
  Manifold.difference([Manifold.union([lower, ...steppedFeet]), ...lowerHoles]),
  Manifold.difference([upper, ...upperHoles]),
  cornice, sill, northWall, southWall,
]);
const floor = box(0, length, -.16, 0, -conduitWidth / 2, conduitWidth / 2);
function positioned(solid) {
  assert.equal(solid.status(), 'NoError');
  assert.equal(solid.decompose().length, 1);
  return solid.translate([-length / 2, 0, 0]).rotate(0, -bearing, 0).getMesh();
}

// Keep the closed arcade and its parapets at the front of the index buffer.
// The stand-alone sill completes the channel. Relleu Obert builds its own floor.
const upperMesh = positioned(stonework), floorMesh = positioned(floor);
const positions = Float32Array.from([...upperMesh.vertProperties, ...floorMesh.vertProperties]);
const indices = Uint16Array.from([
  ...upperMesh.triVerts,
  ...floorMesh.triVerts.map(i => i + upperMesh.vertProperties.length / 3),
]);
const {glb, min, max, vertices, triangles} = printIndexedGlb(positions, indices, attribution, [.93, .31, -.36]);
const [lon, lat] = anchor;
const lonScale = 111320 * Math.cos(lat * Math.PI / 180);
function geographic(station, offset, elevation) {
  const s = station - length / 2;
  const [east, south] = direction;
  return [
    +(lon + (east * s - south * offset) / lonScale).toFixed(9),
    +(lat - (south * s + east * offset) / 111320).toFixed(9),
    elevation,
  ];
}

const halfExtent = footingWidth / 2 + .12;
const extent = [[0, -halfExtent], [0, halfExtent], [length, halfExtent], [length, -halfExtent]];
const outline = [...extent, extent[0]].map(([x, z]) => geographic(x, z).slice(0, 2));
const longitudes = outline.map(point => point[0]), latitudes = outline.map(point => point[1]);
const bbox = [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)];
const stations = [0, length];
const indexCount = upperMesh.triVerts.length;
const entry = {
  type: 'Feature', id, bbox,
  geometry: {type: 'Polygon', coordinates: [outline]},
  properties: {
    kind: 'bridge', geometryType: 'road', name: 'Aqüeducte de les Ferreres',
    place: 'Tarragona, Spain', city: 'Tarragona', country: 'Spain',
    aliases: ['Pont del Diable', 'Ferreres Aqueduct', 'Acueducto de les Ferreres', 'Pont de les Ferreres'],
    revision: 'r1', byteLength: glb.length, anchor, mesh: `${modelPath}print.glb`,
    thumbnail: `${modelPath}thumbnail.webp`, height: +(max[1] - min[1]).toFixed(3),
    attribution, license: 'CC-BY-4.0', spatialDataLicense: 'CC-BY-4.0; ODbL-1.0', sources,
    bridge: {
      anchorElevation: elevationOrigin, verticalDatum: survey.orthometricDatum,
      ref: 'Les Ferreres', roadClass: 'path', sourceFeatureIds: survey.sourceFeatureIds,
      width: conduitWidth, depth: .35, length,
      // The masonry already includes its surveyed pier row. Only the two end landings
      // can use the standard bridge builder's optional supports.
      spans: [4, length - 8, 4],
      axis: stations.map(x => geographic(x, 0, elevationOrigin)),
      deckRows: stations.map(x => [-conduitWidth / 2, conduitWidth / 2].map(z => geographic(x, z, elevationOrigin))),
      pylonIndexCount: indexCount, upperIndexCount: indexCount, stayDiameter: .45,
      pierSection: {along: 1.3, across: 1.0}, maxPierAdjustment: .2,
    },
  },
};
await writeFile(new URL('print.glb', folder), glb);
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(entry, null, 2) + '\n');
console.log(JSON.stringify({bytes: glb.length, vertices, triangles, indexCount, min, max}));
