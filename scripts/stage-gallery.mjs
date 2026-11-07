import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import {prepareGalleryCatalogue,root} from './gallery-catalogue.mjs';

const {assets,modelCount,index}=await prepareGalleryCatalogue();
await copyFile(new URL('LICENSE',root),new URL('dist/LICENSE',root));
await copyFile(new URL('node_modules/three/LICENSE',root),new URL('dist/THREE-LICENSE',root));
for(const path of assets){
  const source=new URL(path,root);
  const destination=new URL('dist/'+path,root);
  await mkdir(new URL('.',destination),{recursive:true});
  await copyFile(source,destination);
}
await writeFile(new URL('dist/catalog.geojson',root),index);
console.log(`Staged ${modelCount} catalogue models.`);
