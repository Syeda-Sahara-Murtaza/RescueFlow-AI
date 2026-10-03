'use client';
import { useEffect, useState } from 'react';
import { Play, RotateCcw, Check, BrainCircuit, Layers3, ShieldCheck, Radio } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useRescue } from './provider';
import { Badge } from './shared';
import { MissionCard } from './mission';
import { rawReports } from '@/lib/rescue/model';
export function Simulation({ open, onOpenChange }: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const { state,error,reload } = useRescue();
    const mission=state.missions.find(m=>m.id==='RF-001');
    const [step, setStep] = useState(0), [running, setRunning] = useState(true);
    useEffect(() => { if (open) {
        setStep(0);
        setRunning(true);
    } }, [open]);
    useEffect(() => { if (!open || !running || step >= 10)
        return; const timer = setTimeout(() => setStep(s => s + 1), step < 5 ? 850 : 1400); return () => clearTimeout(timer); }, [step, open, running]);
    const phase = step < 5 ? 0 : step === 5 ? 1 : step === 6 ? 2 : step === 7 ? 3 : 4;
    return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="rf-dialog simulation-dialog"><div className="row-between"><Badge><Radio size={13}/>LIVE EMERGENCY SIMULATION</Badge><span className="meta mr-8">DEMO DATA ONLY</span></div><DialogTitle className="sim-title">Watch chaos become a response plan.</DialogTitle><DialogDescription>Five sample reports, two incidents, and three missions are saved across your workspace. Human approval remains required.</DialogDescription><div className="sim-steps">{['Collect', 'Analyze', 'Verify', 'Prioritize', 'Act'].map((s, i) => <div key={s} className={phase >= i ? 'active' : ''}><span>{phase > i ? <Check size={14}/> : i + 1}</span>{s}</div>)}</div>{error&&<div className="error-banner" role="alert">{error}<button onClick={reload}>Retry connection</button></div>}<Progress value={step * 10}/><div className="simulation-grid"><div><h4><Radio size={16}/> INCOMING SIGNALS <span>{Math.min(step + 1, 5)}/5</span></h4><div className="sim-reports">{rawReports.slice(0, Math.min(step + 1, 5)).map((r, i) => <div key={r} className={'sim-report ' + (step >= 6 && i !== 2 ? 'linked' : '')}><span>0{i + 1}</span><p>{r}</p>{step >= 5 && <Check size={15}/>}</div>)}</div><div className="sim-engine"><BrainCircuit size={22}/><div><strong>{step < 5 ? 'Listening to incoming reports' : step === 5 ? 'Extracting locations, hazards & needs' : step === 6 ? 'Linking reports by location and event' : step === 7 ? 'Ranking severity and matching resources' : 'Analysis complete · review the plan'}</strong><small>Deterministic scenario engine · illustrative confidence</small></div></div></div><div className="sim-output" aria-live="polite">{step < 6 ? <div className="scanning"><div className="scan-orbit"><BrainCircuit size={36}/></div><h3>{step < 5 ? 'Listening. Connecting. Understanding.' : 'Turning words into structured evidence.'}</h3><p className="muted">Reports appear first. Recommendations follow the evidence.</p></div> : <><div className="sim-result-counts"><div><strong>5</strong><small>REPORTS</small></div><span>→</span><div><strong>2</strong><small>VERIFIED INCIDENTS</small></div><span>→</span><div><strong>{step >= 8 ? '3' : '—'}</strong><small>PRIORITIZED MISSIONS</small></div></div>{step < 8 ? <div className="cluster-result"><Layers3 /><h3>Two incident clusters</h3><p>Village A · 4 linked reports</p><p>Village B · 1 report</p><small>Scenario verified. Independent field confirmation remains necessary.</small></div> : <><div className="sim-critical"><Badge tone="red">CRITICAL — VILLAGE A</Badge><p>40 families trapped · Medical emergency · Flood worsening</p></div>{mission&&<MissionCard mission={mission}/>}</>}</>}</div></div><div className="sim-footer"><a className="btn secondary" href="/command-center">Open Command Center</a><span><ShieldCheck size={15}/>No real dispatch. All missions require human approval.</span><div><button className="btn subtle" onClick={() => { setStep(0); setRunning(true); }}><RotateCcw size={14}/>Replay</button>{step < 10 && <button className="btn subtle" onClick={() => setRunning(!running)}>{running ? 'Pause' : 'Resume'}</button>}{step < 10 && <button className="btn secondary" onClick={() => setStep(10)}><Play size={14}/>Show result</button>}</div></div></DialogContent></Dialog>;
}
