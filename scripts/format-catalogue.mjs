import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';

const path = new URL('../catalog.geojson', import.meta.url);
const catalogue = JSON.parse(await readFile(path, 'utf8'));
// Coordinates stay readable on one line while feature objects keep their layout.
// JSON strings cannot contain literal newlines, so this only matches real arrays.
const number = '-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?';
const numericArray = new RegExp(`\\[\\n\\s*(${number}(?:,\\n\\s*${number})*)\\n\\s*\\]`, 'gi');
const formatted = JSON.stringify(catalogue, null, 2).replace(numericArray,
  (_, values) => `[${values.split(',').map(value => value.trim()).join(', ')}]`) + '\n';
assert.deepEqual(JSON.parse(formatted), catalogue, 'Formatting must preserve every catalogue value');
assert(Buffer.byteLength(formatted) < 512 * 1024, 'Catalogue exceeds the Relleu Obert index limit');
await writeFile(path, formatted);
console.log(`Formatted ${catalogue.features.length} features in ${Buffer.byteLength(formatted)} bytes.`);
