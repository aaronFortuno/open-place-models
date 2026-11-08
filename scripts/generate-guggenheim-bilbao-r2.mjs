import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { openSolids, printGlb } from './monument-solids.mjs';

const directory = new URL('../models/guggenheim-bilbao/r2/', import.meta.url);
const survey = JSON.parse(await readFile(new URL('../models/guggenheim-bilbao/r1/survey-layout.json', import.meta.url), 'utf8'));
const { projected: [x0, n0], gridEastNorthToEnu: [[ee, en], [ne, nn]] } = survey.anchor;
const { mesh, Manifold } = await openSolids();
const attribution = 'Open Place Models contributors (architectural reconstruction); plan © OpenStreetMap contributors (ODbL 1.0).';
const previewDirection = [1, 0.75, 1.4];

function position(x, n, y) {
  const east = x - x0;
  const north = n - n0;
  return [ee * east + ne * north, y, -en * east - nn * north];
}

function solidFrom(vertices, faces) {
  let volume = 0;
  for (const [a, b, c] of faces) {
    const pa = vertices[a], pb = vertices[b], pc = vertices[c];
    volume += (pa[0] * (pb[1] * pc[2] - pb[2] * pc[1]) +
      pa[1] * (pb[2] * pc[0] - pb[0] * pc[2]) +
      pa[2] * (pb[0] * pc[1] - pb[1] * pc[0])) / 6;
  }
  if (volume < 0) faces = faces.map(([a, b, c]) => [a, c, b]);
  const solid = mesh(vertices.flat(), faces.flat());
  assert.equal(solid.status(), 'NoError');
  assert(solid.volume() > 0);
  return solid;
}

const power = (value, exponent) => Math.sign(value) * Math.abs(value) ** exponent;

function loft(rings, segments = 32) {
  const vertices = [], faces = [];
  rings = smoothRows(rings, 2);
  for (const ring of rings) {
    const { x, n, y, rx, rn, rotation = 0, exponent = 2, tiltX = 0, tiltN = 0 } = ring;
    const angle = rotation * Math.PI / 180;
    for (let i = 0; i < segments; i++) {
      const theta = i * 2 * Math.PI / segments;
      const c = Math.cos(theta), s = Math.sin(theta);
      const u = rx * power(c, 2 / exponent), v = rn * power(s, 2 / exponent);
      vertices.push(position(x + u * Math.cos(angle) - v * Math.sin(angle),
        n + u * Math.sin(angle) + v * Math.cos(angle), y + tiltX * c + tiltN * s));
    }
  }
  const bottom = vertices.length;
  const first = rings[0], last = rings.at(-1);
  vertices.push(position(first.x, first.n, first.y), position(last.x, last.n, last.y));
  for (let row = 0; row < rings.length - 1; row++) {
    for (let i = 0; i < segments; i++) {
      const a = row * segments + i, b = row * segments + (i + 1) % segments;
      faces.push([a, a + segments, b], [b, a + segments, b + segments]);
    }
  }
  const top = (rings.length - 1) * segments;
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    faces.push([bottom, i, next], [bottom + 1, top + next, top + i]);
  }
  return solidFrom(vertices, faces);
}

function smoothRows(rows, steps = 3) {
  const result = [];
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))].filter(key => key !== 'y');
  const defaults = { exponent: 2, rotation: 0, tiltX: 0, tiltN: 0 };
  for (let row = 0; row < rows.length - 1; row++) {
    const p0 = rows[Math.max(0, row - 1)], p1 = rows[row];
    const p2 = rows[row + 1], p3 = rows[Math.min(rows.length - 1, row + 2)];
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      const values = { y: p1.y + (p2.y - p1.y) * t };
      for (const key of keys) {
        const b = p1[key] ?? defaults[key] ?? 0, c = p2[key] ?? defaults[key] ?? 0;
        const a = p0[key] ?? b, d = p3[key] ?? c;
        values[key] = 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t +
          (-a + 3 * b - 3 * c + d) * t * t * t);
      }
      result.push(values);
    }
  }
  result.push(rows.at(-1));
  return result;
}

function sweep(stations, segments = 24) {
  const vertices = [], faces = [];
  for (const station of stations) {
    const { x, n, base = 0, top, width, exponent = 3.2 } = station;
    for (let i = 0; i < segments; i++) {
      const theta = i * 2 * Math.PI / segments;
      const across = width / 2 * power(Math.cos(theta), 2 / exponent);
      const y = (base + top) / 2 + (top - base) / 2 * power(Math.sin(theta), 2 / exponent);
      vertices.push(position(x, n + across, y));
    }
  }
  const start = vertices.length;
  const first = stations[0], last = stations.at(-1);
  vertices.push(position(first.x, first.n, ((first.base ?? 0) + first.top) / 2),
    position(last.x, last.n, ((last.base ?? 0) + last.top) / 2));
  for (let row = 0; row < stations.length - 1; row++) {
    for (let i = 0; i < segments; i++) {
      const a = row * segments + i, b = row * segments + (i + 1) % segments;
      faces.push([a, b, a + segments], [b, b + segments, a + segments]);
    }
  }
  const end = (stations.length - 1) * segments;
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    faces.push([start, next, i], [start + 1, end + i, end + next]);
  }
  return solidFrom(vertices, faces);
}

function block(x, n, width, depth, height, rotation = 0, base = 0) {
  const angle = rotation * Math.PI / 180;
  const vertices = [];
  for (const y of [base, height]) {
    for (const [u, v] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
      const a = u * width / 2, b = v * depth / 2;
      vertices.push(position(x + a * Math.cos(angle) - b * Math.sin(angle),
        n + a * Math.sin(angle) + b * Math.cos(angle), y));
    }
  }
  return solidFrom(vertices, [[0,2,1],[0,3,2],[4,5,6],[4,6,7],
    [0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]]);
}

const parts = [
  block(340, 607, 22, 40, 35),
  block(336, 573, 16, 32, 24),
  block(330, 552, 18, 18, 24),
  block(327, 622, 17, 21, 27),
  block(374, 604, 22, 32, 34),
  block(409, 619, 29, 21, 22),
  block(350, 638, 24, 35, 25),
  block(350, 650, 18, 18, 27),
  block(476, 645, 14, 17, 27),
  block(308, 680, 12, 35, 25),
  loft([
    {x:351,n:670,y:0,rx:11,rn:8,exponent:2.6},
    {x:350,n:667,y:16,rx:15,rn:10,exponent:2.6,rotation:-6},
    {x:351,n:669,y:30,rx:17,rn:10,exponent:2.6,rotation:5},
    {x:353,n:671,y:43,rx:18,rn:9,exponent:2.5,rotation:10,tiltX:3},
    {x:354,n:672,y:50,rx:14,rn:6,exponent:2.6,rotation:14,tiltX:5,tiltN:2},
    {x:352,n:673,y:53,rx:11,rn:3.5,exponent:2.8,rotation:18,tiltX:3,tiltN:1},
  ]),
  loft([
    {x:340,n:670,y:0,rx:7,rn:6,exponent:2.4},
    {x:337,n:669,y:20,rx:10,rn:8,exponent:2.6,rotation:-12},
    {x:334,n:670,y:36,rx:12,rn:7,exponent:2.5,rotation:-18},
    {x:331,n:672,y:47,rx:11,rn:4,exponent:2.8,rotation:-24,tiltX:4,tiltN:-3},
  ]),
  loft([
    {x:363,n:670,y:0,rx:8,rn:7,exponent:2.5},
    {x:367,n:670,y:21,rx:12,rn:9,exponent:2.5,rotation:10},
    {x:371,n:672,y:38,rx:13,rn:7,exponent:2.4,rotation:17,tiltN:2},
    {x:374,n:673,y:48,rx:11,rn:4,exponent:2.8,rotation:22,tiltX:4,tiltN:2},
  ]),
  loft([
    {x:351,n:662,y:18,rx:8,rn:6,exponent:2.5},
    {x:349,n:658,y:32,rx:11,rn:7,exponent:2.5,rotation:12},
    {x:344,n:657,y:45,rx:14,rn:5,exponent:2.8,rotation:20,tiltX:3,tiltN:-2},
    {x:341,n:660,y:50.019,rx:10,rn:3,exponent:3,rotation:25,tiltX:4,tiltN:-2},
  ]),
  loft([
    {x:355,n:682,y:0,rx:10,rn:6,exponent:2.5},
    {x:357,n:681,y:20,rx:13,rn:8,exponent:2.5,rotation:-10},
    {x:361,n:681,y:34,rx:13,rn:6,exponent:2.4,rotation:-18,tiltX:-2},
    {x:362,n:680,y:42,rx:10,rn:3,exponent:2.8,rotation:-22,tiltX:-3,tiltN:1},
  ]),
  loft([
    {x:386,n:621,y:0,rx:24,rn:17,exponent:2.6},
    {x:387,n:621,y:17,rx:25,rn:18,exponent:2.6},
    {x:390,n:623,y:26,rx:24,rn:16,exponent:2.5,rotation:6},
    {x:391,n:624,y:29,rx:22,rn:14,exponent:2.6,rotation:9,tiltX:3,tiltN:1},
  ]),
  block(389, 617, 30, 20, 33),
  loft([
    {x:309,n:638,y:0,rx:20,rn:17,exponent:2.6},
    {x:307,n:639,y:17,rx:22,rn:17,exponent:2.6},
    {x:305,n:642,y:27,rx:21,rn:14,exponent:2.5,rotation:-8,tiltX:2},
    {x:304,n:643,y:29,rx:19,rn:12,exponent:2.6,rotation:-10,tiltX:3},
  ]),
  block(306, 632, 25, 15, 31),
  sweep(smoothRows([
    {x:284,n:658,y:0,top:17,width:13,exponent:4},
    {x:294,n:661,y:0,top:27,width:19,exponent:4},
    {x:307,n:665,y:0,top:34,width:22,exponent:4},
    {x:321,n:666,y:0,top:30,width:23,exponent:4},
    {x:335,n:662,y:0,top:25,width:21,exponent:4},
    {x:347,n:661,y:0,top:25,width:17,exponent:4},
  ], 3)),
  sweep([
    {x:365,n:647,top:19,width:21,exponent:5},
    {x:388,n:648,top:20,width:23,exponent:5},
    {x:412,n:648,top:20,width:22,exponent:5},
    {x:438,n:647,top:18,width:21,exponent:5},
    {x:463,n:645,top:17,width:20,exponent:5},
    {x:486,n:643,top:16,width:18,exponent:5},
    {x:503,n:640,top:14,width:12,exponent:5},
  ]),
  sweep(smoothRows([
    {x:370,n:656,y:0,base:14,top:23,width:5,exponent:4},
    {x:389,n:660,y:0,base:14,top:27,width:6,exponent:4},
    {x:408,n:661,y:0,base:14,top:25,width:6,exponent:4},
    {x:426,n:658,y:0,base:13,top:23,width:5,exponent:4},
    {x:440,n:655,y:0,base:12,top:20,width:4,exponent:4},
  ], 3)),
  loft([
    {x:471,n:653,y:0,rx:8,rn:8,exponent:2.8},
    {x:472,n:654,y:18,rx:10,rn:9,exponent:2.8},
    {x:470,n:654,y:28,rx:9,rn:8,exponent:2.6,tiltX:1},
    {x:469,n:654,y:31,rx:7,rn:6,tiltX:2},
  ]),
  sweep(smoothRows([
    {x:340,n:657,y:0,base:26,top:29,width:8,exponent:5},
    {x:346,n:655,y:0,base:27,top:31,width:11,exponent:5},
    {x:354,n:654,y:0,base:27,top:30,width:13,exponent:5},
    {x:363,n:655,y:0,base:26,top:28,width:11,exponent:5},
    {x:368,n:657,y:0,base:26,top:27,width:7,exponent:5},
  ], 3)),
  loft([
    {x:353,n:654,y:0,rx:1.8,rn:1.8},
    {x:353,n:654,y:28,rx:1.5,rn:1.5},
  ], 16),
  loft([
    {x:301,n:690,y:0,rx:4,rn:7,exponent:2.8},
    {x:300,n:690,y:22,rx:4.5,rn:7,exponent:2.8},
    {x:299,n:691,y:32,rx:3.5,rn:6,exponent:2.5,tiltX:1.5},
  ]),
];

const combined = Manifold.union(parts);
for (const part of parts) part.delete();
assert.equal(combined.status(), 'NoError');
const components = combined.decompose();
assert.equal(components.length, 1, 'All wings, sails and towers must form one connected solid');
for (const component of components) component.delete();
const { glb, min, max, vertices, triangles } = printGlb(combined, attribution, previewDirection);
assert(Math.abs(min[1]) < 0.001);
const exported = combined.getMesh();
let exportedVolume = 0;
for (let i = 0; i < exported.triVerts.length; i += 3) {
  const a = exported.triVerts[i] * 3, b = exported.triVerts[i + 1] * 3, c = exported.triVerts[i + 2] * 3;
  const p = exported.vertProperties;
  exportedVolume += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) +
    p[a + 1] * (p[b + 2] * p[c] - p[b] * p[c + 2]) +
    p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
}
assert(exportedVolume > 0);
const volume = combined.volume();
assert(Math.abs(exportedVolume - volume) < 0.01);
combined.delete();
await mkdir(directory, { recursive: true });
await writeFile(new URL('print.glb', directory), glb);

if (process.argv[2]) {
  const feature = {
    type: 'Feature', id: 'guggenheim-bilbao', bbox: [-2.9348812,43.2677884,-2.9321743,43.26909788],
    geometry: survey.outline.geometry,
    properties: {
      name: 'Museo Guggenheim Bilbao',
      aliases: ['Guggenheim Bilbao Museum', 'Bilboko Guggenheim Museoa', 'Museu Guggenheim Bilbao', 'Guggenheim Bilbao'],
      geometryType: 'building', place: 'Bilbao, Spain', city: 'Bilbao', country: 'Spain',
      revision: 'r2', anchor: survey.anchor.wgs84, anchorElevation: survey.anchor.elevation,
      height: Math.round(max[1] * 1000) / 1000,
      mesh: 'models/guggenheim-bilbao/r2/print.glb', byteLength: glb.length,
      thumbnail: 'models/guggenheim-bilbao/r2/thumbnail.webp', license: 'CC-BY-4.0', spatialDataLicense: 'ODbL-1.0',
      attribution,
      sources: [
        'https://www.guggenheim-bilbao.eus/el-edificio/el-exterior',
        'https://www.inexhibit.com/mymuseum/guggenheim-museum-bilbao/',
        'https://www.openstreetmap.org/way/118499485',
      ],
      replacement: { featureIds: ['osm-way-118499485'], families: ['osm-way-118499485'] },
    },
  };
  await writeFile(process.argv[2], JSON.stringify(feature, null, 2) + '\n');
}
console.log(JSON.stringify({ bytes: glb.length, vertices, triangles, min, max, volume,
  sha256: createHash('sha256').update(glb).digest('hex') }));
