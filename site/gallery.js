import './gallery.css';
import {geometryLabels,readCatalog,searchKey} from './catalog.js';

const byId=id=>document.getElementById(id);
const indexURL=new URL('./catalog.geojson',document.baseURI);
const search=byId('model-search'),list=byId('model-list'),status=byId('catalog-status');
const filters=byId('model-filters'),geometry=byId('geometry-filter'),country=byId('country-filter'),city=byId('city-filter');
const clearFilters=byId('clear-filters'),variantSelect=byId('model-variant');
const previewStatus=byId('preview-status'),viewTools=byId('view-tools'),viewHelp=byId('view-help');
const retry=byId('reload-catalog'),number=new Intl.NumberFormat('en',{maximumFractionDigits:2});
const fileSize=new Intl.NumberFormat('en',{maximumFractionDigits:1});
let entries=[],selection,selectedVariant,viewRequest,view,requestId=0;

function link(href,label){
  const anchor=document.createElement('a');
  anchor.href=href;
  anchor.textContent=label;
  return anchor;
}

function setOptions(select,all,values){
  const previous=select.value;
  const unique=[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  select.replaceChildren(new Option(all,''),...unique.map(value=>new Option(value,value)));
  if(unique.includes(previous))select.value=previous;
}

function updateCities(){
  setOptions(city,'All cities',entries.filter(entry=>!country.value||entry.country===country.value).map(entry=>entry.city));
}

function modelCard(entry){
  const item=document.createElement('li');
  const button=document.createElement('button');
  button.type='button';
  button.dataset.model=entry.id;
  const thumb=document.createElement('span');
  thumb.className='model-thumb';
  thumb.setAttribute('aria-hidden','true');
  if(entry.thumbnail){
    const image=document.createElement('img');
    image.alt='';
    image.loading='lazy';
    image.decoding='async';
    image.addEventListener('error',()=>image.remove(),{once:true});
    image.src=new URL(entry.thumbnail,indexURL);
    thumb.append(image);
  }
  const name=document.createElement('span');
  name.className='model-card-name';
  name.textContent=entry.name;
  button.append(thumb,name);
  const location=entry.place||[entry.city,entry.country].filter(Boolean).join(', ');
  if(location){
    const place=document.createElement('small');
    place.textContent=location;
    button.append(place);
  }
  item.append(button);
  return item;
}

function renderList(){
  const query=searchKey(search.value.trim());
  const active=Boolean(search.value||geometry.value||country.value||city.value);
  const matching=entries.filter(entry=>
    (!geometry.value||entry.geometryType===geometry.value)&&
    (!country.value||entry.country===country.value)&&
    (!city.value||entry.city===city.value)&&
    (!query||searchKey([entry.name,entry.place,entry.city,entry.country,...(entry.aliases??[])].join(' ')).includes(query)));
  list.replaceChildren(...matching.map(modelCard));
  byId('model-count').textContent=active?`${matching.length} of ${entries.length}`:String(entries.length);
  clearFilters.disabled=!active;
  status.textContent=matching.length?'':entries.length?'No models match your search.':'The catalogue is empty.';
  updateCurrent();
}

function updateCurrent(){
  for(const button of list.querySelectorAll('button')){
    if(button.dataset.model===selection?.id)button.setAttribute('aria-current','true');
    else button.removeAttribute('aria-current');
  }
}

function licenseNode(id){
  return id&&/^[\w.-]+$/.test(id)
    ?link(`https://spdx.org/licenses/${id}.html`,id):document.createTextNode(id||'—');
}

function showDetails(entry,variant,meshURL){
  const model={...entry,...variant};
  byId('model-name').textContent=entry.name;
  const place=byId('model-place');
  place.textContent=entry.place||[entry.city,entry.country].filter(Boolean).join(', ');
  place.hidden=!place.textContent;
  const download=byId('download');
  download.href=meshURL;
  download.download=`${entry.id}-${model.revision}.glb`;
  const size=byId('model-size'),bytes=variant?variant.byteLength:entry.byteLength;
  size.textContent=bytes?`${fileSize.format(bytes/1000)} kB`:'—';
  size.title=bytes?`${bytes} bytes`:'';
  byId('model-height').textContent=Number.isFinite(entry.height)?`${number.format(entry.height)} m`:'—';
  byId('model-type').textContent=geometryLabels[entry.geometryType];
  byId('model-revision').textContent=model.revision??'—';
  byId('model-variants').hidden=!entry.variants.length;
  variantSelect.replaceChildren(new Option('Lightweight','default'),
    ...entry.variants.map(item=>new Option(item.label,item.id)));
  variantSelect.value=variant?.id??'default';
  const scale=byId('variant-scale');
  const scaleOptions=(variant?[variant]:entry.variants).filter(item=>item.maxScaleDenominator);
  scale.textContent=scaleOptions.map(item=>`${item.label} suggested at 1:${number.format(item.maxScaleDenominator)} or closer.`).join(' ');
  scale.hidden=!scale.textContent;
  const [lon,lat]=entry.anchor;
  const map=byId('model-map');
  map.href=`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
  map.textContent=`${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  byId('model-attribution').textContent=model.attribution??'';
  const licenses=byId('model-licenses');
  licenses.replaceChildren('Mesh ',licenseNode(model.license));
  if(model.spatialDataLicense)licenses.append(' · Spatial data ',licenseNode(model.spatialDataLicense));
  const sources=byId('model-sources');
  sources.replaceChildren();
  for(const source of model.sources??[]){
    if(typeof source!=='string'||!URL.canParse(source))continue;
    const url=new URL(source);
    if(url.protocol!=='https:'&&url.protocol!=='http:')continue;
    const item=document.createElement('li');
    item.append(link(url.href,url.hostname.replace(/^www\./,'')));
    sources.append(item);
  }
  byId('details-empty').hidden=true;
  byId('model-details').hidden=false;
}

async function showModel(entry,{variantId,updateURL=false}={}){
  if(!entry)return;
  const variant=entry.variants.find(item=>item.id===variantId);
  if(updateURL){
    const url=new URL(location.href);
    url.searchParams.set('model',entry.id);
    if(variant)url.searchParams.set('variant',variant.id);
    else url.searchParams.delete('variant');
    if(url.href!==location.href)history.pushState(null,'',url);
  }
  if(entry===selection&&variant===selectedVariant)return;
  selection=entry;
  selectedVariant=variant;
  updateCurrent();
  const meshURL=new URL(variant?.mesh??entry.mesh,indexURL);
  showDetails(entry,variant,meshURL);
  const id=++requestId;
  previewStatus.textContent='Loading 3D model…';
  previewStatus.hidden=false;
  viewTools.hidden=viewHelp.hidden=true;
  view?.clear();
  try{
    viewRequest??=import('./model-view.js').then(module=>module.createModelView(byId('stage')));
    view=await viewRequest;
    if(id!==requestId)return;
    if(!await view.load(meshURL,entry.name)||id!==requestId)return;
    previewStatus.hidden=true;
    viewTools.hidden=viewHelp.hidden=false;
  }catch(error){
    if(id!==requestId)return;
    previewStatus.textContent=error.name==='WebGLUnavailable'
      ?'This browser cannot display the 3D preview. You can still download the GLB.'
      :'The 3D preview could not be loaded. You can still download the GLB.';
  }
}

function showModelFromURL(){
  const params=new URL(location.href).searchParams;
  const entry=entries.find(item=>item.id===params.get('model'))??entries[0];
  showModel(entry,{variantId:params.get('variant')});
}

async function loadCatalog(){
  status.textContent='Loading catalogue…';
  retry.hidden=true;
  try{
    const response=await fetch(indexURL);
    if(!response.ok)throw new Error('Unable to fetch the catalogue.');
    entries=readCatalog(await response.json());
    filters.disabled=!entries.length;
    setOptions(country,'All countries',entries.map(entry=>entry.country));
    updateCities();
    renderList();
    if(entries.length)showModelFromURL();
    else previewStatus.textContent='Models will appear here when they are added to the catalogue.';
  }catch{
    status.textContent='The catalogue could not be loaded.';
    retry.hidden=false;
  }
}

list.addEventListener('click',event=>{
  const id=event.target.closest('button[data-model]')?.dataset.model;
  if(!id)return;
  const entry=entries.find(item=>item.id===id);
  showModel(entry,{variantId:entry===selection?selectedVariant?.id:undefined,updateURL:true});
  if(matchMedia('(max-width: 690px)').matches)byId('preview').scrollIntoView({block:'start'});
});
search.addEventListener('input',renderList);
geometry.addEventListener('change',renderList);
country.addEventListener('change',()=>{
  updateCities();
  renderList();
});
city.addEventListener('change',renderList);
clearFilters.addEventListener('click',()=>{
  search.value=geometry.value=country.value=city.value='';
  updateCities();
  renderList();
});
variantSelect.addEventListener('change',()=>showModel(selection,{variantId:variantSelect.value,updateURL:true}));
retry.addEventListener('click',loadCatalog);
byId('zoom-in').addEventListener('click',()=>view?.zoom(1/1.2));
byId('zoom-out').addEventListener('click',()=>view?.zoom(1.2));
byId('reset-view').addEventListener('click',()=>view?.reset());
window.addEventListener('popstate',showModelFromURL);
loadCatalog();
