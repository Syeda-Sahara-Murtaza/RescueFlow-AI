import { rawReports, type Report, type Incident, type Mission, type State, type Resource, type UserContext, type LiveAnalysis } from './model';
import {fallbackAnalysis,normalize,relatedReport,priorityFactors,mergeExactDuplicate} from './user-analysis';
/** Deterministic scenario adapter. Confidence is illustrative, not calibrated AI probability. */
export const aiService = {
    extractReport(rawText: string, index: number | UserContext): Report {
        if(typeof index!=='number'){
            const x=index.analysis.extraction;
            return {id:'R-'+crypto.randomUUID(),rawText,source:'User report',timestamp:index.timestamp,location:index.locationHint.trim()||x.location||'Location not specified',extractedInformation:{people:x.peopleAffected,hazard:x.hazard,medical:x.medicalRisk,urgency:x.urgency},confidence:index.mode==='LIVE'?x.confidence:0,incidentId:'',related:false,status:'Analyzed',origin:'user',aiMode:index.mode,escalation:x.escalation};
        }
        const b = /Village B/i.test(rawText);
        const trapped = /40 families/i.test(rawText);
        const medical = /medical/i.test(rawText);
        return { id: `R-${String(index + 1).padStart(3, '0')}`, rawText, source: ['Citizen SMS', 'Responder radio', 'Field volunteer', 'Medical hotline', 'Citizen SMS'][index] ?? 'Demo input', timestamp: `2026-10-01T14:${String(30 + index * 2).padStart(2, '0')}:00Z`, location: b ? 'Village B' : 'Village A', extractedInformation: { people: trapped ? '40 families' : 'Not stated', hazard: b ? 'Road obstruction' : medical ? 'Medical emergency' : 'Flood', medical: medical ? 'Reported' : 'Unknown', urgency: medical || trapped ? 'High' : 'Medium' }, confidence: trapped ? 94 : medical ? 93 : 91, incidentId: b ? 'INC-002' : 'INC-001', related: index > 0 && !b, status: 'Verified' };
    },
    detectDuplicates(reports: Report[], incoming?:Report) {
        if(incoming){const candidate=reports.find(r=>relatedReport(r,incoming)&&normalize(r.rawText)===normalize(incoming.rawText));incoming.incidentId=candidate?.incidentId??('INC-'+crypto.randomUUID());incoming.related=!!candidate;}
        return Object.values(reports.reduce<Record<string, Report[]>>((acc, r) => { (acc[r.incidentId] ??= []).push(r); return acc; }, {})); },
    assessSeverity(reports: Report[], analysis?:LiveAnalysis): Incident {
        if(analysis){const r=reports[0];const factors=priorityFactors(r,analysis.assessment.severity);return {id:r.incidentId,title:analysis.mission.title+' · '+r.location,location:r.location,severity:analysis.assessment.severity,peopleAffected:r.extractedInformation.people,medicalRisk:r.extractedInformation.medical==='Reported',escalation:r.escalation??'Unknown',evidence:reports.map(r=>r.id),confidence:r.confidence,priorityScore:factors.reduce((s,f)=>s+f.value,0),status:'Unverified',recommendedAction:analysis.mission.title,factors,origin:'user',aiMode:r.aiMode,hazard:r.extractedInformation.hazard,evidenceFactors:analysis.assessment.factors};}

        const a = reports[0].location === 'Village A';
        const factors = a ? [{ label: 'People affected', value: 25, max: 25 }, { label: 'Medical risk', value: 25, max: 25 }, { label: 'Hazard severity', value: 20, max: 20 }, { label: 'Escalation', value: 15, max: 15 }, { label: 'Evidence support', value: 11, max: 15 }] : [{ label: 'People affected', value: 0, max: 25 }, { label: 'Medical risk', value: 0, max: 25 }, { label: 'Hazard severity', value: 20, max: 20 }, { label: 'Escalation', value: 5, max: 15 }, { label: 'Evidence support', value: 8, max: 15 }];
        return { id: a ? 'INC-001' : 'INC-002', title: a ? 'Village A Flood Emergency' : 'Village B Access Obstruction', location: a ? 'Village A' : 'Village B', severity: a ? 'Critical' : 'High', peopleAffected: a ? '40 families' : 'Not confirmed', medicalRisk: a, escalation: a ? 'Worsening' : 'Monitoring', evidence: reports.map(r => r.id), confidence: a ? 96 : 78, priorityScore: factors.reduce((s, f) => s + f.value, 0), status: 'Verified', recommendedAction: a ? 'Deploy evacuation unit' : 'Clear emergency access road', factors };
    },
    generateMission(incident: Incident, resources?:Resource[], analysis?:LiveAnalysis): Mission[] {
        if(analysis){const m=analysis.mission;return [{id:'RF-'+crypto.randomUUID(),incidentId:incident.id,title:m.title,objective:m.objective,requiredResources:Object.fromEntries(m.requiredResources.filter(r=>resources?.some(x=>x.id===r.resourceId)).map(r=>[r.resourceId,r.quantity])),assignedResources:{},priority:incident.severity,status:'Awaiting approval',approvalStatus:'Pending',createdAt:new Date().toISOString(),eta:null,route:m.suggestedRoute.length?m.suggestedRoute:['Coordinator to confirm departure point',incident.location],origin:'user',specialistNeeds:m.specialistNeeds}];}

        const base = { incidentId: incident.id, status: 'Awaiting approval', approvalStatus: 'Pending', createdAt: '2026-10-01T14:40:00Z' };
        if (incident.id === 'INC-001')
            return [{ ...base, assignedResources: {}, id: 'RF-001', title: 'Deploy Evacuation Unit', objective: 'Evacuate 40 trapped families and provide medical assistance.', requiredResources: { boat: 2, ambulance: 1, team: 1, medical: 1 }, priority: 'Critical', eta: 18, route: ['Command Center', 'Sector 4', 'Village A'] }, { ...base, assignedResources: {}, id: 'RF-002', title: 'Establish Medical & Relief Point', objective: 'Set up a safe reception point with medical support and essential relief supplies for evacuated families.', requiredResources: { medical: 1, supplies: 4 }, priority: 'High', eta: 24, route: ['Command Center', 'Sector 2', 'Village A safe zone'] }];
        return [{ ...base, assignedResources: {}, id: 'RF-003', title: 'Restore Emergency Access', objective: 'Assess and clear the blocked road near Village B so emergency vehicles can pass.', requiredResources: { team: 1 }, priority: 'High', eta: 32, route: ['Command Center', 'East approach', 'Village B'] }];
    }
};
export async function analyzeNewEmergency(state:State,text:string,locationHint:string,requestId:string,live:((text:string,location:string,resources:Resource[])=>Promise<LiveAnalysis>)|null,geocode:(location:string)=>Promise<import('./model').LocationResolution>,place?:{city:string;country:string}):Promise<State>{
    let analysis:LiveAnalysis,mode:'LIVE'|'DEMO'='DEMO',fallbackReason='';
    try{if(!live)throw Object.assign(new Error('No live adapter'),{reason:'missing_key'});analysis=await live(text,locationHint,state.resources);mode='LIVE'}catch(error){
        const code=(error as {reason?:string})?.reason;
        const safe=['missing_key','rate_limit_or_quota','insufficient_quota','rate_limit_exceeded','invalid_api_key','model_not_found','invalid_json_schema','schema_validation','provider_rejected','incomplete_response','invalid_structured_output','network_or_timeout'];
        fallbackReason=code&&safe.includes(code)?code:'unavailable';analysis=fallbackAnalysis(text,locationHint,state.resources);
    }
    if(!locationHint.trim()&&analysis.extraction.location&&!normalize(text).includes(normalize(analysis.extraction.location)))analysis.extraction.location=null;
    const timestamp=new Date().toISOString();
    const report=aiService.extractReport(text,{kind:'user',analysis,mode,locationHint,timestamp});
    if(place){report.city=place.city;report.country=place.country;}
    // Only exact repeat wording at the same location/time is automatically grouped.
    const unresolved=state.reports.filter(r=>state.incidents.find(i=>i.id===r.incidentId)?.status!=='Resolved');
    aiService.detectDuplicates(unresolved,report);
    const next:State=structuredClone(state);
    let incident=next.incidents.find(i=>i.id===report.incidentId);
    let mission=next.missions.find(m=>m.incidentId===report.incidentId);
    if(incident){incident=mergeExactDuplicate(incident,report);next.incidents=next.incidents.map(i=>i.id===incident!.id?incident!:i)}
    else{incident=aiService.assessSeverity([report],analysis);incident.locationResolution=await geocode(report.location);incident.relatedIncidentIds=[...new Set(unresolved.filter(r=>relatedReport(r,report)).map(r=>r.incidentId))];next.incidents.push(incident);mission=aiService.generateMission(incident,next.resources,analysis)[0];next.missions.push(mission)}
    if(place){incident.city=place.city;incident.country=place.country;if(!incident.locationResolution?.coordinates)incident.locationResolution=await geocode(report.location);}
    incident.reportedAt ??= timestamp;
    next.reports.push(report);next.revision++;
    const reasonText:Record<string,string>={rate_limit_or_quota:'OpenAI returned a rate-limit or quota restriction. Retry later or check the API account limits.',missing_key:'The server API key is not available.',insufficient_quota:'The OpenAI account has insufficient API quota.',rate_limit_exceeded:'OpenAI is rate limiting requests.',invalid_api_key:'OpenAI could not authenticate the configured API key.',model_not_found:'The configured key cannot access the selected model.',network_or_timeout:'The live request timed out or could not connect.'};
    const message=mode==='LIVE'?'Live AI analysis complete. This report is unverified; review the recommendation.':'Live AI is unavailable. Demo AI used limited, rule-based extraction from your text. Review the original report and all unknown fields.';
    next.lastAnalysis={requestId,reportId:report.id,incidentId:incident.id,missionId:mission!.id,mode,message:message+(reasonText[fallbackReason]?' '+reasonText[fallbackReason]:''),...(mode==='DEMO'?{fallbackReason}:{})};
    next.activity.unshift({id:crypto.randomUUID(),time:timestamp,title:report.related?'Related report linked to existing incident':'New user report analyzed',detail:`AI mode: ${mode}. ${report.related?'Exact repeat; existing mission retained.':'New unverified incident and pending mission created.'} Human approval required.`});
    next.activity=next.activity.slice(0,150);return next;
}
export function createSeed(): State {
    const reports = rawReports.map((t, i) => aiService.extractReport(t, i));
    const incidents = aiService.detectDuplicates(reports).map(r => aiService.assessSeverity(r));
    return { revision: 0, reports, incidents, missions: incidents.flatMap(i => aiService.generateMission(i)), resources: [{ id: 'boat', type: 'Rescue Boats', quantity: 3, location: 'Sector 4', eta: 8 }, { id: 'ambulance', type: 'Ambulances', quantity: 2, location: 'Command Center', eta: 12 }, { id: 'team', type: 'Rescue Teams', quantity: 3, location: 'Sector 4', eta: 10 }, { id: 'medical', type: 'Medical Units', quantity: 2, location: 'Sector 2', eta: 14 }, { id: 'helicopter', type: 'Rescue Helicopter', quantity: 1, location: 'North airbase', eta: 25 }, { id: 'supplies', type: 'Relief Supplies', quantity: 12, location: 'Sector 2', eta: 16 }].map(r => ({ ...r, status: 'Available', assignedMission: [] })), activity: [{ id: 'a3', time: '2026-10-01T14:40:00Z', title: '3 mission recommendations generated', detail: 'Human approval required. No resources dispatched.' }, { id: 'a2', time: '2026-10-01T14:39:00Z', title: '5 reports grouped into 2 incidents', detail: 'Scenario verification complete; Village B has a single report and requires field confirmation.' }, { id: 'a1', time: '2026-10-01T14:38:00Z', title: 'Emergency scenario loaded', detail: 'Simulated reports only. Deterministic analysis engine ready.' }] };
}

// Normal sessions contain only submitted reports; the sample scenario is opt-in.
export function createWorkspace(): State {
    const state = createSeed();
    return {...state, reports:[], incidents:[], missions:[], activity:[]};
}
export function userWorkspace(input: State): State {
    if(input.simulationLoaded)return structuredClone(input);
    const state = structuredClone(input);
    state.reports = state.reports.filter(r => r.origin === 'user');
    state.incidents = state.incidents.filter(i => i.origin === 'user');
    state.missions = state.missions.filter(m => m.origin === 'user');
    const ids = new Set(state.missions.map(m => m.id));
    state.activity = state.activity.filter(a => !['a1','a2','a3'].includes(a.id) && !a.id.startsWith('sim-') && !/RF-00[123]/.test(a.title));
    state.resources.forEach(r => { r.assignedMission = r.assignedMission.filter(id => ids.has(id)); r.status = r.quantity > state.missions.reduce((sum,m)=>sum+(m.assignedResources[r.id]??0),0) ? 'Available' : 'Fully assigned'; });
    return state;
}
