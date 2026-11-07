import {copyFile,mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {readCatalog} from '../site/catalog.js';

const root=new URL('../',import.meta.url);
const index=new URL('catalog.geojson',root);
const catalogue=JSON.parse(await readFile(index,'utf8'));
const entries=readCatalog(catalogue);
await copyFile(new URL('LICENSE',root),new URL('dist/LICENSE',root));
await copyFile(new URL('node_modules/three/LICENSE',root),new URL('dist/THREE-LICENSE',root));
const sizes=new Map();
const assets=entries.flatMap(entry=>[entry.mesh,entry.thumbnail,entry.landform?.data,
  ...entry.variants.map(variant=>variant.mesh),...(entry.terrainTiles?.tiles??[]).map(tile=>tile.data)].filter(Boolean));
for(const path of new Set(assets)){
  const source=new URL(path,root);
  const destination=new URL('dist/'+path,root);
  await mkdir(new URL('.',destination),{recursive:true});
  await copyFile(source,destination);
  sizes.set(path,(await stat(source)).size);
}
for(const {properties} of catalogue.features){
  for(const model of [properties,...(properties.variants??[])]){
    const size=sizes.get(model.mesh);
    if(model.byteLength!==undefined&&model.byteLength!==size)throw new Error(`File size differs for ${model.mesh}.`);
    model.byteLength=size;
  }
  for(const tile of properties.terrainTiles?.tiles??[]){
    if(tile.byteLength!==sizes.get(tile.data))throw new Error(`File size differs for ${tile.data}.`);
  }
}
await writeFile(new URL('dist/catalog.geojson',root),JSON.stringify(catalogue));
console.log(`Staged ${entries.length} catalogue models.`);
