'use client';
import {useEffect,useState} from 'react';
import {AlertTriangle,MapPin,Search,ShieldCheck} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {useRescue} from './provider';
import {Badge} from './shared';
import {confidenceLabel,priorityOrder} from '@/lib/rescue/selectors';
import type {Incident} from '@/lib/rescue/model';
export function Incidents({select}:{select:(i:Incident)=>void}){
  const{state}=useRescue();const[filter,setFilter]=useState('Open'),[search,setSearch]=useState('');
  useEffect(()=>{if(new URLSearchParams(window.location.search).get('severity')==='Critical')setFilter('Critical')},[]);
  const incidents=state.incidents.filter(i=>(filter==='All'||filter==='Open'&&i.status!=='Resolved'||filter==='Critical'&&i.severity==='Critical'&&i.status!=='Resolved'||filter==='Resolved'&&i.status==='Resolved')&&(i.title+' '+i.location).toLowerCase().includes(search.toLowerCase())).sort(priorityOrder);
  return <><div className="filter-bar"><Tabs value={filter} onValueChange={setFilter}><TabsList className="filter-tabs">{['Open','Critical','Resolved','All'].map(f=><TabsTrigger key={f} value={f}>{f}</TabsTrigger>)}</TabsList></Tabs><div className="search-field"><Search size={16}/><input aria-label="Search incidents" value={search} placeholder="Find an incident or location…" onChange={e=>setSearch(e.target.value)}/></div></div><p className="small-note">Ordered by severity, then AI-assisted priority score. Open an incident to review its analysis, supporting evidence, and score factors.</p>
    <div className="incident-intelligence-grid">{incidents.map(i=><button className="panel incident-intelligence-card" key={i.id} onClick={()=>select(i)}><div className="row-between"><Badge tone={i.status==='Resolved'?'green':i.severity==='Critical'?'red':'amber'}>{i.status==='Resolved'?'Resolved':i.severity}</Badge><span className="incident-card-id" title={i.id}>{i.id}</span></div><h2>{i.title}</h2><p><MapPin size={15}/>{i.location}</p><div className="incident-analysis-stats"><div><small>PRIORITY SCORE</small><strong>{i.priorityScore}<span>/100</span></strong></div><div><small>CONFIDENCE</small><strong>{confidenceLabel(i)}</strong></div><div><small>EVIDENCE</small><strong>{i.evidence.length} report{i.evidence.length===1?'':'s'}</strong></div></div><div className="row-between"><span className="incident-type">{i.hazard??(i.id==='INC-001'?'Flood':'Road obstruction')}</span><Badge tone="neutral">{i.status}{i.origin==='user'?'':' · demo'}</Badge></div><div className="incident-review-link"><ShieldCheck size={16}/>Review evidence & priority factors</div></button>)}</div>
    {!incidents.length&&<div className="empty-state"><AlertTriangle size={28}/><h3>No incidents in this view</h3><p>Incidents are identified from your submitted reports or an explicitly started simulation.</p><a href="/reports?new=1" className="btn secondary">Submit a report</a></div>}
  </>;
}
