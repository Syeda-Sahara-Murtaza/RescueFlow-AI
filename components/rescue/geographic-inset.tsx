'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {MapPin,LocateFixed,Expand} from 'lucide-react';
import {useRescue} from './provider';
import {activeMission} from '@/lib/rescue/model';
import type {Incident} from '@/lib/rescue/model';
import {incidentMapEntries} from '@/lib/rescue/map-data';
import {IncidentMapController} from '@/lib/rescue/incident-map-controller';
type Position={latitude:number;longitude:number;accuracy:number;time:number};

export function GeographicInset({incidents,onSelect}:{incidents:Incident[];onSelect:(i:Incident)=>void}){
  const{state}=useRescue();
  const users=incidents.filter(i=>i.origin==='user');
  const entries=useMemo(()=>incidentMapEntries(incidents,state.reports),[incidents,state.reports]);
  const [controller,setController]=useState<IncidentMapController|null>(null);
  const [selected,setSelected]=useState<string|null>(null),[position,setPosition]=useState<Position|null>(null),[tracking,setTracking]=useState(false),[message,setMessage]=useState('');
  const [mapError,setMapError]=useState(false),[tileError,setTileError]=useState(false),[justSubmitted,setJustSubmitted]=useState(false);
  const container=useRef<HTMLDivElement>(null),watcher=useRef<number|null>(null),lastFocus=useRef('');
  const stop=useCallback(()=>{if(watcher.current!==null)navigator.geolocation.clearWatch(watcher.current);watcher.current=null;setTracking(false);},[]);
  useEffect(()=>{
    let disposed=false,map:IncidentMapController|undefined,resize:ResizeObserver|undefined;
    void import('leaflet').then(L=>{
      if(disposed||!container.current)return;
      map=new IncidentMapController(L,container.current,id=>{stop();setSelected(id);},setTileError);
      setController(map);
      resize=new ResizeObserver(()=>map?.map.invalidateSize({pan:false}));resize.observe(container.current);
    }).catch(()=>{if(!disposed)setMapError(true);});
    return()=>{disposed=true;resize?.disconnect();map?.destroy();if(watcher.current!==null)navigator.geolocation.clearWatch(watcher.current);};
  },[stop]);
  useEffect(()=>{
    if(!controller)return;
    controller.update(entries);
    const query=new URLSearchParams(window.location.search);
    const key=state.lastAnalysis?.requestId??entries.at(-1)?.incident.id??'';
    if(!entries.length||lastFocus.current===key)return;
    const requested=!lastFocus.current?query.get('incident'):state.lastAnalysis?.incidentId;
    const target=entries.find(e=>e.incident.id===requested)??entries.find(e=>e.incident.id===state.lastAnalysis?.incidentId)??entries.at(-1);
    if(target){stop();controller.focus(target.incident.id);setSelected(target.incident.id);lastFocus.current=key;setJustSubmitted(query.get('submitted')==='1'&&target.incident.id===requested);}
  },[controller,entries,state.lastAnalysis,stop]);
  const start=()=>{
    if(!navigator.geolocation){setMessage('Your browser does not support location. Select a reported location below.');return;}
    stop();setMessage('Waiting for location permission…');setTracking(true);
    watcher.current=navigator.geolocation.watchPosition(p=>{
      setPosition({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,time:p.timestamp});setSelected('my-location');setMessage('');controller?.showDevice(p.coords.latitude,p.coords.longitude);
    },error=>{setMessage(error.code===1?'Location permission was denied. Allow location in your browser settings, or select an incident below.':error.code===3?'Location lookup timed out. Please try again.':'Your location is unavailable. Please try again or select a reported location.');stop();},{enableHighAccuracy:true,maximumAge:10000,timeout:15000});
  };
  const incident=entries.find(e=>e.incident.id===selected)?.incident;
  const mine=selected==='my-location'&&position;
  return <section className="geographic-inset live-geographic-map" id="incident-map">
    <div className="row-between map-action-row"><span className="meta">{entries.length} LOCATED · {users.length-entries.length} UNPLACED</span><div className="row-gap"><button className="btn secondary" disabled={!controller||!entries.length} onClick={()=>{stop();controller?.showAll();setSelected(null);}}><Expand size={15}/>Show all</button><button className="btn secondary" disabled={!controller} onClick={tracking?stop:start}><LocateFixed size={15}/>{tracking?'Stop live location':'Use my live location'}</button></div></div>
    {justSubmitted&&<p className="map-submission-note" role="status">Report saved. Your red emergency pin is on the map. Select it to read the report.</p>}
    <p className="small-note">{mine?`Your device location · accuracy approximately ${Math.round(position.accuracy)} m · ${tracking?'updating live':'last recorded position'}`:incident?`${incident.location} · approximate city center`:entries.length?'All saved incident locations. Select a pin to read its report.':'Submit an emergency to add its location, or allow device location access.'}</p>
    {message&&<p role="status" className="map-location-message">{message}</p>}
    <div className="emergency-map-shell"><div ref={container} className="live-map-frame emergency-leaflet-map" role="region" aria-label="Interactive incident map with emergency pins"/>{!controller&&<div className="map-load-note" role="status">{mapError?<><p>The map could not load. Your reports are saved.</p><button className="btn secondary" onClick={()=>window.location.reload()}>Retry map</button></>:'Loading incident map…'}</div>}</div>
    {tileError&&<p className="small-note" role="status">The street map background is unavailable. Your saved emergency pins and report list remain available.</p>}
    <div className="emergency-map-legend"><span><i className="active-pin-key"/>Active emergency</span><span><i className="resolved-pin-key"/>Resolved</span><span><i className="device-pin-key"/>Your device</span></div>
    {mine&&<p className="small-note">Updated {new Date(position.time).toLocaleTimeString()}. Your device location is not an emergency report.</p>}
    <div className="geo-location-list">{users.map(i=><div className="map-location-row" key={i.id}><button aria-label={'Show '+i.id+' on map'} onClick={()=>{if(entries.some(e=>e.incident.id===i.id)){stop();setSelected(i.id);controller?.focus(i.id,true);}else onSelect(i);}}><MapPin size={17} className={i.status==='Resolved'?'resolved-pin-text':'active-pin-text'}/><span><strong>{i.location}</strong><small>{entries.some(e=>e.incident.id===i.id)?i.severity+' · '+state.missions.filter(m=>m.incidentId===i.id&&activeMission(m)).length+' active missions · '+i.id:i.locationResolution?.message??'Location not resolved'}</small></span></button><button className="map-details-link" onClick={()=>onSelect(i)}>Details</button></div>)}</div>
    <p className="small-note map-privacy-note">Pins mark approximate city centers. Pins at the same location are separated for selection. Device location stays in this page; map coordinates are sent to OpenStreetMap. This is not live responder tracking.</p>
  </section>;
}
