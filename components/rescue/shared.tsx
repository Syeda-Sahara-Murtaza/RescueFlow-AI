'use client';
import { useEffect, useRef, useState } from 'react';
import { Activity, MapPin, Plus, Minus, LocateFixed, ShieldCheck, Radio, BrainCircuit, Layers3, Flame, Target, Check, Navigation, Anchor } from 'lucide-react';
import { useRescue } from './provider';
import {GeographicInset} from './geographic-inset';
import type { Incident } from '@/lib/rescue/model';
export function Brand() { return <a href="/" className="brand" aria-label="RescueFlow AI home"><span className="brand-mark"><Activity size={24}/></span><span>rescueflow<span className="brand-ai">AI</span></span></a>; }
export function Badge({ children, tone = 'cyan' }: {
    children: React.ReactNode;
    tone?: string;
}) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Status() { const {ready,error}=useRescue(); return <span className="system-status" style={error?{color:"#edbf74"}:undefined}><i style={error?{background:"#edbf74"}:undefined}/>{error?"CONNECTION DEGRADED":ready?"SYSTEM OPERATIONAL":"SYSTEM INITIALIZING"}</span>; }
export function Responsible() { return <p className="responsible"><ShieldCheck size={16}/>AI assists emergency coordinators by organizing information and generating recommendations. Final response decisions remain with authorized human responders.</p>; }
export const stageIcons = [Radio, BrainCircuit, Layers3, Flame, Target, Check];
export function Pipeline() { return <div className="pipeline">{['Messy reports', 'AI extraction', 'Verification', 'Severity', 'Priority', 'Mission'].map((s, i) => { const Icon = stageIcons[i]; return <div className="pipeline-step" key={s}><span className={'pipeline-icon step-' + i}><Icon size={21}/></span><span>{s}</span>{i < 5 && <i className="pipe-connector"/>}</div>; })}</div>; }
export function Cursor() { const ref = useRef<HTMLDivElement>(null); useEffect(() => { document.documentElement.dataset.glow = localStorage.getItem('rf-glow') === 'off' ? 'off' : 'on'; if (matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches)
    return; const move = (e: PointerEvent) => { const el = ref.current; if (!el)
    return; el.style.opacity = '1'; el.style.transform = `translate3d(${e.clientX - 18}px,${e.clientY - 18}px,0) scale(${(e.target as HTMLElement).closest('button,a,.panel') ? 1.35 : 1})`; }; const hide = () => { if (ref.current)
    ref.current.style.opacity = '0'; }; window.addEventListener('pointermove', move); document.addEventListener('pointerleave', hide); return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', hide); }; }, []); return <div ref={ref} className="cursor-glow" aria-hidden="true"/>; }
export function IncidentMap({ onSelect, compact = false }: {
    onSelect: (i: Incident) => void;
    compact?: boolean;
}) {
    const { state } = useRescue();
    const [zoom, setZoom] = useState(1);
    if(!state.incidents.some(i=>i.origin!=='user'))return <GeographicInset incidents={state.incidents} onSelect={onSelect}/>;
    return <><div className={`incident-map ${compact ? 'compact-map' : ''}`}>
 <div className="map-top"><span><i /> LIVE INCIDENT MAP</span><span>SIMULATED REGION</span></div>
 <svg viewBox="0 0 700 430" className="map-svg" role="img" aria-label="Schematic map showing Village A flood, Village B blocked road, and Sector 4 resources">
 <defs><pattern id="map-grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M 35 0 L 0 0 0 35" fill="none" stroke="#203133" strokeWidth=".6"/></pattern><pattern id="flood-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="8" stroke="#cc6553" strokeWidth="2" opacity=".15"/></pattern></defs>
 <rect width="700" height="430" fill="#101b1d"/><rect width="700" height="430" fill="url(#map-grid)"/>
 <g style={{ transform: `scale(${zoom})`, transformOrigin: '350px 215px', transition: 'transform .3s' }}>
 <path d="M-20 150 70 180 120 168 180 209 234 214 298 254 371 265 440 303 501 312 562 362 630 344 720 401" stroke="#173e44" strokeWidth="40" fill="none"/><path d="M-20 150 70 180 120 168 180 209 234 214 298 254 371 265 440 303 501 312 562 362 630 344 720 401" stroke="#38636a" strokeWidth="1" strokeDasharray="6 6" fill="none"/>
 <g stroke="#394649" strokeWidth="4" fill="none"><path d="M-20 305 110 290 193 235 256 166 377 170 470 120 580 80 710 90"/><path d="M115 0 140 100 256 166 285 290 358 440"/><path d="M360 0 377 170 452 212 550 221 720 262"/><path d="M0 88 140 100 210 63 360 66 470 120 452 212 476 430"/></g>
 <g stroke="#28373a" strokeWidth="1.5" fill="none"><path d="M0 45H700M0 340H440M200 0V140M580 0V310M630 0V430M330 90V230M50 0V430M95 0V165M500 0V130"/><path d="M285 35 325 110 410 110M170 275 155 350 275 382M470 40 520 180 630 160"/></g>
 <ellipse cx="278" cy="183" rx="107" ry="67" fill="url(#flood-hatch)" stroke="#cd6b57" strokeDasharray="4 6" opacity=".8"/>
 <path d="M130 330 193 235 256 166" stroke="#4cdec9" strokeWidth="2" strokeDasharray="5 5" fill="none" className="route-path"/>
 <g fill="#718c91" fontSize="12" fontFamily="monospace"><text x="52" y="57">NORTH SECTOR</text><text x="515" y="396">EAST FLOODPLAIN</text><text x="360" y="322" transform="rotate(25 360 322)">RIVER CORRIDOR</text><text x="365" y="57">SECTOR 2</text></g>
 <g transform="translate(130 330)"><rect x="-8" y="-8" width="16" height="16" rx="4" fill="#53deca"/><path d="M-4 0H4M0-4V4" stroke="#0c2925" strokeWidth="2"/><text x="20" y="4" fill="#b3cdc9" fontSize="13">Command Center</text></g>
 <g transform="translate(190 238)"><circle r="6" fill="#50b7dc"/><text x="-60" y="-16" fill="#8babb2" fontSize="13">Sector 4 · {state.resources.find(r=>r.id==='boat')?.quantity??0} boats</text></g>
 </g></svg>
 {state.incidents.filter(i=>i.origin!=='user').map((incident, i) => <button key={incident.id} className={`map-marker ${incident.status === 'Resolved' ? 'resolved' : i === 0 ? 'critical' : 'high'}`} style={{ left: `${50 + ((i === 0 ? 38 : 75) - 50) * zoom}%`, top: `${50 + ((i === 0 ? 40 : 27) - 50) * zoom}%` }} onClick={() => onSelect(incident)} aria-label={`Open ${incident.title}`}><span className="marker-dot"/><span className="marker-label">{incident.location}<small>{incident.status === 'Resolved' ? 'RESOLVED' : incident.severity.toUpperCase()}</small></span></button>)}
 <div className="map-controls"><button aria-label="Zoom in" disabled={zoom >= 1.4} onClick={() => setZoom(Math.min(1.4, zoom + .2))}><Plus size={16}/></button><button aria-label="Zoom out" disabled={zoom <= .8} onClick={() => setZoom(Math.max(.8, zoom - .2))}><Minus size={16}/></button><button aria-label="Reset map zoom" onClick={() => setZoom(1)}><LocateFixed size={16}/></button></div>
 <div className="map-bottom"><span><i className="red-dot"/>Critical</span><span><i className="orange-dot"/>High</span><span><i className="yellow-dot"/>Medium</span><span><i className="green-dot"/>Resolved</span><span className="map-scale">0 ━━ 2 km</span></div>
 </div>{!compact&&<GeographicInset incidents={state.incidents} onSelect={onSelect}/>}</>;
}
export function IncidentCard({ incident, onClick }: {
    incident: Incident;
    onClick: () => void;
}) { return <button onClick={onClick} className={`incident-card ${incident.severity.toLowerCase()}`}><div className="row-between"><Badge tone={incident.status === 'Resolved' ? 'green' : incident.severity === 'Critical' ? 'red' : 'amber'}>{incident.status === 'Resolved' ? 'Resolved' : incident.severity}</Badge><span className="meta">{incident.id}</span></div><h3>{incident.title}</h3><div className="incident-facts"><span><MapPin size={14}/>{incident.location}</span><span>{incident.peopleAffected}</span><span>{incident.evidence.length} linked reports</span></div><div className="incident-tags">{incident.origin==='user'&&<span>Unverified user report</span>}{incident.medicalRisk && <span className="red-text">Medical emergency</span>}<span>{incident.escalation}</span></div><div className="recommendation"><Navigation size={15}/><span>{incident.recommendedAction}</span><span className="small-caret">›</span></div></button>; }
export function ResourceLabel({ name, count }: {
    name: string;
    count: number;
}) { return <span className="resource-chip"><Anchor size={14}/>{count} {name}</span>; }
