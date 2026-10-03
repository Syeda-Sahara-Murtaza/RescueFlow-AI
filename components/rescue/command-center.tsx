'use client';
import {useState} from 'react';
import {Check,Clock,Flag,History,MapPin,Radio} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {useRescue} from './provider';
import {Badge,IncidentMap} from './shared';
import {GeographicInset} from './geographic-inset';
import {operations} from '@/lib/rescue/selectors';
export function CommandCenter(){
  const{state}=useRescue(),op=operations(state);
  const[map,setMap]=useState(state.simulationLoaded&&!state.incidents.some(i=>i.origin==='user')?'demo':'reported');
  const openIncident=(id:string)=>{window.location.href='/incidents?incident='+encodeURIComponent(id)};
  return <div className="operations-content"><div className="operations-status-strip">{[['Active incidents',op.incidents.length],['Active missions',op.active.length],['Resources available',op.free],['Critical alerts',op.critical.length]].map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}<div><strong>—</strong><span>En route · not tracked</span></div></div>
    <div className="operations-grid"><section className="panel operational-map"><div className="panel-heading"><div><h2><MapPin size={19}/>Operational map</h2><p>Incident locations and mission destinations</p></div>{state.simulationLoaded&&<Tabs value={map} onValueChange={setMap}><TabsList><TabsTrigger value="reported">Reported locations</TabsTrigger><TabsTrigger value="demo">Demo region</TabsTrigger></TabsList></Tabs>}</div>{map==='demo'&&state.simulationLoaded?<><IncidentMap compact onSelect={i=>openIncident(i.id)}/><p className="map-scenario-note">Fictional scenario region. Resource depots and routes are schematic; they are not real-world coordinates.</p><div className="demo-depot-summary">{state.resources.slice(0,4).map(r=><a href="/resources" key={r.id}><span>{r.type}</span><strong>{r.location}</strong></a>)}</div></>:<GeographicInset incidents={state.incidents} onSelect={i=>openIncident(i.id)}/>}</section>
      <aside className="operations-sidebar"><section className="panel"><div className="panel-heading"><h2>Critical alerts</h2><Badge tone={op.critical.length?'red':'neutral'}>{op.critical.length}</Badge></div>{op.critical.slice(0,3).map(i=><a className="operational-summary" key={i.id} href={'/incidents?incident='+encodeURIComponent(i.id)}><strong>{i.location}</strong><span>{i.title}</span><small>{i.evidence.length} linked reports · review evidence</small></a>)}{!op.critical.length&&<p className="summary-empty">No critical alerts in this workspace.</p>}</section>
      <section className="panel"><div className="panel-heading"><h2>Active operations</h2><Flag size={17}/></div>{op.active.slice(0,4).map(m=><a className="operational-summary" key={m.id} href={'/missions#mission-'+m.id}><div className="row-between"><strong>{state.incidents.find(i=>i.id===m.incidentId)?.location}</strong><Badge tone="green">{m.status}</Badge></div><span>{m.title}</span><small>{Object.values(m.assignedResources).reduce((n,q)=>n+q,0)} resource units assigned</small></a>)}{!op.active.length&&<p className="summary-empty">{op.pending.length?`${op.pending.length} missions await approval.`:'No active operations yet.'}</p>}<a className="command-panel-link" href="/missions">Mission controls</a></section>
      <div className="ground-status-note"><Radio size={17}/><p>Operational updates reflect saved decisions. Live device location is available on the map; responder GPS and vehicle movement are not connected.</p></div></aside>
    </div><ActivityTimeline/>
  </div>;
}
function ActivityTimeline(){
  const{state}=useRescue();const[expanded,setExpanded]=useState(false);
  const events=[...state.activity].sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
  return <section className="panel operation-timeline" id="timeline"><div className="panel-heading"><h2><History size={18}/>Live response timeline</h2><span className="meta">{events.length} EVENTS · MOST RECENT FIRST</span></div>{events.slice(0,expanded?150:8).map((a,n)=><div className="operation-event" key={a.id}><span className={'event-node '+(n===0?'latest':'')}><Check size={13}/></span><time dateTime={a.time}>{new Date(a.time).toISOString().slice(11,16)+' UTC'}<small>{new Date(a.time).toISOString().slice(0,10)}</small></time><div><h3>{a.title}</h3><p>{a.detail}</p></div></div>)}{!events.length&&<div className="summary-empty"><Clock size={22}/><p>Report submissions, mission decisions, and resource assignments will appear here.</p></div>}{events.length>8&&<button className="command-panel-link" onClick={()=>setExpanded(!expanded)}>{expanded?'Show recent updates':`Show all ${events.length} events`}</button>}</section>;
}
