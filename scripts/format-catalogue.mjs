import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';

const path = new URL('../catalog.geojson', import.meta.url);
const catalogue = JSON.parse(await readFile(path, 'utf8'));
// Coordinates stay readable on one line while feature objects keep their layout.
// JSON strings cannot contain literal newlines, so this only matches real arrays.
const number = '-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?';
const numericArray = new RegExp(`\\[\\n\\s*(${number}(?:,\\n\\s*${number})*)\\n\\s*\\]`, 'gi');
let formatted = JSON.stringify(catalogue, null, 2).replace(numericArray,
  (_, values) => `[${values.split(',').map(value => value.trim()).join(', ')}]`) + '\n';
const compactThreshold = 512 * 1024;
const maxBytes = 2 * 1024 * 1024;
let compactFeatures = false;
if (Buffer.byteLength(formatted) >= compactThreshold) {
  // Keep dates and collection metadata readable while removing indentation
  // from large feature geometries. This changes whitespace only, not schema.
  const shell = JSON.stringify({...catalogue, features: []}, null, 2);
  const rows = catalogue.features.map(feature => '    ' + JSON.stringify(feature)).join(',\n');
  formatted = shell.replace('"features": []', () => `"features": [\n${rows}\n  ]`) + '\n';
  compactFeatures = true;
}
assert.deepEqual(JSON.parse(formatted), catalogue, 'Formatting must preserve every catalogue value');
assert(Buffer.byteLength(formatted) < maxBytes, 'Catalogue exceeds the Relleu Obert index limit even with compact features');
await writeFile(path, formatted);
console.log(`Formatted ${catalogue.features.length} features in ${Buffer.byteLength(formatted)} bytes${compactFeatures ? ' (compact feature rows)' : ''}.`);
