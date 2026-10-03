import type * as Leaflet from 'leaflet';
import type {MapEntry} from './map-data';

type LeafletAPI=typeof import('leaflet');
function popupContent(entry:MapEntry){
  const root=document.createElement('article');root.className='emergency-map-popup';
  const title=document.createElement('h3');title.textContent=entry.incident.hazard??entry.report?.extractedInformation.hazard??'Emergency report';root.appendChild(title);
  const place=document.createElement('p');place.className='popup-location';place.textContent=`${entry.city}, ${entry.country}`;root.appendChild(place);
  const details=document.createElement('dl');
  const when=entry.reportedAt?new Date(entry.reportedAt):undefined;
  const fields=[['Incident ID',entry.incident.id],['Category',title.textContent],['City',entry.city],['Country',entry.country],['Priority / risk',entry.incident.severity],['Status',entry.incident.status],['Reported',when&&Number.isFinite(when.getTime())?when.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})+' (your local time)':'Not recorded']];
  for(const[label,value]of fields){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;details.appendChild(dt);details.appendChild(dd);}
  root.appendChild(details);
  const reportLabel=document.createElement('h4');reportLabel.textContent='Emergency report';root.appendChild(reportLabel);
  const report=document.createElement('p');report.className='popup-report';report.textContent=entry.report?.rawText??'The original report is not available.';root.appendChild(report);
  const note=document.createElement('p');note.className='popup-precision';note.textContent=entry.coordinates.precision==='Locality center'?'Approximate city center. Confirm the exact emergency address.':'Previously reported coordinates.';root.appendChild(note);
  const link=document.createElement('a');link.href='/incidents?incident='+encodeURIComponent(entry.incident.id);link.textContent='Review incident';root.appendChild(link);
  return root;
}

/** Owns the map only; persistent incidents and coordinates come from the shared server state. */
export class IncidentMapController{
  readonly map:Leaflet.Map;
  private markers=new Map<string,Leaflet.Marker>();
  private entries=new Map<string,MapEntry>();
  private device?:Leaflet.CircleMarker;
  constructor(private L:LeafletAPI,container:HTMLElement,onSelect:(id:string)=>void,onTileError:(failed:boolean)=>void){
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.map=L.map(container,{scrollWheelZoom:false,zoomAnimation:!reduced,fadeAnimation:!reduced,markerZoomAnimation:!reduced}).setView([20,0],2);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'}).on('tileerror',()=>onTileError(true)).on('tileload',()=>onTileError(false)).addTo(this.map);
    this.select=onSelect;
  }
  private select:(id:string)=>void;
  update(entries:MapEntry[]){
    this.entries=new Map(entries.map(e=>[e.incident.id,e]));
    for(const[id,marker]of this.markers)if(!this.entries.has(id)){marker.remove();this.markers.delete(id);}
    for(const entry of entries){
      const id=entry.incident.id,[dx,dy]=entry.offset;
      const resolved=entry.incident.status==='Resolved';
      const icon=this.L.divIcon({className:'emergency-pin'+(resolved?' is-resolved':''),iconSize:[36,44],iconAnchor:[18-dx,42-dy],popupAnchor:[dx,dy-42],html:'<svg viewBox="0 0 36 44" aria-hidden="true"><path d="M18 42C15 37 3 25 3 17a15 15 0 0 1 30 0c0 8-12 20-15 25Z" fill="currentColor" stroke="#fff" stroke-width="2"/><circle cx="18" cy="17" r="5" fill="#fff"/></svg>'});
      let marker=this.markers.get(id);
      if(!marker){
        marker=this.L.marker([entry.coordinates.latitude,entry.coordinates.longitude],{icon,keyboard:true,riseOnHover:true,title:`${entry.incident.severity} emergency: ${entry.city} · ${id}`});
        marker.bindPopup(popupContent(entry),{className:'rescue-leaflet-popup',maxWidth:340,minWidth:220,maxHeight:290,autoClose:true,closeButton:true,autoPanPadding:[22,22]});
        marker.on('click',()=>this.select(id));marker.addTo(this.map);this.markers.set(id,marker);
      }else{
        marker.setLatLng([entry.coordinates.latitude,entry.coordinates.longitude]);marker.setIcon(icon);marker.setPopupContent(popupContent(entry));
      }
      const element=marker.getElement();
      element?.setAttribute('aria-label',`${entry.incident.severity} emergency in ${entry.city}. Open report ${id}`);
      element?.setAttribute('data-incident-id',id);
    }
  }
  focus(id:string,openPopup=false){
    const entry=this.entries.get(id);if(!entry)return;
    this.map.closePopup();
    this.map.setView([entry.coordinates.latitude,entry.coordinates.longitude],12,{animate:false});
    if(openPopup)this.markers.get(id)?.openPopup();
  }
  showAll(){
    const points=[...this.entries.values()].map(e=>[e.coordinates.latitude,e.coordinates.longitude] as [number,number]);
    this.map.closePopup();if(points.length)this.map.fitBounds(points,{padding:[65,65],maxZoom:12,animate:false});
  }
  showDevice(latitude:number,longitude:number){
    if(this.device)this.device.setLatLng([latitude,longitude]);
    else this.device=this.L.circleMarker([latitude,longitude],{radius:8,color:'#fff',weight:2,fillColor:'#22a8e8',fillOpacity:1}).bindTooltip('Your device location').addTo(this.map);
    this.map.closePopup();this.map.setView([latitude,longitude],14,{animate:false});
  }
  destroy(){this.map.remove();this.markers.clear();}
}
