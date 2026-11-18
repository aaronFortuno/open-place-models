import assert from 'node:assert/strict';
// Raw Float32 cleanup only. No Manifold import, no surface simplification.
// Equality of positions is insufficient to merge nonadjacent surface fans.
const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),length=v=>Math.hypot(...v),area=(face,vertices)=>length(cross(sub(vertices[face[1]],vertices[face[0]]),sub(vertices[face[2]],vertices[face[0]])))/2;
function edgeMap(faces){const edges=new Map();faces.forEach((f,i)=>{if(!f)return;for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3],key=Math.min(a,b)+','+Math.max(a,b);if(!edges.has(key))edges.set(key,[]);edges.get(key).push({face:i,from:a,to:b});}});return edges;}
function audit(vertices,faces){const edges=edgeMap(faces),parent=Array.from({length:vertices.length},(_,i)=>i),find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};let signedVolume=0,zeroArea=0,minArea=Infinity,minEdge=Infinity;for(const f of faces){const[A,B,C]=f.map(i=>vertices[i]),a=area(f,vertices);zeroArea+=a===0;minArea=Math.min(minArea,a);signedVolume+=dot(A,cross(B,C))/6;for(let i=0;i<3;i++){parent[find(f[i])]=find(f[(i+1)%3]);minEdge=Math.min(minEdge,length(sub(vertices[f[i]],vertices[f[(i+1)%3]])));}}const links=Array.from({length:vertices.length},()=>[]);for(const f of faces)for(let j=0;j<3;j++)links[f[j]].push([f[(j+1)%3],f[(j+2)%3]]);let nonManifoldVertices=0;
for(const pairs of links){const adj=new Map();for(const[a,b]of pairs){if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);}const seen=new Set();let cycles=0;for(const id of adj.keys()){if(seen.has(id))continue;cycles++;const queue=[id];while(queue.length){const v=queue.pop();if(seen.has(v))continue;seen.add(v);queue.push(...adj.get(v).filter(i=>!seen.has(i)));}}if(cycles!==1||[...adj.values()].some(v=>v.length!==2))nonManifoldVertices++;}
const list=[...edges.values()],boundary=list.filter(x=>x.length===1).length,nonManifold=list.filter(x=>x.length!==2).length,orientationConflicts=list.filter(x=>x.length===2&&x[0].from!==x[1].to).length;return{vertices:vertices.length,triangles:faces.length,components:new Set(parent.map((_,i)=>find(i))).size,nonManifoldVertices,finite:vertices.every(p=>p.every(Number.isFinite)),zeroAreaTriangles:zeroArea,minimumAreaSquareMetres:minArea,minimumEdgeMetres:minEdge,signedVolume,bbox:{min:[0,1,2].map(i=>Math.min(...vertices.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...vertices.map(p=>p[i])))},edges:{total:edges.size,boundary,nonManifold,orientationConflicts},passed:zeroArea===0&&nonManifoldVertices===0&&boundary===0&&nonManifold===0&&orientationConflicts===0&&signedVolume>0};}

export function cleanPrintMesh(positions,indices,{quantization=1e-4}={}){
 // This repair profile is bounded to one connected Uint16 print mesh.
 assert(positions.length%3===0&&indices.length%3===0);
 assert(positions.length/3<=65536,'Cleanup requires the Uint16 print profile');
 assert(positions.every(Number.isFinite)&&indices.every(i=>Number.isInteger(i)&&i>=0&&i<positions.length/3));
 assert(quantization>0&&Number.isFinite(quantization));
 const source=Array.from({length:positions.length/3},(_,i)=>Array.from(positions.slice(i*3,i*3+3))),sourceFaces=Array.from({length:indices.length/3},(_,i)=>Array.from(indices.slice(i*3,i*3+3)));
const vertices=source.map(p=>p.map(x=>{const v=Math.fround(Math.round(x/quantization)*quantization);return Object.is(v,-0)?0:v;})),remap=source.map((_,i)=>i),moves=vertices.map((p,i)=>length(sub(p,source[i]))),safeEdgeWeldLog=[];
let repeatedIDFaces=0;const faces=sourceFaces.map(f=>f.slice()),repairLog=[];
// Fuse only zero-length edges satisfying the closed-surface link condition.
// Spatially coincident but nonadjacent vertices are not globally identified:
// that operation pinches four unrelated faces onto one edge at the apse.
for(let pass=0;pass<1000;pass++){
 const edges=edgeMap(faces),neighbours=new Map();for(const key of edges.keys()){const[a,b]=key.split(',').map(Number);if(!neighbours.has(a))neighbours.set(a,new Set());if(!neighbours.has(b))neighbours.set(b,new Set());neighbours.get(a).add(b);neighbours.get(b).add(a);}
 let changed=false;
 for(const[key,uses]of edges){const[a,b]=key.split(',').map(Number);if(length(sub(vertices[a],vertices[b]))!==0||uses.length!==2)continue;const common=[...neighbours.get(a)].filter(i=>i!==a&&i!==b&&neighbours.get(b).has(i)),opposite=[...new Set(uses.map(e=>faces[e.face].find(i=>i!==a&&i!==b)))];if(common.length!==2||opposite.length!==2||!common.every(i=>opposite.includes(i)))continue;
  for(let i=0;i<faces.length;i++){if(!faces[i])continue;const f=faces[i].map(v=>v===b?a:v);if(new Set(f).size<3){faces[i]=null;repeatedIDFaces++;}else faces[i]=f;}
  for(let i=0;i<remap.length;i++)if(remap[i]===b)remap[i]=a;safeEdgeWeldLog.push({retained:a,removed:b,link:common,geometryMoved:false});changed=true;break;
 }
 if(!changed)break;
}
// A collinear triangle can be removed without moving geometry by inserting
// its middle vertex into the opposite neighbour's long edge. Replace the
// zero face and that neighbour with two nonzero triangles on the same plane.
// Deleting a zero-area face alone would leave a topological hole.
for(let iteration=0;iteration<1000;iteration++){
 const bad=faces.map((f,i)=>f&&area(f,vertices)===0?i:-1).filter(i=>i>=0);if(!bad.length)break;const edges=edgeMap(faces);let changed=false;
 for(const index of bad){const f=faces[index],pairs=[[f[0],f[1],f[2]],[f[1],f[2],f[0]],[f[2],f[0],f[1]]].sort((a,b)=>length(sub(vertices[b[0]],vertices[b[1]]))-length(sub(vertices[a[0]],vertices[a[1]]))),[a,c,m]=pairs[0],A=vertices[a],C=vertices[c],M=vertices[m];if(dot(sub(M,A),sub(M,C))>1e-12)continue;
  const neighbours=edges.get(Math.min(a,c)+','+Math.max(a,c))||[];if(neighbours.length!==2)continue;const adjacent=neighbours.find(e=>e.face!==index);if(!adjacent)continue;const other=faces[adjacent.face],d=other.find(i=>i!==a&&i!==c);if(d===undefined||d===m)continue;
  const j=other.indexOf(a),along=other[(j+1)%3]===c,first=along?[a,m,d]:[c,m,d],second=along?[m,c,d]:[m,a,d];if(area(first,vertices)===0||area(second,vertices)===0)continue;
  const before=area(other,vertices),after=area(first,vertices)+area(second,vertices);if(Math.abs(after-before)>Math.max(1e-10,before*1e-10))continue;
  faces[index]=null;faces[adjacent.face]=first;faces.push(second);repairLog.push({zeroFace:index,neighbourFace:adjacent.face,longEdge:[a,c],middleVertex:m,oppositeVertex:d,neighbourAreaBefore:before,neighbourAreaAfter:after,geometryMoved:false});changed=true;break;
 }
 if(!changed)break;
}
const coincidentGroups=new Map(),cancelledOppositePairs=[];
faces.forEach((f,i)=>{if(!f)return;const key=f.slice().sort((a,b)=>a-b).join(','),j=f.indexOf(Math.min(...f)),sign=f[(j+1)%3]<f[(j+2)%3]?'positive':'negative';if(!coincidentGroups.has(key))coincidentGroups.set(key,{positive:[],negative:[]});coincidentGroups.get(key)[sign].push(i);});
for(const[key,group]of coincidentGroups){const n=Math.min(group.positive.length,group.negative.length);for(let j=0;j<n;j++){const first=group.positive[j],second=group.negative[j];cancelledOppositePairs.push({first,second,ids:key.split(',').map(Number),geometryMoved:false,signedVolumeNet:0});faces[first]=null;faces[second]=null;}}
const retained=faces.filter(Boolean),used=[...new Set(retained.flat())].sort((a,b)=>a-b),compactMap=new Map(used.map((n,i)=>[n,i])),compactVertices=used.map(i=>vertices[i]),compactFaces=retained.map(f=>f.map(i=>compactMap.get(i))),originalAudit=audit(source,sourceFaces),cleanedAudit=audit(compactVertices,compactFaces);

assert(cleanedAudit.passed,'Raw cleanup must retain one closed, oriented, nondegenerate vertex manifold');
assert.equal(cleanedAudit.components,1);
const coincident=new Map();compactVertices.forEach((p,i)=>{const key=p.join(',');if(!coincident.has(key))coincident.set(key,[]);coincident.get(key).push(i);});
return{positions:Float32Array.from(compactVertices.flat()),indices:Uint16Array.from(compactFaces.flat()),cleanup:{quantizationMetres:quantization,maximumVertexMoveMetres:Math.max(...moves),weldedEdgeCount:safeEdgeWeldLog.length,repeatedIDFacesRemoved:repeatedIDFaces,localCollinearRepairs:repairLog.length,cancelledCoincidentOppositeFacePairs:cancelledOppositePairs.length,retainedCoincidentNonAdjacentVertexGroups:[...coincident.values()].filter(g=>g.length>1),sourceAudit:originalAudit,cleanedAudit,relativeVolumeChange:(cleanedAudit.signedVolume-originalAudit.signedVolume)/originalAudit.signedVolume,volumeChangeCubicMetres:cleanedAudit.signedVolume-originalAudit.signedVolume,repairLog,safeEdgeWeldLog}};
}

export function readPrintMesh(buffer){
 assert.equal(buffer.toString('ascii',0,4),'glTF');const end=20+buffer.readUInt32LE(12),doc=JSON.parse(buffer.toString('utf8',20,end)),bin=end+8,primitive=doc.meshes[0].primitives[0],pa=doc.accessors[primitive.attributes.POSITION],ia=doc.accessors[primitive.indices],pv=doc.bufferViews[pa.bufferView],iv=doc.bufferViews[ia.bufferView];
 assert.equal(doc.meshes.length,1);assert.equal(doc.meshes[0].primitives.length,1);assert.equal(pa.componentType,5126);assert.equal(ia.componentType,5123);assert.equal(pv.byteStride,undefined);assert.equal(iv.byteStride,undefined);
 const positions=new Float32Array(pa.count*3),indices=new Uint16Array(ia.count);for(let i=0;i<positions.length;i++)positions[i]=buffer.readFloatLE(bin+(pv.byteOffset||0)+(pa.byteOffset||0)+i*4);for(let i=0;i<indices.length;i++)indices[i]=buffer.readUInt16LE(bin+(iv.byteOffset||0)+(ia.byteOffset||0)+i*2);return{positions,indices};
}
export function auditPrintMesh(positions,indices){return audit(Array.from({length:positions.length/3},(_,i)=>Array.from(positions.slice(i*3,i*3+3))),Array.from({length:indices.length/3},(_,i)=>Array.from(indices.slice(i*3,i*3+3))));}
export function rawMeshRayCast(positions,indices,from,to){
 const direction=sub(to,from),hits=[];for(let i=0;i<indices.length;i+=3){const[A,B,C]=Array.from(indices.slice(i,i+3),v=>Array.from(positions.slice(v*3,v*3+3))),e1=sub(B,A),e2=sub(C,A),P=cross(direction,e2),det=dot(e1,P);if(Math.abs(det)<1e-12)continue;const inverse=1/det,T=sub(from,A),u=dot(T,P)*inverse;if(u< -1e-9||u>1+1e-9)continue;const Q=cross(T,e1),v=dot(direction,Q)*inverse;if(v< -1e-9||u+v>1+1e-9)continue;const t=dot(e2,Q)*inverse;if(t< -1e-9||t>1+1e-9)continue;hits.push({triangle:i/3,t,position:from.map((x,j)=>x+t*direction[j])});}return hits.sort((a,b)=>a.t-b.t);
}
