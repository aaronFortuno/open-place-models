import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ManifoldModule from 'manifold-3d';

const directory = new URL('../models/mont-saint-michel/r1/', import.meta.url);
const survey = JSON.parse(await readFile(new URL('survey-layout.json', directory), 'utf8'));
const api = await ManifoldModule();
api.setup();

const id = 'mont-saint-michel';
const attribution = 'Open Place Models contributors (reconstruction); IGN MNS Correl, RGE ALTI and geodetic control (Open Licence 2.0); plan © OpenStreetMap contributors (ODbL 1.0).';
const sources = [
  'https://www.data.gouv.fr/datasets/mns-correl',
  'https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_RGE-ALTI',
  survey.spire.geodeticRecord,
  'https://www.abbaye-mont-saint-michel.fr/decouvrir/s-orienter-dans-le-monument',
  'https://www.abbaye-mont-saint-michel.fr/decouvrir/l-eglise-abbatiale',
  'https://www.montsaintmichel.gouv.fr/le-mont-et-sa-baie/un-bien-unesco',
  'https://www.openstreetmap.org/way/322437078',
  'https://www.openstreetmap.org/way/322436982',
];

function solid(vertices, faces) {
  const shape = new api.Manifold(new api.Mesh({
    numProp: 3,
    vertProperties: Float32Array.from(vertices.flat()),
    triVerts: Uint32Array.from(faces),
  }));
  assert.equal(shape.status(), 'NoError');
  return shape;
}

function envelope(vertices, triangles, boundary) {
  const count = vertices.length;
  const top = vertices.map(([x, y, upper]) => [x, y, upper]);
  const bottom = vertices.map(([x, y, , lower]) => [x, y, lower]);
  const faces = [
    ...triangles.flat(),
    ...triangles.flatMap(([a, b, c]) => [a + count, c + count, b + count]),
    ...boundary.flatMap(([a, b]) => [a + count, b + count, b, a + count, b, a]),
  ];
  return solid([...top, ...bottom], faces);
}

const { anchorElevation } = survey;
const body = envelope(survey.body.vertices, survey.body.triangles, survey.body.boundaryEdges);
const reducedBody = body.simplify(0.62);
body.delete();
const roofs = survey.roofOverlays.map(roof => envelope(roof.vertices, roof.triangles, roof.boundaryEdges));
const roofedBody = api.Manifold.union([reducedBody, ...roofs]);
for (const part of [reducedBody, ...roofs]) part.delete();
const courtyardProfile = api.CrossSection.ofPolygons([survey.courtCut], 'NonZero');
const courtyardSolid = courtyardProfile.extrude(100);
const courtyard = courtyardSolid.translate([0, 0, survey.surface.court - anchorElevation]);
courtyardProfile.delete();
courtyardSolid.delete();
const abbey = roofedBody.subtract(courtyard);
roofedBody.delete();
courtyard.delete();

// Angles use the east/north plane until the final GLB transform.
const turn = survey.spire.bearingFromEastDegrees * Math.PI / 180;
function loft(levels) {
  const points = levels.flatMap(([elevation, width, depth, bevel]) => {
    const w = width / 2;
    const d = depth / 2;
    const c = Math.min(w, d) * bevel;
    const corners = [[-w + c, -d], [w - c, -d], [w, -d + c], [w, d - c],
      [w - c, d], [-w + c, d], [-w, d - c], [-w, -d + c]];
    return corners.map(([x, y]) => [
      x * Math.cos(turn) - y * Math.sin(turn), x * Math.sin(turn) + y * Math.cos(turn),
      elevation - anchorElevation,
    ]);
  });
  const count = 8;
  const end = points.length - count;
  const faces = [];
  for (let i = 1; i < count - 1; i++) faces.push(0, i + 1, i, end, end + i, end + i + 1);
  for (let offset = 0; offset < end; offset += count) {
    for (let i = 0; i < count; i++) {
      const a = offset + i;
      const b = offset + (i + 1) % count;
      faces.push(a, b, b + count, a, b + count, a + count);
    }
  }
  return solid(points, faces);
}

const lowerSections = survey.spire.lowerSections.map(([z, width, depth]) => [z, width, depth, z > 119 ? 0.55 : 0.09]);
const ball = survey.spire.geodeticSphereElevation;
const top = survey.spire.apexElevation;
const tower = loft([
  [95, 14.45, 13.0, 0.08],
  ...lowerSections,
  [141, 2.35, 2.25, 0.62],
  [151.9, 1.48, 1.43, 0.65],
  [ball - 0.55, 1.55, 1.52, 0.62],
  [ball, 1.8, 1.78, 0.62],
  [ball + 0.48, 1.48, 1.47, 0.62],
  [ball + 0.95, 1.55, 1.42, 0.36],
  // A symbolic connected profile for the figure and wings at print scale.
  [155.55, 2.3, 1.36, 0.32],
  [156.50, 2.65, 1.16, 0.56],
  [top, 1.65, 0.97, 0.56],
]);
const combined = api.Manifold.union([abbey, tower]);
abbey.delete();
tower.delete();
assert.equal(combined.status(), 'NoError');
const reduced = combined.simplify(0.105);
combined.delete();
const result = reduced.setTolerance(0.001);
reduced.delete();
const components = result.decompose();
assert.equal(components.length, 1, 'One connected print solid');
for (const component of components) component.delete();
const volume = result.volume();
assert(volume > 0);
const mesh = result.getMesh();
result.delete();
assert.equal(mesh.mergeFromVert.length, 0);
const points = Array.from({ length: mesh.vertProperties.length / 3 }, (_, i) => {
  const [x, y, z] = mesh.vertProperties.subarray(3 * i, 3 * i + 3);
  return [x, z, -y];
});
const faces = mesh.triVerts;
assert(points.length < 65536);
const bounds = [0, 1, 2].map(axis => [Math.min(...points.map(point => point[axis])), Math.max(...points.map(point => point[axis]))]);
const height = Math.round((top - anchorElevation) * 1000) / 1000;
assert(Math.abs(bounds[1][0]) < 0.001 && Math.abs(bounds[1][1] - height) < 0.001);

const positionBytes = points.length * 12;
const binary = Buffer.alloc(positionBytes + faces.length * 2);
points.forEach((point, i) => point.forEach((value, axis) => binary.writeFloatLE(value, i * 12 + axis * 4)));
faces.forEach((value, i) => binary.writeUInt16LE(value, positionBytes + i * 2));
const gltf = {
  asset: { version: '2.0', generator: 'Open Place Models', copyright: attribution, extras: { license: 'CC-BY-4.0', sources } },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  buffers: [{ byteLength: binary.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: positionBytes, target: 34962 },
    { buffer: 0, byteOffset: positionBytes, byteLength: faces.length * 2, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: points.length, type: 'VEC3',
      min: bounds.map(pair => pair[0]), max: bounds.map(pair => pair[1]) },
    { bufferView: 1, componentType: 5123, count: faces.length, type: 'SCALAR' },
  ],
};
const json = Buffer.from(JSON.stringify(gltf));
const jsonSize = Math.ceil(json.length / 4) * 4;
const binarySize = Math.ceil(binary.length / 4) * 4;
const glb = Buffer.alloc(28 + jsonSize + binarySize);
glb.write('glTF');
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(jsonSize, 12);
glb.write('JSON', 16);
glb.fill(0x20, 20, 20 + jsonSize);
json.copy(glb, 20);
glb.writeUInt32LE(binarySize, 20 + jsonSize);
glb.write('BIN\0', 24 + jsonSize);
binary.copy(glb, 28 + jsonSize);
await writeFile(new URL('print.glb', directory), glb);

const rings = survey.footprint;
const columns = [0, 1].map(axis => rings[0].map(point => point[axis]));
const bbox = [...columns.map(column => Math.min(...column)), ...columns.map(column => Math.max(...column))];
const coveredWays = survey.osm.ways.filter(way => way.id !== 322436961).map(way => `osm-way-${way.id}`);
// OpenFreeMap carries a simplified outline of La Merveille alongside the cloister.
const coveredRelations = ['osm-relation-4491639', 'osm-relation-4491648', '44916390', '44916480'];
const entry = {
  type: 'Feature', id, bbox, geometry: { type: 'Polygon', coordinates: rings },
  properties: {
    name: 'Mont-Saint-Michel Abbey', place: 'Le Mont-Saint-Michel, France', geometryType: 'building',
    country: 'France', city: 'Le Mont-Saint-Michel',
    aliases: ['Mont-Saint-Michel', 'Abbaye du Mont-Saint-Michel', 'Abadia del Mont-Saint-Michel',
      'Abadía del Monte Saint-Michel', 'Abati Menez-Mikael'],
    revision: 'r1', anchor: survey.anchor, anchorElevation, height, mesh: `models/${id}/r1/print.glb`,
    byteLength: glb.length, license: 'CC-BY-4.0', attribution, spatialDataLicense: survey.osm.license,
    replacement: { featureIds: [...coveredWays, ...coveredRelations] },
    sources,
  },
};
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(entry, null, 2) + '\n');
console.log(JSON.stringify({ bytes: glb.length, triangles: faces.length / 3, vertices: points.length, bounds, volume }));
