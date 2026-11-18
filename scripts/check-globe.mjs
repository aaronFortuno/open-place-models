import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {clusterPoints,geographicPoint} from '../site/globe-points.js';
import {readCatalog} from '../site/catalog.js';

const near=(actual,expected)=>actual.forEach((value,index)=>assert(Math.abs(value-expected[index])<1e-10));
near(geographicPoint([0,0]),[1,0,0]);
near(geographicPoint([90,0]),[0,0,-1]);
near(geographicPoint([-90,0]),[0,0,1]);
near(geographicPoint([180,0]),[-1,0,0]);
near(geographicPoint([45,90],2),[0,2,0]);

const point=(id,x,y)=>({entry:{id},x,y});
assert.deepEqual(clusterPoints([]),[]);
const groups=clusterPoints([point('a',0,0),point('b',12,0),point('c',60,0),point('d',62,5)]);
assert.deepEqual(groups.map(group=>group.id),['a|b','c|d']);
assert.equal(groups[0].x,6);
assert.equal(clusterPoints([point('a',0,0),point('b',20,0),point('c',40,0)]).length,1);
const dense=Array.from({length:200},(_,index)=>point(`place-${index}`,100+index%5,120+index%7));
const [cluster]=clusterPoints(dense);
assert.equal(cluster.entries.length,200);
assert.equal(new Set(cluster.entries.map(entry=>entry.id)).size,200);
assert.equal(clusterPoints(dense.slice().reverse())[0].id,cluster.id);

const catalog=readCatalog(JSON.parse(await readFile(new URL('../catalog.geojson',import.meta.url),'utf8')));
for(const entry of catalog){
  const [lon,lat]=entry.anchor;
  assert(lon>=-180&&lon<=180&&lat>=-90&&lat<=90);
  assert(Math.abs(Math.hypot(...geographicPoint(entry.anchor))-1)<1e-10);
}
console.log(`Globe checks passed: ${catalog.length} catalogue anchors; geographic axes, dense clusters and preserved membership.`);
