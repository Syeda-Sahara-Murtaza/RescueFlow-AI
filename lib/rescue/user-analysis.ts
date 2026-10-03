import type {Incident, Report, Resource, Severity, Coordinates, LiveAnalysis} from './model';

const trim=(s:string,n=200)=>s.trim().slice(0,n);
const negative=/\b(?:no|not|without|none|false alarm|drill|exercise)\b/i;
/** Conservative, input-derived fallback. No emergency-type dispatch rules or invented facts. */
export function fallbackAnalysis(rawText:string,locationHint:string,resources:Resource[]):LiveAnalysis{
  const sentences=rawText.split(/(?<=[.!?])\s+|\n+/).map(s=>trim(s,400)).filter(Boolean);
  const medical=sentences.some(s=>!negative.test(s)&&/\b(medical|injur\w*|unconscious|bleeding|not breathing|ambulance)\b/i.test(s));
  const danger=sentences.some(s=>!negative.test(s)&&/\b(trapped|unconscious|collapsed|collapse|severe|life.threatening|not breathing)\b/i.test(s));
  const worsening=sentences.some(s=>!negative.test(s)&&/\b(worsening|spreading|rising|getting worse|escalat\w*)\b/i.test(s));
  const people=[...rawText.matchAll(/\b(?:\d+|one|two|three|four|five|several|many|multiple|dozens of|hundreds of)\s+(?:families|people|persons|children|adults|residents|workers|passengers)\b/gi)].map(m=>m[0]);
  const named=rawText.match(/\b(?:near|at|in)\s+((?:[A-Z][\p{L}\d'-]*|\d+)(?:\s+(?:[A-Z][\p{L}\d'-]*|\d+)){0,5})/u)?.[1];
  const location=locationHint.trim()||named||null;
  const level:Severity=danger?'Critical':medical||worsening?'High':'Medium';
  const evidence=sentences.filter(s=>/trapped|medical|injur|wors|spread|collapse|people|families/i.test(s)).slice(0,3);
  const requiredResources=[{resourceId:'team',quantity:1},...(medical?[{resourceId:'medical',quantity:1}]:[])].filter(r=>resources.some(x=>x.id===r.resourceId));
  return {extraction:{location,peopleAffected:people.length?[...new Set(people)].join('; '):'Not stated',hazard:trim(sentences[0]??rawText,140),urgency:level,medicalRisk:medical?'Reported':'Unknown',escalation:worsening?'Worsening reported':'Not confirmed',confidence:0},assessment:{severity:level,factors:[...(evidence.length?evidence:sentences.slice(0,1)).map(s=>`Reported: ${trim(s,220)}`),'Limited rule-based extraction; a coordinator must confirm the situation.']},mission:{title:'Assess reported emergency',objective:`Confirm the reported situation${location?` at ${location}`:''}, establish responder safety, and coordinate assistance for: ${trim(rawText,450)}`,requiredResources,specialistNeeds:['Coordinator to identify specialist capability from the original report.'],suggestedRoute:[],estimatedResponseTime:null,priority:level}};
}
export function normalize(value:string){return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
export function relatedReport(a:Report,b:Report){
  if(a.origin!=='user'||b.origin!=='user'||!a.location||a.location==='Location not specified'||normalize(a.location)!==normalize(b.location))return false;
  if(Math.abs(Date.parse(a.timestamp)-Date.parse(b.timestamp))>2*60*60*1000)return false;
  const words=(t:string)=>new Set(normalize(t).split(' ').filter(w=>w.length>3));
  const x=words(a.rawText),y=words(b.rawText),intersection=[...x].filter(w=>y.has(w)).length;
  return normalize(a.extractedInformation.hazard)===normalize(b.extractedInformation.hazard)&&intersection/Math.max(x.size,y.size,1)>=.6;
}
export function priorityFactors(report:Report,level:Severity){
  const known=report.extractedInformation.people!=='Not stated';
  return [{label:'People affected',value:known?15:0,max:25},{label:'Medical risk',value:report.extractedInformation.medical==='Reported'?25:0,max:25},{label:'Hazard severity',value:({Critical:20,High:15,Medium:10,Low:5})[level],max:20},{label:'Escalation',value:/wors|spread|ris|escalat/i.test(report.escalation??'')?15:0,max:15},{label:'Evidence support',value:0,max:15}];
}
export function geographicPoint(coordinates:Coordinates){return {x:(coordinates.longitude+180)/360*100,y:(90-coordinates.latitude)/180*100}}
export function mergeExactDuplicate(incident:Incident,report:Report):Incident{return {...incident,evidence:[...incident.evidence,report.id]};}
