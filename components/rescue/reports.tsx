'use client';
import {useState} from 'react';
import {MapPin,Radio,Search} from 'lucide-react';
import {useRescue} from './provider';
import {Badge} from './shared';
import {NewEmergency} from './new-emergency';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
export function Reports(){
  const{state}=useRescue();const[filter,setFilter]=useState('All'),[location,setLocation]=useState('All locations'),[search,setSearch]=useState('');
  const reports=state.reports.filter(r=>(filter==='All'||filter==='User reports'&&r.origin==='user'||filter==='Simulation'&&r.origin!=='user'||filter==='Related'&&r.related)&&(location==='All locations'||r.location===location)&&r.rawText.toLowerCase().includes(search.toLowerCase()));
  return <><NewEmergency/><div className="filter-bar"><Tabs value={filter} onValueChange={setFilter}><TabsList className="filter-tabs">{['All','User reports','Related','Simulation'].map(f=><TabsTrigger key={f} value={f}>{f}</TabsTrigger>)}</TabsList></Tabs><div className="filter-right"><div className="search-field"><Search size={16}/><input aria-label="Search raw reports" placeholder="Search received information…" value={search} onChange={e=>setSearch(e.target.value)}/></div><Select value={location} onValueChange={setLocation}><SelectTrigger aria-label="Filter reports by location"><SelectValue/></SelectTrigger><SelectContent>{['All locations',...new Set(state.reports.map(r=>r.location))].map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="raw-report-list">{[...reports].reverse().map(r=><article className="panel raw-report" key={r.id}><div className="row-between"><span className="report-identifier" title={r.id}>{r.id}</span><Badge tone={r.origin==='user'?'cyan':'amber'}>{r.origin==='user'?r.status:'SIMULATION'}</Badge></div><blockquote>“{r.rawText}”</blockquote><div className="raw-report-meta"><span><Radio size={14}/>{r.source}</span><time dateTime={r.timestamp}>{new Date(r.timestamp).toISOString().slice(0,16).replace('T',' ')+' UTC'}</time><span><MapPin size={14}/>{r.location}</span><span>{r.extractedInformation.hazard}</span>{r.related&&<Badge tone="neutral">Related report</Badge>}</div><a className="text-link" href={'/incidents?incident='+encodeURIComponent(r.incidentId)}>View related incident</a></article>)}</div>
    {!reports.length&&<div className="empty-state"><Radio size={28}/><h3>{state.reports.length?'No reports match these filters':'No incoming reports yet'}</h3><p>{state.reports.length?'Adjust your search or location filter.':'Submit what happened, where it happened, and any reported needs.'}</p>{state.reports.length>0&&<button className="btn secondary" onClick={()=>{setFilter('All');setSearch('');setLocation('All locations')}}>Clear filters</button>}</div>}
  </>;
}
