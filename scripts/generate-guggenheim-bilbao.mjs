import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { openSolids, printGlb } from './monument-solids.mjs';

const id = 'guggenheim-bilbao';
const directory = new URL('../models/guggenheim-bilbao/r1/', import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const { mesh } = await openSolids();
const { projected: [x0, n0], gridEastNorthToEnu: [[ee, en], [ne, nn]], elevation } = survey.anchor;
const { points, triangles, edges, middleWall } = survey.mesh;
const attribution = 'Open Place Models contributors (survey-based reconstruction); Eusko Jaurlaritza / Gobierno Vasco. geoEuskadi. (elevation data); plan © OpenStreetMap contributors (ODbL 1.0).';
const previewDirection = [-0.47, 0.49, -1];

function position(x, n, z) {
  const east = x - x0;
  const north = n - n0;
  return [ee * east + ne * north, z - elevation, -en * east - nn * north];
}

const count = points.length;
const middleIndex = new Map(middleWall.map(([index], i) => [index, 2 * count + i]));
function wallFaces(lowerA, lowerB, upperA, upperB) {
  return [lowerA, lowerB, upperB, lowerA, upperB, upperA];
}
const solid = mesh([
  ...points.flatMap(([x, n, top]) => position(x, n, top)),
  ...points.flatMap(([x, n, , bottom]) => position(x, n, bottom)),
  ...middleWall.flatMap(([, x, n, height]) => position(x, n, height)),
], [
  ...triangles.flat(),
  ...triangles.flatMap(([a, b, c]) => [a + count, c + count, b + count]),
  ...edges.flatMap(([a, b]) => [
    ...wallFaces(a + count, b + count, middleIndex.get(a), middleIndex.get(b)),
    ...wallFaces(middleIndex.get(a), middleIndex.get(b), a, b),
  ]),
]);
assert.equal(solid.status(), 'NoError');
const reduced = solid.simplify(0.64);
solid.delete();
const baseShift = reduced.boundingBox().min[1];
const registered = reduced.translate([0, -baseShift, 0]);
reduced.delete();
const anchorElevation = Math.round((elevation + baseShift) * 1000) / 1000;
const components = registered.decompose();
assert.equal(components.length, 1);
for (const component of components) component.delete();

const volume = registered.volume();
const { glb, min, max, vertices, triangles: faceCount } = printGlb(registered, attribution, previewDirection);
registered.delete();
assert(Math.abs(min[1]) < 0.001);
const height = Math.round((survey.surface.apex[2] - anchorElevation) * 1000) / 1000;
assert(Math.abs(max[1] - height) < 0.001, 'The measured atrium summit survives simplification');
const meshPath = 'models/guggenheim-bilbao/r1/print.glb';
await writeFile(new URL('print.glb', directory), glb);

if (process.argv[2]) {
  const { geometry, way } = survey.outline;
  const [outer] = geometry.coordinates;
  const longitude = outer.map(([lon]) => lon);
  const latitude = outer.map(([, lat]) => lat);
  const osm = 'osm-way-' + way;
  const feature = {
    type: 'Feature',
    id,
    bbox: [Math.min(...longitude), Math.min(...latitude), Math.max(...longitude), Math.max(...latitude)],
    geometry,
    properties: {
      name: 'Museo Guggenheim Bilbao',
      aliases: ['Guggenheim Bilbao Museum', 'Bilboko Guggenheim Museoa', 'Museu Guggenheim Bilbao', 'Guggenheim Bilbao'],
      geometryType: 'building',
      place: 'Bilbao, Spain',
      city: 'Bilbao',
      country: 'Spain',
      revision: 'r1',
      anchor: survey.anchor.wgs84,
      anchorElevation,
      height,
      mesh: meshPath,
      byteLength: glb.length,
      thumbnail: meshPath.replace('print.glb', 'thumbnail.webp'),
      license: 'CC-BY-4.0',
      spatialDataLicense: 'ODbL-1.0',
      attribution,
      sources: [
        'https://www.geo.euskadi.eus/modelo-digital-elevaciones-1-metro-del-pais-vasco/webgeo00-dataset/es/',
        'https://www.euskadi.eus/servicio-de-informacion-raster-de-pendientes-orientaciones-y-elevaciones-de-la-capv/web01-s2hhome/es/',
        'https://www.guggenheim-bilbao.eus/el-edificio/el-exterior',
        'https://www.guggenheim-bilbao.eus/apoyo-empresarial/eventos-corporativos/atrio',
        'https://www.openstreetmap.org/way/118499485',
      ],
      replacement: { featureIds: [osm], families: [osm] },
    },
  };
  await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
}
console.log(JSON.stringify({ bytes: glb.length, vertices, triangles: faceCount, min, max, volume, anchorElevation, sha256: createHash('sha256').update(glb).digest('hex') }));
