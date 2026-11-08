import assert from 'node:assert/strict';
import ManifoldModule from 'manifold-3d';

export async function openSolids() {
  const api=await ManifoldModule();
  api.setup();
  const {Manifold,CrossSection,Mesh}=api;
  const box=(x0,x1,y0,y1,z0,z1)=>Manifold.cube([x1-x0,y1-y0,z1-z0]).translate([x0,y0,z0]);
  const prism=(profile,z0,z1)=>CrossSection.ofPolygons([profile],'EvenOdd').extrude(z1-z0).translate([0,0,z0]);
  const plate=(outline,height)=>prism(outline.map(([x,z])=>[x,-z]),0,height).rotate(-90,0,0);
  function mesh(vertices,faces) {
    return new Manifold(new Mesh({numProp:3,vertProperties:Float32Array.from(vertices),triVerts:Uint32Array.from(faces)}));
  }
  function turned(x,z,profile,segments,depthRatio=1) {
    const vertices=[],faces=[];
    for(const [y,radius] of profile)for(let i=0;i<segments;i++){
      const angle=(i+.5)*2*Math.PI/segments;
      vertices.push(x+radius*Math.cos(angle),y,z+radius*Math.sin(angle)*depthRatio);
    }
    const top=(profile.length-1)*segments,centre=vertices.length/3;
    vertices.push(x,profile[0][0],z,x,profile.at(-1)[0],z);
    for(let i=0;i<segments;i++){
      const next=(i+1)%segments;
      faces.push(centre,i,next,centre+1,top+next,top+i);
      for(let row=0;row<top;row+=segments){
        const a=row+i,b=row+next;
        faces.push(a,a+segments,b,b,a+segments,b+segments);
      }
    }
    return mesh(vertices,faces);
  }
  return {Manifold,box,prism,plate,turned,mesh};
}

export function printGlb(solid,attribution,previewDirection) {
  assert.equal(solid.status(),'NoError');
  assert(solid.volume()>0);
  const {vertProperties:positions,triVerts:faces,mergeFromVert}=solid.getMesh();
  assert.equal(mergeFromVert.length,0);
  assert(positions.length/3<=65536);
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<positions.length;i++){
    const axis=i%3;
    min[axis]=Math.min(min[axis],positions[i]);
    max[axis]=Math.max(max[axis],positions[i]);
  }
  const indices=Uint16Array.from(faces);
  const binary=Buffer.concat([Buffer.from(positions.buffer),Buffer.from(indices.buffer)]);
  const document={
    asset:{version:'2.0',generator:'Open Place Models',copyright:attribution,extras:{previewDirection}},
    scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
    buffers:[{byteLength:binary.length}],
    bufferViews:[{buffer:0,byteLength:positions.byteLength,target:34962},
      {buffer:0,byteOffset:positions.byteLength,byteLength:indices.byteLength,target:34963}],
    accessors:[{bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3',min,max},
      {bufferView:1,componentType:5123,count:indices.length,type:'SCALAR'}]
  };
  const json=Buffer.from(JSON.stringify(document)),jsonSize=(json.length+3)&~3,binSize=(binary.length+3)&~3;
  const glb=Buffer.alloc(28+jsonSize+binSize);
  glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
  glb.writeUInt32LE(jsonSize,12);glb.write('JSON',16);glb.fill(0x20,20,20+jsonSize);json.copy(glb,20);
  glb.writeUInt32LE(binSize,20+jsonSize);glb.write('BIN\0',24+jsonSize);binary.copy(glb,28+jsonSize);
  return {glb,min,max,vertices:positions.length/3,triangles:faces.length/3};
}
