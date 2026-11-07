import './gallery.css';
import {readCatalog,searchKey} from './catalog.js';

const byId=id=>document.getElementById(id);
const indexURL=new URL('./catalog.geojson',document.baseURI);
const search=byId('model-search'),list=byId('model-list'),status=byId('catalog-status');
const previewStatus=byId('preview-status'),viewTools=byId('view-tools'),viewHelp=byId('view-help');
const retry=byId('reload-catalog'),heightFormat=new Intl.NumberFormat('en',{maximumFractionDigits:2});
let entries=[],selection,viewRequest,view,requestId=0;

function link(href,label){
  const anchor=document.createElement('a');
  anchor.href=href;
  anchor.textContent=label;
  return anchor;
}

function renderList(){
  const query=searchKey(search.value.trim());
  const matching=entries.filter(entry=>
    searchKey([entry.name,entry.place,...(entry.aliases??[])].join(' ')).includes(query));
  list.replaceChildren(...matching.map(entry=>{
    const item=document.createElement('li');
    const button=document.createElement('button');
    button.type='button';
    button.dataset.model=entry.id;
    button.textContent=entry.name;
    if(entry.place){
      const place=document.createElement('small');
      place.textContent=entry.place;
      button.append(place);
    }
    item.append(button);
    return item;
  }));
  byId('model-count').textContent=query?`${matching.length} of ${entries.length}`:String(entries.length);
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

function showDetails(entry,meshURL){
  byId('model-name').textContent=entry.name;
  const place=byId('model-place');
  place.textContent=entry.place??'';
  place.hidden=!entry.place;
  const download=byId('download');
  download.href=meshURL;
  download.download=`${entry.id}-${entry.revision}.glb`;
  download.hidden=false;
  byId('model-height').textContent=Number.isFinite(entry.height)?`${heightFormat.format(entry.height)} m`:'—';
  byId('model-revision').textContent=entry.revision??'—';
  const [lon,lat]=entry.anchor;
  const map=byId('model-map');
  map.href=`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
  map.textContent=`${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  byId('model-attribution').textContent=entry.attribution??'';
  const licenses=byId('model-licenses');
  licenses.replaceChildren('Mesh ',licenseNode(entry.license));
  if(entry.spatialDataLicense)licenses.append(' · Spatial data ',licenseNode(entry.spatialDataLicense));
  const sources=byId('model-sources');
  sources.replaceChildren();
  for(const source of entry.sources??[]){
    if(typeof source!=='string'||!URL.canParse(source))continue;
    const url=new URL(source);
    if(url.protocol!=='https:'&&url.protocol!=='http:')continue;
    const item=document.createElement('li');
    item.append(link(url.href,url.hostname.replace(/^www\./,'')));
    sources.append(item);
  }
  byId('model-details').hidden=false;
}

async function showModel(entry,updateURL=false){
  if(!entry)return;
  if(updateURL){
    const url=new URL(location.href);
    if(url.searchParams.get('model')!==entry.id){
      url.searchParams.set('model',entry.id);
      history.pushState(null,'',url);
    }
  }
  if(entry===selection)return;
  selection=entry;
  updateCurrent();
  const meshURL=new URL(entry.mesh,indexURL);
  showDetails(entry,meshURL);
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

function modelFromURL(){
  const slug=new URL(location.href).searchParams.get('model');
  return entries.find(entry=>entry.id===slug)??entries[0];
}

async function loadCatalog(){
  status.textContent='Loading catalogue…';
  retry.hidden=true;
  try{
    const response=await fetch(indexURL);
    if(!response.ok)throw new Error('Unable to fetch the catalogue.');
    entries=readCatalog(await response.json());
    search.disabled=!entries.length;
    renderList();
    if(entries.length)showModel(modelFromURL());
    else previewStatus.textContent='Models will appear here when they are added to the catalogue.';
  }catch{
    status.textContent='The catalogue could not be loaded.';
    retry.hidden=false;
  }
}

list.addEventListener('click',event=>{
  const id=event.target.closest('button[data-model]')?.dataset.model;
  if(id)showModel(entries.find(entry=>entry.id===id),true);
});
search.addEventListener('input',renderList);
retry.addEventListener('click',loadCatalog);
byId('zoom-in').addEventListener('click',()=>view?.zoom(1/1.2));
byId('zoom-out').addEventListener('click',()=>view?.zoom(1.2));
byId('reset-view').addEventListener('click',()=>view?.reset());
window.addEventListener('popstate',()=>showModel(modelFromURL()));
loadCatalog();
