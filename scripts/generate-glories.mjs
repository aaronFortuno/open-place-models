import { readFileSync, writeFileSync } from 'node:fs';

const catalogue = JSON.parse(readFileSync(new URL('../catalog.geojson', import.meta.url), 'utf8'));
const tower = catalogue.features.find(feature => feature.id === 'torre-glories');
const { anchor: [lon, lat], height, mesh, attribution } = tower.properties;
const metresPerDegree = 111320;
const metresPerLongitude = metresPerDegree * Math.cos(lat * Math.PI / 180);
const footprint = tower.geometry.coordinates[0].slice(0, -1).map(([lng, phi]) => [
  (lng - lon) * metresPerLongitude,
  (lat - phi) * metresPerDegree
]);
const span = axis => Math.max(...footprint.map(point => point[axis])) -
  Math.min(...footprint.map(point => point[axis]));

// The engineering description puts the start of the inward taper at 76 m,
// and the roughly 32 × 28 m dome spring at 115 m.
const shoulder = 76;
const spring = 115;
const roofSpan = [32 / span(0), 28 / span(1)];
const domeLean = 0.23;
const profile = [[0, 1, 1], [shoulder, 1, 1]];
for (let step = 1; step <= 8; step++) {
  const t = step / 8;
  const factors = roofSpan.map(end => {
    // Cubic interpolation matches the vertical wall and the dome tangent.
    const endSlope = end * domeLean * (spring - shoulder) / (height - spring);
    return 1 - (1 - end) * (3 * t ** 2 - 2 * t ** 3) - endSlope * (t ** 3 - t ** 2);
  });
  profile.push([shoulder + t * (spring - shoulder), ...factors]);
}
for (let step = 1; step < 12; step++) {
  const angle = step * Math.PI / 24;
  const rise = Math.sin(angle);
  const taper = Math.cos(angle) * (1 - domeLean * rise);
  profile.push([spring + rise * (height - spring), ...roofSpan.map(factor => factor * taper)]);
}

const positions = [];
for (const [y, east, south] of profile) {
  for (const [x, z] of footprint) positions.push(x * east, y, z * south);
}
const sectors = footprint.length;
const tip = positions.length / 3;
const centre = tip + 1;
positions.push(0, height, 0, 0, 0, 0);
const indices = [];
const top = (profile.length - 1) * sectors;
for (let side = 0; side < sectors; side++) {
  const next = (side + 1) % sectors;
  indices.push(centre, next, side, top + side, top + next, tip);
  for (let layer = 0; layer < profile.length - 1; layer++) {
    const lower = layer * sectors;
    const a = lower + side;
    const b = lower + next;
    indices.push(a, b, a + sectors, b, b + sectors, a + sectors);
  }
}

const vertices = Float32Array.from(positions);
const binary = Buffer.alloc(vertices.length * 4 + indices.length * 2);
vertices.forEach((value, index) => binary.writeFloatLE(value, index * 4));
indices.forEach((value, index) => binary.writeUInt16LE(value, vertices.length * 4 + index * 2));
const limits = [0, 1, 2].map(axis => vertices.filter((_, index) => index % 3 === axis));
const gltf = {
  asset: { version: '2.0', generator: 'Open Place Models', copyright: attribution },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  buffers: [{ byteLength: binary.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: vertices.length * 4, target: 34962 },
    { buffer: 0, byteOffset: vertices.length * 4, byteLength: indices.length * 2, target: 34963 }
  ],
  accessors: [
    {
      bufferView: 0, componentType: 5126, count: vertices.length / 3, type: 'VEC3',
      min: limits.map(values => Math.min(...values)), max: limits.map(values => Math.max(...values))
    },
    { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' }
  ]
};

const json = Buffer.from(JSON.stringify(gltf));
const jsonSize = Math.ceil(json.length / 4) * 4;
const binSize = Math.ceil(binary.length / 4) * 4;
const glb = Buffer.alloc(28 + jsonSize + binSize);
glb.write('glTF');
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(jsonSize, 12);
glb.write('JSON', 16);
glb.fill(0x20, 20, 20 + jsonSize);
json.copy(glb, 20);
glb.writeUInt32LE(binSize, 20 + jsonSize);
glb.write('BIN\0', 24 + jsonSize);
binary.copy(glb, 28 + jsonSize);
writeFileSync(new URL('../' + mesh, import.meta.url), glb);
console.log(`${mesh}: ${vertices.length / 3} vertices, ${indices.length / 3} triangles, ${glb.length} bytes`);
