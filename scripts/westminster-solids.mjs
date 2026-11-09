import {openSolids} from './monument-solids.mjs';

export async function westminsterSolids({anchor,anchorElevation,yaw}){
  const solids=await openSolids();
  const {CrossSection,prism}=solids;
  const [lon,lat]=anchor,eastMetres=111320*Math.cos(lat*Math.PI/180);
  const radians=yaw*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
  const height=elevation=>elevation-anchorElevation;
  const geo=(x,z)=>[+(lon+x/eastMetres).toFixed(8),+(lat-z/111320).toFixed(8)];
  const section=rings=>CrossSection.ofPolygons(rings.map(ring=>ring.map(([u,v])=>[u,-v])),'EvenOdd');
  const rectangle=(u0,u1,v0,v1)=>section([[[u0,v0],[u1,v0],[u1,v1],[u0,v1]]]);
  const column=(plan,top)=>plan.extrude(height(top)).rotate(-90,0,0);
  function gable(u0,u1,v0,v1,base,eave,ridge,axis='u'){
    const [a,b]=axis==='u'?[-v1,-v0]:[u0,u1];
    const profile=[[a,height(base)],[b,height(base)],[b,height(eave)],[(a+b)/2,height(ridge)],[a,height(eave)]];
    return axis==='u'?prism(profile,u0,u1).rotate(0,90,0):prism(profile,v0,v1);
  }
  function geometry(plan){
    const polygons=plan.decompose().map(component=>{
      const rings=component.toPolygons().map(ring=>ring.map(([u,v])=>geo(c*u+s*v,s*u-c*v)));
      component.delete();
      return rings.map(ring=>[...ring,ring[0]]);
    });
    return polygons.length===1?{type:'Polygon',coordinates:polygons[0]}:{type:'MultiPolygon',coordinates:polygons};
  }
  function bounds(footprint,min,max){
    const points=footprint.coordinates.flat(footprint.type==='Polygon'?1:2);
    points.push(geo(min[0],max[2]),geo(max[0],min[2]),anchor);
    return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),
      Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
  }
  return {...solids,height,section,rectangle,column,gable,geometry,bounds};
}
