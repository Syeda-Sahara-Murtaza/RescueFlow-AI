import {activeMission,available,type State,type Incident,type Mission} from './model';
export const severityRank={Critical:4,High:3,Medium:2,Low:1};
export function priorityOrder(a:Incident,b:Incident){return severityRank[b.severity]-severityRank[a.severity]||b.priorityScore-a.priorityScore}
export function operations(state:State){
  const incidents=state.incidents.filter(i=>i.status!=='Resolved').sort(priorityOrder);
  const active=state.missions.filter(activeMission);
  const free=state.resources.reduce((n,r)=>n+available(state,r.id),0);
  const assigned=state.missions.reduce((n,m)=>n+Object.values(m.assignedResources).reduce((s,q)=>s+q,0),0);
  return {incidents,critical:incidents.filter(i=>i.severity==='Critical'),active,free,assigned,pending:state.missions.filter(m=>m.approvalStatus==='Pending'),inProgress:active.filter(m=>m.status==='In progress'),level:incidents[0]?.severity??null};
}
export function resourceMatch(state:State,mission:Mission){const requirements=Object.entries(mission.requiredResources);return requirements.length>0&&requirements.every(([id,n])=>available(state,id)+(mission.assignedResources[id]??0)>=n)}
export function confidenceLabel(i:Incident){return i.origin==='user'&&i.aiMode==='DEMO'?'Not assessed':`${i.confidence}%${i.origin==='user'?' estimate':' demo'}`}
export const resourceCapabilities:Record<string,string>={boat:'Water rescue and evacuation',ambulance:'Patient transport',team:'Rescue assessment and field support',medical:'On-site medical support',helicopter:'Aerial rescue support',supplies:'Food, water and relief materials'};
