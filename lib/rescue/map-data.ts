import type {Coordinates,Incident,Report} from './model';

export type MapEntry={incident:Incident;coordinates:Coordinates;report:Report|undefined;city:string;country:string;reportedAt:string|undefined;offset:[number,number]};
export function validCoordinates(c:Coordinates|undefined):c is Coordinates{
  return !!c&&Number.isFinite(c.latitude)&&Math.abs(c.latitude)<=85&&Number.isFinite(c.longitude)&&Math.abs(c.longitude)<=180;
}
export function incidentMapEntries(incidents:Incident[],reports:Report[]):MapEntry[]{
  const entries=incidents.filter(i=>i.origin==='user'&&i.locationResolution?.status==='located'&&validCoordinates(i.locationResolution.coordinates)).map(incident=>{
    const coordinates=incident.locationResolution!.coordinates!;
    const report=[...reports].reverse().find(r=>r.incidentId===incident.id);
    const parts=incident.location.split(',').map(p=>p.trim());
    return {incident,coordinates,report,city:incident.city??coordinates.city??parts[0],country:incident.country??coordinates.country??(parts.length>1?parts.at(-1)!:'Not recorded'),reportedAt:report?.timestamp??incident.reportedAt,offset:[0,0] as [number,number]};
  });
  const groups=new Map<string,MapEntry[]>();
  for(const entry of entries){const c=entry.coordinates,key=`${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`;const group=groups.get(key)??[];group.push(entry);groups.set(key,group);}
  // Separate icons, never saved coordinates, when several emergencies share a city center.
  for(const group of groups.values())if(group.length>1)group.sort((a,b)=>a.incident.id.localeCompare(b.incident.id)).forEach((entry,index)=>{
    const ring=Math.floor(index/8),slots=Math.min(8,group.length-ring*8),angle=(index%8)*Math.PI*2/slots-Math.PI/2,radius=42+ring*48;
    entry.offset=[Math.round(Math.cos(angle)*radius),Math.round(Math.sin(angle)*radius)];
  });
  return entries;
}
