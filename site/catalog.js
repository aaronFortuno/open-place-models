export function meshPath(path){
  const parts=typeof path==='string'?path.split('/'):[];
  if(parts.length<2||parts[0]!=='models'||!parts.at(-1).endsWith('.glb')||
    !parts.every(part=>/^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(part))){
    throw new Error('The catalogue contains an invalid mesh path.');
  }
  return path;
}

export function readCatalog(data){
  if(data?.type!=='FeatureCollection'||data.schemaVersion!==1||!Array.isArray(data.features)){
    throw new Error('Unsupported catalogue format.');
  }
  const ids=new Set();
  return data.features.map(({id,properties})=>{
    if(typeof id!=='string'||!id||ids.has(id)||typeof properties?.name!=='string'||
      !Array.isArray(properties.anchor)||properties.anchor.length!==2||!properties.anchor.every(Number.isFinite)||
      properties.aliases!==undefined&&(!Array.isArray(properties.aliases)||!properties.aliases.every(alias=>typeof alias==='string'))||
      properties.sources!==undefined&&!Array.isArray(properties.sources)){
      throw new Error('The catalogue contains an invalid model entry.');
    }
    ids.add(id);
    return {...properties,id,mesh:meshPath(properties.mesh)};
  });
}

export function searchKey(text){
  return text.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
}
