import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';

const sourceHash='1cfcbf1dd1990aece92f50f0b9d5e8c69e394bd718dbede26a2ef1e83fc8ddcf';
const [source]=process.argv.slice(2);
assert(source,'Provide the maintainer’s torre-collserola-r2.glb.');
const glb=await readFile(source);
assert.equal(createHash('sha256').update(glb).digest('hex'),sourceHash);

// Preserve the platforms and the cable junction at 158 m. Correct the upper
// mast to 268 m above grade, leaving the original plan and face indices intact.
const jsonEnd=20+glb.readUInt32LE(12);
const header=JSON.parse(glb.toString('utf8',20,jsonEnd));
const positions=header.accessors[0];
const start=jsonEnd+8;
const transition=158, height=268, originalHeight=positions.max[1];
for(let i=0;i<positions.count;i++){
  const offset=start+i*12+4;
  const y=glb.readFloatLE(offset);
  if(y>transition)glb.writeFloatLE(transition+(y-transition)*(height-transition)/(originalHeight-transition),offset);
}
positions.max[1]=height;
const json=Buffer.from(JSON.stringify(header));
assert(json.length<=jsonEnd-20);
glb.fill(0x20,20,jsonEnd);
json.copy(glb,20);
await writeFile(new URL('print.glb',import.meta.url),glb);
