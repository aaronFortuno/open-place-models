export function geographicPoint([longitude,latitude],radius=1){
  const lat=latitude*Math.PI/180,lon=longitude*Math.PI/180;
  return [Math.cos(lat)*Math.cos(lon)*radius,Math.sin(lat)*radius,-Math.cos(lat)*Math.sin(lon)*radius];
}

// Group projected markers without losing any co-located catalogue entries.
export function clusterPoints(points,radius=24){
  const parents=points.map((_,index)=>index);
  const root=index=>{
    while(parents[index]!==index){parents[index]=parents[parents[index]];index=parents[index];}
    return index;
  };
  for(let a=0;a<points.length;a++){
    for(let b=a+1;b<points.length;b++){
      if(Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y)<=radius){
        parents[root(b)]=root(a);
      }
    }
  }
  const groups=new Map();
  points.forEach((point,index)=>{
    const key=root(index);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(point);
  });
  return [...groups.values()].map(members=>({
    id:members.map(point=>point.entry.id).sort().join('|'),
    entries:members.map(point=>point.entry),
    x:members.reduce((sum,point)=>sum+point.x,0)/members.length,
    y:members.reduce((sum,point)=>sum+point.y,0)/members.length,
  }));
}
