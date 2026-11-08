import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = new URL('../models/great-pyramid-giza/r2/', import.meta.url);
const measurements = JSON.parse(await readFile(new URL('companion-measurements.json', directory), 'utf8'));
const metresPerFoot = 0.3048;
const fromFeet = ([feet, inches]) => (feet + inches / 12) * metresPerFoot;

function baseFrame({ anchor, corners }) {
  const rad = Math.PI / 180;
  const latitude = anchor[1] * rad;
  const eccentricitySquared = 6.6943799901413165e-3;
  const d = 1 - eccentricitySquared * Math.sin(latitude) ** 2;
  const eastScale = rad * 6378137 * Math.cos(latitude) / Math.sqrt(d);
  const northScale = rad * 6378137 * (1 - eccentricitySquared) / d ** 1.5;
  const xy = corners.map(([lon, lat]) => [(lon - anchor[0]) * eastScale, (anchor[1] - lat) * northScale]);
  const side = xy.reduce((sum, [x, z], i) => {
    const [a, b] = xy[(i + 1) % 4];
    return sum + Math.hypot(a - x, b - z);
  }, 0) / 4;
  return { xy, side };
}

const interpolate = (a, b, f) => a + (b - a) * f;
function perimeterPoints(frame, samples, y, fraction) {
  const [nw, ne, se, sw] = frame.xy;
  return samples.map(([u, v], i) => {
    const h = Array.isArray(y) ? y[i] : y;
    const r = fraction(h, i);
    const project = axis => r * interpolate(interpolate(nw[axis], ne[axis], u), interpolate(sw[axis], se[axis], u), v);
    return [project(0), h, project(1)];
  });
}

function ringMesh() {
  const points = [];
  const indices = [];
  let stride;
  return {
    ring(row) {
      stride ??= row.length;
      assert.equal(row.length, stride);
      const previous = points.length - stride;
      points.push(...row);
      if (previous < 0) return;
      for (let i = 0; i < stride; i++) {
        const a = previous + i;
        const b = previous + (i + 1) % stride;
        indices.push(a, a + stride, b + stride, a, b + stride, b);
      }
    },
    finish() {
      const last = points.length - stride;
      const baseCenter = points.length;
      const topCenter = baseCenter + 1;
      points.push([0, 0, 0], [0, points[last][1], 0]);
      for (let i = 0; i < stride; i++) {
        const j = (i + 1) % stride;
        indices.push(baseCenter, i, j, topCenter, last + j, last + i);
      }
      return { points: points.map(point => point.map(Math.fround)), indices };
    },
  };
}

const casingSamples = [
  [0, 0], [0.32, 0], [0.68, 0], [1, 0], [1, 0.32], [1, 0.68],
  [1, 1], [0.68, 1], [0.32, 1], [0, 1], [0, 0.68], [0, 0.32],
];

function khafre(frame, plan, height, terraceRatio) {
  const mesh = ringMesh();
  const casingSlope = Math.tan(plan.originalFaceSlopeDegrees * Math.PI / 180);
  const nominal = level => 1 - 2 * level / (frame.side * casingSlope);
  const finish = level => interpolate(nominal(92), terraceRatio, (level - 92) / (height - 92));
  const missingCasing = (frame.side - fromFeet(plan.presentBaseFeetAndInches)) / frame.side;
  const core = level => nominal(level) - missingCasing * (1 - 0.48 * level / height);
  const ring = (level, fraction) => mesh.ring(perimeterPoints(frame, casingSamples, level, fraction));

  ring(0, () => 1);
  ring(0.95, () => 1);
  let lower = 0.95;
  const bandEnds = [...plan.lowerBandsMetres];
  const groupedCourses = [3.6, 3.25, 3.85];
  for (let next = 15.1, i = 0; next < 84.8; next += groupedCourses[i++ % groupedCourses.length]) {
    bandEnds.push(next);
  }
  bandEnds.push(85.4);
  for (const upper of bandEnds) {
    ring(lower, core);
    ring(upper, () => core(interpolate(lower, upper, 0.16)));
    lower = upper;
  }
  ring(85.4, core);
  const bottom = plan.casingBottomMetresClockwiseFromNW;
  ring(bottom.map(level => level - 1.05), (level, i) => Math.min(core(level), finish(bottom[i]) - 1.25 / frame.side));
  ring(bottom, finish);
  ring(height, () => terraceRatio);
  return mesh.finish();
}

function northScar(sections, height) {
  const lower = sections[0];
  if (height <= lower[0] || height >= sections.at(-1)[0]) return [0, 3.4, 0];
  const next = sections.findIndex(section => section[0] >= height);
  const a = sections[next - 1];
  const b = sections[next];
  const progress = (height - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((value, i) => interpolate(value, b[i + 1], progress));
}

function menkaure(frame, plan, height, terraceRatio) {
  const mesh = ringMesh();
  const graniteHeight = plan.graniteCourse16Inches * 0.0254;
  const historicSlope = Math.tan(plan.originalFaceSlopeDegrees * Math.PI / 180);
  const lowerFraction = 1 - 2 * graniteHeight / (frame.side * historicSlope);
  const envelope = level => level <= graniteHeight
    ? interpolate(1, lowerFraction, level / graniteHeight)
    : interpolate(lowerFraction, terraceRatio, (level - graniteHeight) / (height - graniteHeight));
  function ring(level, fraction) {
    const [offset, mouth, depth] = northScar(plan.scarSectionsMetres, level);
    const width = frame.side * fraction;
    const opening = Math.min(mouth, width * 0.42);
    const along = multiplier => 0.5 + (offset + opening * multiplier) / width;
    const samples = [[0, 0], [along(-0.52), 0], [along(-0.26), depth / width],
      [along(0.16), 0.87 * depth / width], [along(0.48), 0], [1, 0], [1, 1], [0, 1]];
    mesh.ring(perimeterPoints(frame, samples, level, () => fraction));
  }
  ring(0, 1);
  let lower = 0;
  for (const upper of [...plan.bandsMetres, height]) {
    if (lower > 0) ring(lower, envelope(lower));
    ring(upper, upper === height ? terraceRatio : envelope(interpolate(lower, upper, 0.18)));
    lower = upper;
  }
  return mesh.finish();
}

function audit(points, faces) {
  assert.equal(new Set(points.map(point => point.join(','))).size, points.length);
  const links = points.map(() => new Map());
  let volume = 0;
  for (let i = 0; i < faces.length; i += 3) {
    const [a, b, c] = faces.slice(i, i + 3);
    const [[x, y, z], [u, v, w], [p, q, r]] = [points[a], points[b], points[c]];
    assert(Math.hypot((v - y) * (r - z) - (w - z) * (q - y), (w - z) * (p - x) - (u - x) * (r - z),
      (u - x) * (q - y) - (v - y) * (p - x)) > 1e-8, 'Positive triangle area');
    volume += (x * (v * r - w * q) + y * (w * p - u * r) + z * (u * q - v * p)) / 6;
    for (const [from, to, next] of [[a, b, c], [b, c, a], [c, a, b]]) {
      assert(!links[from].has(to), 'Consistent edge orientation');
      links[from].set(to, next);
    }
  }
  for (const link of links) {
    const start = link.keys().next().value;
    let cursor = start;
    const count = link.size;
    for (let i = 0; i < count; i++) {
      assert(link.has(cursor), 'One incident face ring per vertex');
      const previous = cursor;
      cursor = link.get(cursor);
      link.delete(previous);
    }
    assert.equal(cursor, start);
  }
  assert(volume > 0);
  return volume;
}

function encodeGlb(points, indices, attribution, sources) {
  const bounds = [0, 1, 2].map(axis => [Math.min(...points.map(p => p[axis])), Math.max(...points.map(p => p[axis]))]);
  assert(points.length < 65536);
  const positionBytes = points.length * 12;
  const binary = Buffer.alloc(positionBytes + indices.length * 2);
  points.forEach((point, i) => point.forEach((value, axis) => binary.writeFloatLE(value, i * 12 + axis * 4)));
  indices.forEach((value, i) => binary.writeUInt16LE(value, positionBytes + i * 2));
  const gltf = {
    asset: { version: '2.0', generator: 'Open Place Models', copyright: attribution, extras: { license: 'CC-BY-4.0', sources } },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionBytes, target: 34962 },
      { buffer: 0, byteOffset: positionBytes, byteLength: indices.length * 2, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: points.length, type: 'VEC3',
        min: bounds.map(pair => pair[0]), max: bounds.map(pair => pair[1]) },
      { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
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
  return { glb, bounds };
}

const designs = [
  ['khafre', 'Pyramid of Khafre', ['Piràmide de Khefren', 'Pyramid of Chephren', 'Pyramide de Khéphren', 'هرم خفرع'], khafre],
  ['menkaure', 'Pyramid of Menkaure', ['Piràmide de Micerí', 'Pyramid of Mycerinus', 'Pyramide de Mykérinos', 'هرم منقرع'], menkaure],
];
for (const [key, name, aliases, build] of designs) {
  const plan = measurements[key];
  const frame = baseFrame(plan);
  const height = Math.round(fromFeet(plan.heightFeetAndInches) * 1000) / 1000;
  const terraceRatio = plan.terraceWidthFeet * metresPerFoot / frame.side;
  const { points, indices } = build(frame, plan, height, terraceRatio);
  const volume = audit(points, indices);
  const sources = [measurements.survey, measurements.perring, measurements.petrie, ...plan.sources,
    `https://www.openstreetmap.org/way/${plan.osm.id}`];
  const attribution = 'Open Place Models contributors (reconstruction), based on surveys by J. S. Perring, W. M. F. Petrie and AERA/Glen Dash Foundation. Reference footprint © OpenStreetMap contributors (ODbL 1.0).';
  const { glb, bounds } = encodeGlb(points, indices, attribution, sources);
  assert(bounds[1][0] === 0 && Math.abs(bounds[1][1] - height) < 0.001);
  await writeFile(new URL(`${key}.glb`, directory), glb);

  const ring = [0, 3, 2, 1, 0].map(index => plan.corners[index]);
  const axes = [0, 1].map(axis => ring.map(point => point[axis]));
  const bbox = [...axes.map(axis => Math.min(...axis)), ...axes.map(axis => Math.max(...axis))];
  const feature = {
    type: 'Feature', id: `pyramid-of-${key}`, bbox,
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: {
      name, place: 'Giza, Egypt', geometryType: 'monument', city: 'Giza', country: 'Egypt', aliases,
      revision: 'r2', anchor: plan.anchor, height, mesh: `models/great-pyramid-giza/r2/${key}.glb`,
      byteLength: glb.length, terrainBaseElevation: plan.terrainBaseElevation, license: 'CC-BY-4.0', attribution,
      replacement: { featureIds: [`osm-way-${plan.osm.id}`] }, sources,
    },
  };
  if (process.argv[2]) {
    await writeFile(join(process.argv[2], `${key}-feature.json`), JSON.stringify(feature, null, 2) + '\n');
  }
  console.log(JSON.stringify({ key, bytes: glb.length, vertices: points.length, triangles: indices.length / 3,
    bounds, height, meanSide: frame.side, volume }));
}
