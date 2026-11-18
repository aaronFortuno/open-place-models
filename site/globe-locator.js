export function createGlobeLocator({onSelect}){
  const byId=id=>document.getElementById(id);
  const dialog=byId('globe-dialog'),open=byId('open-globe'),host=byId('globe-stage');
  const list=byId('globe-models'),heading=byId('globe-area-title'),status=byId('globe-status');
  let entries=[],selection,area,view,request;

  function renderList(){
    const focused=list.contains(document.activeElement)?document.activeElement.dataset.model:undefined;
    const choices=area??entries;
    heading.textContent=area?`${area.length} ${area.length===1?'model':'models'} in this area`:'All matching models';
    list.replaceChildren(...choices.map(entry=>{
      const item=document.createElement('li'),button=document.createElement('button');
      button.type='button';button.dataset.model=entry.id;
      const name=document.createElement('strong'),place=document.createElement('span');
      name.textContent=entry.name;place.textContent=entry.place;
      button.append(name,place);
      if(entry.id===selection?.id)button.setAttribute('aria-current','true');
      item.append(button);return item;
    }));
    byId('globe-all').hidden=!area;
    byId('globe-empty').hidden=Boolean(choices.length);
    const selected=byId('globe-selection');
    selected.textContent=selection?`Selected: ${selection.name}`:'Select a marker or a place from the list.';
    byId('globe-view-model').disabled=!selection;
    byId('globe-focus').disabled=!selection||!entries.some(entry=>entry.id===selection.id);
    if(focused)list.querySelector(`button[data-model="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
  }

  function pick(group){
    area=group;
    renderList();
    if(group.length===1)onSelect(group[0]);
    heading.focus();
  }

  async function show(){
    dialog.showModal();
    open.setAttribute('aria-expanded','true');
    renderList();
    if(!request){
      status.hidden=false;status.textContent='Loading globe…';
      request=import('./globe-view.js').then(module=>module.createGlobeView(host,{onPick:pick}));
    }
    try{
      view=await request;
      status.hidden=true;
      view.setEntries(entries,selection?.id);
      view.setActive(dialog.open);
      if(selection&&entries.some(entry=>entry.id===selection.id))view.focus(selection.id);
      byId('globe-tools').hidden=false;
    }catch{
      status.textContent='The globe is unavailable in this browser. Choose a model from the list.';
      byId('globe-tools').hidden=true;
    }
  }

  open.addEventListener('click',show);
  byId('close-globe').addEventListener('click',()=>dialog.close());
  byId('globe-view-model').addEventListener('click',()=>{
    dialog.close();byId('preview').focus();
    if(matchMedia('(max-width: 690px)').matches)byId('preview').scrollIntoView({block:'start'});
  });
  dialog.addEventListener('close',()=>{view?.setActive(false);open.setAttribute('aria-expanded','false');});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  byId('globe-all').addEventListener('click',()=>{area=undefined;renderList();});
  byId('globe-zoom-in').addEventListener('click',()=>view?.zoom(1/1.2));
  byId('globe-zoom-out').addEventListener('click',()=>view?.zoom(1.2));
  byId('globe-reset').addEventListener('click',()=>view?.reset());
  byId('globe-focus').addEventListener('click',()=>view?.focus(selection?.id));
  list.addEventListener('click',event=>{
    const id=event.target.closest('button[data-model]')?.dataset.model;
    const entry=entries.find(item=>item.id===id);
    if(entry){onSelect(entry);view?.focus(entry.id);}
  });
  return {
    setEntries(next,current){
      entries=next;selection=current;area=undefined;
      open.disabled=!entries.length;
      byId('globe-count').textContent=`${entries.length} ${entries.length===1?'model':'models'} matching the gallery filters`;
      view?.setEntries(entries,selection?.id);
      if(dialog.open)renderList();
    },
    setSelection(current){
      selection=current;view?.setEntries(entries,selection?.id);
      if(dialog.open)renderList();
    },
  };
}
