import {CanvasTexture,DirectionalLight,HemisphereLight,MathUtils,Mesh,MeshLambertMaterial,PerspectiveCamera,Scene,Spherical,SphereGeometry,SRGBColorSpace,Vector3,WebGLRenderer} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import land from './atlas/land.json';
import {clusterPoints,geographicPoint} from './globe-points.js';

const position=(anchor,radius=1)=>new Vector3(...geographicPoint(anchor,radius));

function mapTexture(){
  const canvas=document.createElement('canvas');
  canvas.width=2048;canvas.height=1024;
  const context=canvas.getContext('2d');
  context.fillStyle='#dfebe5';context.fillRect(0,0,canvas.width,canvas.height);
  context.strokeStyle='#c4d8cd';context.lineWidth=1;
  for(let longitude=-180;longitude<180;longitude+=30){
    const x=(longitude+180)/360*canvas.width;
    context.beginPath();context.moveTo(x,0);context.lineTo(x,canvas.height);context.stroke();
  }
  for(let latitude=-60;latitude<=60;latitude+=30){
    const y=(90-latitude)/180*canvas.height;
    context.beginPath();context.moveTo(0,y);context.lineTo(canvas.width,y);context.stroke();
  }
  context.fillStyle='#96af96';context.strokeStyle='#6b8a72';context.lineWidth=1;
  for(const polygon of land){
    context.beginPath();
    for(const ring of polygon){
      ring.forEach(([lon,lat],index)=>{
        const x=(lon+180)/360*canvas.width,y=(90-lat)/180*canvas.height;
        if(index===0)context.moveTo(x,y);else context.lineTo(x,y);
      });
      context.closePath();
    }
    context.fill('evenodd');context.stroke();
  }
  const texture=new CanvasTexture(canvas);
  texture.colorSpace=SRGBColorSpace;
  return texture;
}

export function createGlobeView(host,{onPick}){
  const renderer=new WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const canvas=renderer.domElement;
  canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Catalogue globe');
  canvas.setAttribute('aria-describedby','globe-help');
  host.prepend(canvas);
  const markers=document.createElement('div');
  markers.className='globe-markers';
  host.append(markers);
  const scene=new Scene();
  scene.add(new HemisphereLight(0xffffff,0xc1d0bd,2.2));
  const light=new DirectionalLight(0xfff9ed,1.4);
  light.position.set(-2,3,5);scene.add(light);
  const sphere=new Mesh(new SphereGeometry(1,64,40),new MeshLambertMaterial({map:mapTexture()}));
  scene.add(sphere);
  const camera=new PerspectiveCamera(38,1,.01,20);
  const controls=new OrbitControls(camera,canvas);
  controls.enablePan=false;
  controls.minDistance=1.15;controls.maxDistance=5;
  controls.minPolarAngle=.04;controls.maxPolarAngle=Math.PI-.04;
  controls.rotateSpeed=.65;controls.zoomSpeed=.65;
  let entries=[],selected,active=false;
  const buttons=new Map();

  function draw(){
    if(!active)return;
    camera.updateMatrixWorld();
    renderer.render(scene,camera);
    const {clientWidth:width,clientHeight:height}=host;
    const direction=camera.position.clone().normalize();
    const points=[];
    for(const entry of entries){
      const normal=position(entry.anchor);
      if(normal.dot(direction)<=1/camera.position.length()+.012)continue;
      const projected=normal.multiplyScalar(1.012).project(camera);
      const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2;
      if(x<12||x>width-12||y<12||y>height-12)continue;
      points.push({entry,x,y});
    }
    const groups=clusterPoints(points),visible=new Set();
    for(const group of groups){
      visible.add(group.id);
      let button=buttons.get(group.id);
      if(!button){
        button=document.createElement('button');
        button.type='button';button.className='globe-marker';
        button.addEventListener('click',()=>onPick(button.globeEntries));
        markers.append(button);buttons.set(group.id,button);
      }
      const chosen=group.entries.some(entry=>entry.id===selected);
      button.globeEntries=group.entries;
      button.classList.toggle('is-selected',chosen);
      button.classList.toggle('is-cluster',group.entries.length>1);
      button.textContent=group.entries.length>1?String(group.entries.length):'';
      const label=group.entries.length===1?group.entries[0].name:`${group.entries.length} models in this area`;
      button.setAttribute('aria-label',chosen?`${label}, includes selected model`:label);
      button.title=label;
      button.style.left=`${group.x}px`;button.style.top=`${group.y}px`;
    }
    for(const [id,button] of buttons){
      if(!visible.has(id)){button.remove();buttons.delete(id);}
    }
  }
  function resize(){
    const {clientWidth:width,clientHeight:height}=host;
    if(!active||!width||!height)return;
    renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();draw();
  }
  function focus(id){
    const entry=entries.find(item=>item.id===id);
    if(!entry)return;
    camera.position.copy(position(entry.anchor,MathUtils.clamp(camera.position.length(),2.25,3.5)));
    controls.update();draw();
  }
  function reset(){
    camera.position.copy(position([12,26],3.5));
    controls.target.set(0,0,0);controls.update();draw();
  }
  function zoom(factor){
    camera.position.setLength(MathUtils.clamp(camera.position.length()*factor,controls.minDistance,controls.maxDistance));
    controls.update();draw();
  }
  canvas.addEventListener('keydown',event=>{
    const delta={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]}[event.key];
    if(delta){
      const orbit=new Spherical().setFromVector3(camera.position);
      orbit.theta+=delta[0];orbit.phi=MathUtils.clamp(orbit.phi+delta[1],.04,Math.PI-.04);
      camera.position.setFromSpherical(orbit);controls.update();draw();
    }else if(event.key==='+'||event.key==='=')zoom(1/1.2);
    else if(event.key==='-')zoom(1.2);
    else if(event.key==='Home')reset();
    else return;
    event.preventDefault();
  });
  controls.addEventListener('change',()=>{
    const close=MathUtils.clamp((camera.position.length()-1.15)/2.35,0,1);
    controls.rotateSpeed=.2+.45*close;
    draw();
  });
  new ResizeObserver(resize).observe(host);
  reset();
  return {
    setEntries(next,id){entries=next;selected=id;draw();},
    setActive(value){active=value;controls.enabled=value;if(value)resize();},
    focus,reset,zoom,
  };
}
