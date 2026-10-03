'use client';
import {useEffect,useRef,useState} from 'react';
import {Plus,LoaderCircle} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useRescue} from './provider';

export function NewEmergency(){
  const{state,act,busy,ready,actionError}=useRescue();
  const[open,setOpen]=useState(false),[description,setDescription]=useState(''),[city,setCity]=useState(''),[country,setCountry]=useState('');
  const[submitted,setSubmitted]=useState(false),[attempted,setAttempted]=useState(false);
  const requestId=useRef('');
  useEffect(()=>{if(new URLSearchParams(window.location.search).get('new')==='1')setOpen(true);},[]);
  useEffect(()=>{
    const result=state.lastAnalysis;
    if(submitted&&result?.requestId===requestId.current)window.location.assign('/command-center?incident='+encodeURIComponent(result.incidentId)+'&submitted=1#incident-map');
  },[submitted,state.lastAnalysis]);
  const changed=()=>{requestId.current='';setAttempted(false);};
  return <><div className="report-intake-bar"><p>Original messages are kept as received. Their assessment is linked to the related incident.</p><button className="btn primary" onClick={()=>{setAttempted(false);setOpen(true);}}><Plus size={16}/>Report a New Emergency</button></div>
    <Dialog open={open} onOpenChange={value=>{if(!busy&&!submitted)setOpen(value);}}><DialogContent className="rf-dialog emergency-dialog"><DialogTitle>Report a New Emergency</DialogTitle><DialogDescription>Describe what happened and where. This planning app does not contact or dispatch emergency services.</DialogDescription>
      <form onSubmit={async e=>{e.preventDefault();requestId.current ||= crypto.randomUUID();setAttempted(true);if(await act({type:'analyze',reportText:description,city,country,requestId:requestId.current}))setSubmitted(true);}} className="emergency-form">
        <label className="field-label">Emergency description<textarea required minLength={15} maxLength={4000} rows={5} placeholder="What happened? Who is affected? What hazards or medical needs are reported?" value={description} onChange={e=>{setDescription(e.target.value);changed();}} disabled={busy||submitted}/></label>
        <div className="emergency-location-fields">
          <label className="field-label">City<input required maxLength={100} autoComplete="address-level2" placeholder="Lahore" value={city} onChange={e=>{setCity(e.target.value);changed();}} disabled={busy||submitted}/></label>
          <label className="field-label">Country<input required maxLength={100} autoComplete="country-name" placeholder="Pakistan" value={country} onChange={e=>{setCountry(e.target.value);changed();}} disabled={busy||submitted}/></label>
        </div>
        <p className="small-note">We locate the city automatically and open your emergency on the map after submission. Pins show the approximate city center.</p>
        {attempted&&!busy&&actionError&&<p className="emergency-form-error" role="alert">{actionError}</p>}
        <button className="btn primary" disabled={busy||submitted||!ready||description.trim().length<15||!city.trim()||!country.trim()} type="submit">{(busy||submitted)&&<LoaderCircle size={17} className="analyzing-spinner"/>}{submitted?'Opening incident map…':busy?'Locating and processing…':'Submit Report'}</button>
        {!ready&&<p className="small-note" role="status">Waiting for saved progress to connect. Your text stays here.</p>}
        <p className="small-note">City and country are sent to the location service. Live analysis sends the description to OpenAI; rule-based fallback remains available.</p>
      </form>
    </DialogContent></Dialog></>;
}
