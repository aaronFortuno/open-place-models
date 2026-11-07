import {copyFile,mkdir,readFile} from 'node:fs/promises';
import {readCatalog} from '../site/catalog.js';

const root=new URL('../',import.meta.url);
const index=new URL('catalog.geojson',root);
const entries=readCatalog(JSON.parse(await readFile(index,'utf8')));
await copyFile(index,new URL('dist/catalog.geojson',root));
await copyFile(new URL('LICENSE',root),new URL('dist/LICENSE',root));
await copyFile(new URL('node_modules/three/LICENSE',root),new URL('dist/THREE-LICENSE',root));
for(const path of new Set(entries.map(entry=>entry.mesh))){
  const destination=new URL('dist/'+path,root);
  await mkdir(new URL('.',destination),{recursive:true});
  await copyFile(new URL(path,root),destination);
}
console.log(`Staged ${entries.length} catalogue models.`);
