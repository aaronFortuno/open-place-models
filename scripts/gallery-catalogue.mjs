import {readFile,stat} from 'node:fs/promises';
import {readCatalog} from '../site/catalog.js';

export const root=new URL('../',import.meta.url);

export async function prepareGalleryCatalogue(){
  const catalogue=JSON.parse(await readFile(new URL('catalog.geojson',root),'utf8'));
  const entries=readCatalog(catalogue,{includeComponents:true});
  const assets=[...new Set(entries.flatMap(entry=>[
    entry.mesh,entry.thumbnail,entry.landform?.data,...entry.variants.map(variant=>variant.mesh),
  ]).filter(Boolean))];
  const sizes=new Map(await Promise.all(assets.map(async path=>[path,(await stat(new URL(path,root))).size])));
  for(const {properties} of catalogue.features){
    for(const model of [properties,...(properties.variants??[])]){
      const size=sizes.get(model.mesh);
      if(model.byteLength!==undefined&&model.byteLength!==size)throw new Error(`File size differs for ${model.mesh}.`);
      model.byteLength=size;
    }
  }
  catalogue.assetByteLength=[...sizes.values()].reduce((total,size)=>total+size,0);
  return {assets,modelCount:entries.filter(entry=>entry.galleryParent===undefined).length,index:JSON.stringify(catalogue)};
}
