import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../models/golden-gate-bridge/r1/', import.meta.url);
const plan = JSON.parse(await readFile(new URL('profile.json', directory), 'utf8'));
const id = 'golden-gate-bridge';
const mesh = `models/${id}/r1/print.glb`;
const attribution = 'Open Place Models contributors (reconstruction). Golden Gate Bridge District engineering dimensions, NOAA Office for Coastal Management LiDAR, and © OpenStreetMap contributors (ODbL 1.0) for geographic alignment.';
const sources = [
  'https://www.goldengate.org/bridge/history-research/statistics-data/design-construction-stats/',
  'https://www.goldengate.org/assets/1/25/2025-0626-bocomm-no8-seismicpresentation.pdf',
  'https://www.usni.org/magazines/proceedings/1935/april/golden-gate-and-san-francisco-bay-bridges',
  'https://www.goldengate.org/exhibits/fort-point-arch/',
  'https://www.fisheries.noaa.gov/inport/item/49640/full-list',
  'https://tidesandcurrents.noaa.gov/datums.html?id=9414290',
  'https://www.openstreetmap.org/relation/451971',
];

const [start, end] = plan.limits;
const [sideSpan, mainSpan] = plan.suspensionSpans;
const half = mainSpan / 2;
const suspended = half + sideSpan;
const [[forwardEast, forwardSouth], [acrossEast, acrossSouth]] = plan.stationAxes;
const [longitude, latitude] = plan.anchor;
const longitudeScale = 111320 * Math.cos(latitude * Math.PI / 180);
const [quadratic, linear, anchorElevation] = plan.suspensionRoadFit;

function interpolate(rows, station) {
  const upper = rows.findIndex(([s]) => s >= station);
  if (upper < 0) return rows.at(-1)[1];
  if (upper === 0) return rows[0][1];
  const [a, first] = rows[upper - 1];
  const [b, second] = rows[upper];
  return first + (second - first) * (station - a) / (b - a);
}

const alignment = station => Math.abs(station) <= suspended ? 0 : interpolate(plan.roadAlignment, station);
const road = station => Math.abs(station) <= suspended
  ? anchorElevation + station * (linear + quadratic * station)
  : interpolate(plan.approachProfile, station);
const cableAcross = 13.716;

function local(station, across, elevation) {
  const position = alignment(station) + across;
  return [station * forwardEast + position * acrossEast, elevation - anchorElevation,
    station * forwardSouth + position * acrossSouth];
}

function geographic([east, up, south]) {
  return [longitude + east / longitudeScale, latitude - south / 111320, anchorElevation + up];
}

const positions = [];
const indices = [];
let shellCount = 0;

function sweep(sections) {
  const sides = sections[0].length;
  const vertices = sections.flat();
  const faces = [];
  const last = (sections.length - 1) * sides;
  for (let row = 0; row < last; row += sides) {
    for (let side = 0; side < sides; side++) {
      const a = row + side;
      const b = row + (side + 1) % sides;
      faces.push(a, b, b + sides, a, b + sides, a + sides);
    }
  }
  for (let i = 1; i < sides - 1; i++) faces.push(0, i + 1, i, last, last + i, last + i + 1);
  const offset = positions.length / 3;
  const floatVertices = vertices.map(point => point.map(Math.fround));
  let volume = 0;
  for (let i = 0; i < faces.length; i += 3) {
    const [[x, y, z], [u, v, w], [p, q, r]] = faces.slice(i, i + 3).map(index => floatVertices[index]);
    const area = Math.hypot((v - y) * (r - z) - (w - z) * (q - y), (w - z) * (p - x) - (u - x) * (r - z), (u - x) * (q - y) - (v - y) * (p - x));
    assert(area > 1e-7, 'Non-degenerate face');
    volume += (x * (v * r - w * q) + y * (w * p - u * r) + z * (u * q - v * p)) / 6;
  }
  assert(Math.abs(volume) > 1e-6, 'Positive structural volume after orientation');
  shellCount++;
  for (const point of floatVertices) positions.push(...point);
  for (let i = 0; i < faces.length; i += 3) {
    indices.push(offset + faces[i], offset + faces[i + (volume > 0 ? 1 : 2)], offset + faces[i + (volume > 0 ? 2 : 1)]);
  }
}

function rectangularPier(station, across, sections) {
  sweep(sections.map(([elevation, along, width]) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) =>
    local(station + x * along / 2, across + z * width / 2, elevation))));
}

function box(station, across, bottom, top, along, width) {
  rectangularPier(station, across, [[bottom, along, width], [top, along, width]]);
}

function cableRing(station, across, elevation, radius, slope) {
  const length = Math.hypot(1, slope);
  return Array.from({ length: 8 }, (_, index) => {
    const angle = index * Math.PI / 4;
    const up = radius * Math.sin(angle) / length;
    return local(station - up * slope, across + radius * Math.cos(angle), elevation + up);
  });
}

function strut(station, startAcross, startZ, endAcross, endZ, along, width) {
  const dx = endAcross - startAcross;
  const dy = endZ - startZ;
  const length = Math.hypot(dx, dy);
  const rx = -dy * width / (2 * length);
  const ry = dx * width / (2 * length);
  const ring = (across, y) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([alongSide, widthSide]) =>
    local(station + alongSide * along / 2, across + rx * widthSide, y + ry * widthSide));
  sweep([ring(startAcross, startZ), ring(endAcross, endZ)]);
}

const towerSections = [
  [13.04, 16.45, 9.95], [18.25, 16.45, 9.95], [21.15, 14.08, 8.20],
  [72.8, 14.08, 8.20], [75.03, 12.25, 7.65], [119.5, 12.05, 7.65],
  [122.0, 10.10, 7.4], [158.35, 10.10, 7.4], [161.9, 9.80, 6.95],
  [190.0, 9.65, 6.95], [193.75, 8.12, 6.55], [222.0, 8.12, 6.55],
  [226.1, 7.5, 6.55], [228.4, 7.2, 6.28], [plan.towerTopElevation, 4.6, 4.75],
];

for (const station of [-half, half]) {
  rectangularPier(station, 0, [[-5.4, 22.3, 44.5], [4.8, 22.3, 44.5], [13.42, 20.3, 42.2]]);
  for (const side of [-1, 1]) rectangularPier(station, side * cableAcross, towerSections);
  for (const [bottom, top, along] of [
    [21.05, 26.18, 7.8], [44.38, 52.08, 7.7], [70.89, 73.52, 7.7],
    [110.31, 119.45, 7.2], [149.93, 159.11, 7.0],
    [184.71, 191.35, 6.9], [214.91, 221.59, 6.6],
  ]) box(station, 0, bottom, top, along, 28.9);
  for (const [bottom, top] of [[24, 48], [48, 72]]) {
    strut(station, -12.5, bottom, 12.5, top, 5.4, 5.8);
    strut(station, 12.5, bottom, -12.5, top, 5.4, 5.8);
  }
}

function cable(station) {
  if (Math.abs(station) <= half) {
    return plan.towerCableElevation - plan.sag * (1 - (station / half) ** 2);
  }
  const edge = Math.sign(station) * suspended;
  const t = (suspended - Math.abs(station)) / sideSpan;
  const seat = road(edge) + 1.45;
  return seat + (plan.towerCableElevation - seat) * (0.78 * t + 0.22 * t * t);
}

function sectionStations(a, b, count) {
  return Array.from({ length: count + 1 }, (_, index) => a + (b - a) * index / count);
}

const cableStations = [
  ...sectionStations(-suspended, -half, 14),
  ...sectionStations(-half, half, 52).slice(1),
  ...sectionStations(half, suspended, 14).slice(1),
];
for (const side of [-1, 1]) {
  sweep(cableStations.map((station, index) => {
    const a = cableStations[Math.max(0, index - 1)];
    const b = cableStations[Math.min(cableStations.length - 1, index + 1)];
    return cableRing(station, side * cableAcross, cable(station), plan.mainCableDiameter / 2, (cable(b) - cable(a)) / (b - a));
  }));
}

// Side-span anchor pylons and the Fort Point arch remain in the required
// mesh block so the clearance can be retained when the approach is cropped.
for (const [station, bottom, along, across] of [
  [-1097.5, 8.0, 21.5, 15.8], [-984, -0.5, 20.6, 15.0],
  [984.6, 2.4, 18.4, 15.0], [1083.9, 47.1, 18.5, 20.5],
]) {
  for (const side of [-1, 1]) {
    rectangularPier(station, side * across, [
      [bottom, along, 9.1], [road(station) - 1.1, along * .83, 8.4],
      [road(station) + 2.2, along * .65, 7.5],
    ]);
  }
}
rectangularPier(1032, 0, [[43, 88, 37], [road(1032) - 1.2, 87, 34]]);
const { centre: archCentre, span: archSpan, spring, crown } = plan.fortPointArch;
const archElevation = station => crown - (crown - spring) * ((station - archCentre) / (archSpan / 2)) ** 2;
for (const side of [-1, 1]) {
  const across = side * 12.8;
  sweep(sectionStations(archCentre - archSpan / 2, archCentre + archSpan / 2, 16).map(station =>
    cableRing(station, across, archElevation(station), 4.15, -2 * (crown - spring) * (station - archCentre) / (archSpan / 2) ** 2)));
  for (const station of [archCentre - 36, archCentre - 18, archCentre, archCentre + 18, archCentre + 36]) {
    box(station, across, archElevation(station) - 0.4, road(station) - 0.6, 6.7, 6.7);
  }
}

// The nominal rope spacing is 50 ft. A sparse reinforced subset remains
// available at small map scales, while the full rhythm appears at 1:8,000.
const fineHangers = [];
const panel = 15.24;
for (const [a, b] of [[-suspended, -half], [-half, half], [half, suspended]]) {
  for (let i = 1; a + panel * i < b - 5; i++) {
    const station = a + panel * i;
    const lower = road(station) - 1.15;
    const top = cable(station) + 0.35;
    if (top - lower < 5.0) continue;
    for (const side of [-1, 1]) {
      const across = side * cableAcross;
      if (i % 5 === 0) box(station, across, lower, top, plan.structuralHangerDiameter, plan.structuralHangerDiameter);
      else fineHangers.push([station, across, lower, top]);
    }
  }
}
const pylonIndexCount = indices.length;
for (const params of fineHangers) box(...params, plan.hangerDiameter, plan.hangerDiameter);
const upperIndexCount = indices.length;

const designStations = [
  ...plan.approachPiers.map(([s]) => s).filter(s => Math.abs(Math.abs(s) - suspended) > 3),
  -suspended, -half, half, suspended,
].filter(s => s > start && s < end).sort((a, b) => a - b);
const fixedStations = [...designStations, start, end, 0];
const sampledStations = [
  ...sectionStations(start, end, 131),
  ...plan.roadAlignment.map(([s]) => s),
  ...plan.approachProfile.map(([s]) => s),
].filter(s => s > start && s < end && fixedStations.every(fixed => Math.abs(s - fixed) > 0.025));
const rowStations = [...fixedStations, ...sampledStations].sort((a, b) => a - b)
  .filter((s, i, rows) => !i || s - rows[i - 1] > 0.01);
const width = plan.deckWidth;
const depth = plan.deckDepth;
const axis = rowStations.map(s => geographic(local(s, 0, road(s))));
const deckRows = rowStations.map(s => {
  const a = Math.max(start, s - 1);
  const b = Math.min(end, s + 1);
  const slope = (alignment(b) - alignment(a)) / (b - a);
  const projectedWidth = width / Math.hypot(1, slope);
  return [1, -1].map(side => {
    const across = side * projectedWidth / 2;
    const along = s - across * slope;
    const cross = alignment(s) + across;
    return geographic([along * forwardEast + cross * acrossEast, road(s) - anchorElevation,
      along * forwardSouth + cross * acrossSouth]);
  });
});
sweep(rowStations.map((s, i) => {
  const [a, b] = deckRows[i];
  const vertex = ([lon, lat, y], drop) => [(lon - longitude) * longitudeScale, y - anchorElevation - drop, (latitude - lat) * 111320];
  return [vertex(a, 0), vertex(b, 0), vertex(b, depth), vertex(a, depth)];
}));
for (const [station, bottom] of plan.approachPiers) {
  if ([-1097.5, -984, 985, 1084].includes(station)) continue;
  rectangularPier(station, 0, [[bottom, 10.0, 17.5], [road(station) - 6.9, 7.8, 16]]);
}

const lengths = [0];
for (let i = 1; i < rowStations.length; i++) {
  const a = rowStations[i - 1];
  const b = rowStations[i];
  lengths.push(lengths.at(-1) + Math.hypot(b - a, alignment(b) - alignment(a)));
}
const cumulative = [0, ...designStations.map(station => lengths[rowStations.indexOf(station)]), lengths.at(-1)];
const spans = cumulative.slice(1).map((distance, i) => distance - cumulative[i]);
assert(spans.every(s => s > 0) && rowStations.length <= 256, 'Valid bridge stations');

const bounds = [0, 1, 2].map(axis => {
  const values = positions.filter((_, index) => index % 3 === axis);
  return [Math.min(...values), Math.max(...values)];
});
const outline = [...deckRows.map(row => row[0].slice(0, 2)), ...deckRows.slice().reverse().map(row => row[1].slice(0, 2))];
outline.push(outline[0]);
const boundary = [...outline, ...bounds[0].flatMap(east => bounds[2].map(south => geographic([east, 0, south]).slice(0, 2)))];
const bbox = [0, 1].map(axis => Math.min(...boundary.map(point => point[axis])))
  .concat([0, 1].map(axis => Math.max(...boundary.map(point => point[axis]))));

assert(positions.length / 3 < 65536);
const vertexBytes = Buffer.from(Float32Array.from(positions).buffer);
const indexBytes = Buffer.from(Uint16Array.from(indices).buffer);
const binary = Buffer.concat([vertexBytes, indexBytes]);
const gltf = {
  asset: { version: '2.0', generator: 'Open Place Models', copyright: attribution, extras: { license: 'CC-BY-4.0', sources } },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  buffers: [{ byteLength: binary.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: vertexBytes.length, target: 34962 },
    { buffer: 0, byteOffset: vertexBytes.length, byteLength: indexBytes.length, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3',
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
await writeFile(new URL('print.glb', directory), glb);

const entry = {
  type: 'Feature', id, bbox, geometry: { type: 'Polygon', coordinates: [outline] },
  properties: {
    kind: 'bridge', geometryType: 'road', name: 'Golden Gate Bridge', place: 'San Francisco, United States',
    city: 'San Francisco', country: 'United States',
    aliases: ['Golden Gate', 'Pont del Golden Gate', 'Puente Golden Gate', 'Pont du Golden Gate'],
    revision: 'r1', byteLength: glb.length, anchor: plan.anchor, mesh,
    height: bounds[1][1] - bounds[1][0], attribution, license: 'CC-BY-4.0', spatialDataLicense: plan.osm.license,
    sources, bridge: {
      anchorElevation, verticalDatum: 'NAVD88 (EPSG:5703, NOAA GEOID18)', ref: 'US 101', roadClass: 'motorway',
      sourceFeatureIds: plan.sourceFeatureIds, supportFeatureIds: plan.supportFeatureIds,
      width, depth, length: lengths.at(-1), spans, axis, deckRows, pylonIndexCount, upperIndexCount,
      stayDiameter: plan.hangerDiameter, pierSection: { along: 8, across: 15 }, maxPierAdjustment: 12,
    },
  },
};
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(entry, null, 2) + '\n');
console.log(JSON.stringify({
  bytes: glb.length, triangles: indices.length / 3, vertices: positions.length / 3,
  rowCount: rowStations.length, length: lengths.at(-1), spans, bounds, shells: shellCount,
  pylonIndexCount, upperIndexCount,
}));
