import {ACESFilmicToneMapping,Box3,DirectionalLight,GridHelper,HemisphereLight,MathUtils,PerspectiveCamera,Scene,Spherical,Vector3,WebGLRenderer} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

function disposeModel(object){
  object.traverse(mesh=>{
    if(!mesh.isMesh)return;
    mesh.geometry.dispose();
    for(const material of [mesh.material].flat())material.dispose();
  });
}

export function createModelView(stage){
  let renderer;
  try{renderer=new WebGLRenderer({antialias:true,alpha:true});}
  catch{
    const error=new Error('WebGL 2 is unavailable.');
    error.name='WebGLUnavailable';
    throw error;
  }
  const canvas=renderer.domElement;
  canvas.hidden=true;
  canvas.tabIndex=0;
  canvas.setAttribute('aria-describedby','view-help');
  stage.prepend(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.toneMapping=ACESFilmicToneMapping;
  const scene=new Scene();
  scene.add(new HemisphereLight(0xf5fcff,0x8b9a91,1.25));
  const key=new DirectionalLight(0xfff4e1,2.1);
  key.position.set(5,9,6);
  scene.add(key);
  const fill=new DirectionalLight(0xd3e8ff,.75);
  fill.position.set(-4,3,-5);
  scene.add(fill);
  const grid=new GridHelper(1,16,0x8fa49a,0xc3d3c8);
  scene.add(grid);
  const camera=new PerspectiveCamera(40,1,.1,10000);
  const controls=new OrbitControls(camera,canvas);
  controls.enablePan=false;
  controls.maxPolarAngle=Math.PI*.499;
  controls.enabled=false;
  const loader=new GLTFLoader();
  let object,radius=1,token=0;

  function draw(){
    if(object)renderer.render(scene,camera);
  }

  function resize(){
    const {clientWidth:width,clientHeight:height}=stage;
    if(!width||!height)return;
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    draw();
  }

  function reset(){
    if(!object)return;
    const halfFov=MathUtils.degToRad(camera.fov/2);
    const fitAngle=Math.min(halfFov,Math.atan(Math.tan(halfFov)*camera.aspect));
    const distance=1.12*radius/Math.sin(fitAngle);
    controls.minDistance=radius*.22;
    controls.maxDistance=distance*3;
    controls.target.set(0,0,0);
    camera.position.set(1,.62,1.35).setLength(distance);
    camera.near=radius*.002;
    camera.far=distance*12;
    camera.updateProjectionMatrix();
    controls.update();
    draw();
  }

  function zoom(factor){
    if(!object)return;
    const offset=camera.position.clone().sub(controls.target);
    offset.setLength(MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }

  function clear(){
    token++;
    canvas.hidden=true;
    controls.enabled=false;
    if(!object)return;
    scene.remove(object);
    disposeModel(object);
    object=null;
  }

  async function load(url,name){
    const current=++token;
    const {scene:model,parser}=await loader.loadAsync(url.href);
    if(current!==token){
      disposeModel(model);
      return false;
    }
    const bounds=new Box3().setFromObject(model);
    const size=bounds.getSize(new Vector3());
    radius=size.length()/2;
    if(!Number.isFinite(radius)||radius<=0){
      disposeModel(model);
      throw new Error('The GLB has no visible geometry.');
    }
    model.traverse(mesh=>{
      if(!mesh.isMesh)return;
      if(!mesh.geometry.getAttribute('normal'))mesh.geometry.computeVertexNormals();
      if(!parser.json.materials?.length){
        mesh.material.color.setHex(0xc5ae88);
        mesh.material.metalness=0;
        mesh.material.roughness=.9;
      }
    });
    model.position.sub(bounds.getCenter(new Vector3()));
    object=model;
    scene.add(object);
    grid.scale.setScalar(Math.max(size.x,size.y*.52,size.z)*2.4);
    grid.position.y=-size.y/2-radius*.003;
    canvas.setAttribute('aria-label',`${name}, interactive 3D view`);
    canvas.hidden=false;
    controls.enabled=true;
    resize();
    reset();
    return true;
  }

  canvas.addEventListener('keydown',event=>{
    const step=.12;
    const delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];
    if(delta){
      const orbit=new Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      orbit.theta+=delta[0];
      orbit.phi=MathUtils.clamp(orbit.phi+delta[1],.05,controls.maxPolarAngle);
      camera.position.setFromSpherical(orbit).add(controls.target);
      controls.update();
    }else if(event.key==='+'||event.key==='=')zoom(1/1.2);
    else if(event.key==='-')zoom(1.2);
    else if(event.key==='Home')reset();
    else return;
    event.preventDefault();
  });
  controls.addEventListener('change',draw);
  new ResizeObserver(resize).observe(stage);
  return {load,clear,reset,zoom};
}
