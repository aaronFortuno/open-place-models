function assetPath(path,extension){
  const parts=typeof path==='string'?path.split('/'):[];
  if(parts.length<2||parts[0]!=='models'||!extension.test(parts.at(-1))||
    !parts.every(part=>/^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(part))){
    throw new Error('The catalogue contains an invalid asset path.');
  }
  return path;
}

export const geometryLabels=Object.freeze({
  building:'Building',monument:'Monument',road:'Road or route',terrain:'Terrain',
});

const meshPath=path=>assetPath(path,/\.glb$/);
const validBytes=value=>value===undefined||Number.isSafeInteger(value)&&value>0;
const validSources=value=>value===undefined||Array.isArray(value)&&value.every(source=>typeof source==='string');
const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const locationText=(value,fallback)=>typeof value==='string'?value.trim():fallback;

function readVariants(variants=[],assetDates){
  if(!Array.isArray(variants))throw new Error('The catalogue contains invalid model resolutions.');
  const ids=new Set(['default']);
  return variants.map(variant=>{
    if(!variant||typeof variant.id!=='string'||!/^[a-z0-9][a-z0-9-]*$/.test(variant.id)||ids.has(variant.id)||
      typeof variant.label!=='string'||!variant.label.trim()||typeof variant.revision!=='string'||!variant.revision||
      !validBytes(variant.byteLength)||!validSources(variant.sources)||
      variant.maxScaleDenominator!==undefined&&(!Number.isSafeInteger(variant.maxScaleDenominator)||variant.maxScaleDenominator<1)){
      throw new Error('The catalogue contains an invalid model resolution.');
    }
    ids.add(variant.id);
    return {...variant,mesh:meshPath(variant.mesh),meshAddedAt:assetDates[variant.mesh]};
  });
}

export function readCatalog(data,{includeComponents=false}={}){
  if(data?.type!=='FeatureCollection'||data.schemaVersion!==1||!Array.isArray(data.features)){
    throw new Error('Unsupported catalogue format.');
  }
  const assetDates=data.assetAddedAt??{};
  if(typeof assetDates!=='object'||Array.isArray(assetDates)||!Object.values(assetDates).every(validDate)){
    throw new Error('The catalogue contains an invalid asset date.');
  }
  const ids=new Set();
  const entries=data.features.map(({id,properties})=>{
    if(typeof id!=='string'||!id||ids.has(id)||typeof properties?.name!=='string'||
      !Array.isArray(properties.anchor)||properties.anchor.length!==2||!properties.anchor.every(Number.isFinite)||
      properties.aliases!==undefined&&(!Array.isArray(properties.aliases)||!properties.aliases.every(alias=>typeof alias==='string'))||
      !validBytes(properties.byteLength)||!validSources(properties.sources)||
      properties.addedAt!==undefined&&!validDate(properties.addedAt)){
      throw new Error('The catalogue contains an invalid model entry.');
    }
    ids.add(id);
    const place=typeof properties.place==='string'?properties.place.split(',').map(part=>part.trim()):[];
    const landform=properties.kind==='landform'?{...properties.landform,data:assetPath(properties.landform?.data,/\.json$/)}:undefined;
    const railway=properties.kind==='railway'?{...properties.railway,data:assetPath(properties.railway?.data,/\.json$/)}:undefined;
    return {...properties,id,mesh:meshPath(properties.mesh),landform,railway,meshAddedAt:assetDates[properties.mesh],
      thumbnail:properties.thumbnail===undefined?undefined:assetPath(properties.thumbnail,/\.(png|webp|jpe?g)$/),
      geometryType:Object.hasOwn(geometryLabels,properties.geometryType)?properties.geometryType:'building',
      country:locationText(properties.country,place.length>1?place.at(-1):''),
      city:locationText(properties.city,place[0]??''),
      variants:readVariants(properties.variants,assetDates)};
  });
  const groups=new Set(entries.filter(entry=>entry.kind==='group'&&entry.galleryParent===undefined).map(entry=>entry.id));
  for(const entry of entries){
    if(entry.galleryParent!==undefined&&(entry.kind==='group'||!groups.has(entry.galleryParent))){
      throw new Error('The catalogue contains a component without a gallery group.');
    }
  }
  if(includeComponents)return entries;
  const latestByModel=new Map();
  for(const entry of entries){
    const key=entry.galleryParent??entry.id;
    const dates=[entry.meshAddedAt??entry.addedAt,...entry.variants.map(variant=>variant.meshAddedAt)];
    for(const date of dates){
      if(date&&(date>(latestByModel.get(key)??'')))latestByModel.set(key,date);
    }
  }
  return entries.filter(entry=>entry.galleryParent===undefined).sort((a,b)=>
    (latestByModel.get(b.id)??'').localeCompare(latestByModel.get(a.id)??''));
}

export function searchKey(text){
  return text.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
}
