export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Coordinates = {latitude:number;longitude:number;label:string;city?:string;country?:string;source:'Open-Meteo / GeoNames'|'User coordinates';precision:'Locality center'|'User supplied'};
export type LocationResolution = {status:'located'|'missing'|'ambiguous'|'unavailable'|'unresolved';coordinates?:Coordinates;message:string};
export type LiveAnalysis = {extraction:{location:string|null;peopleAffected:string;hazard:string;urgency:Severity;medicalRisk:'Reported'|'Not reported'|'Unknown';escalation:string;confidence:number};assessment:{severity:Severity;factors:string[]};mission:{title:string;objective:string;requiredResources:{resourceId:string;quantity:number}[];specialistNeeds:string[];suggestedRoute:string[];estimatedResponseTime:number|null;priority:Severity}};
export type UserContext = {kind:'user';analysis:LiveAnalysis;mode:'LIVE'|'DEMO';locationHint:string;timestamp:string};
export type Report = {
    id: string;
    origin?: 'user';
    aiMode?: 'LIVE' | 'DEMO';
    escalation?:string;
    rawText: string;
    source: string;
    timestamp: string;
    location: string;
    city?: string;
    country?: string;
    extractedInformation: {
        people: string;
        hazard: string;
        medical: string;
        urgency: string;
    };
    confidence: number;
    incidentId: string;
    related: boolean;
    status: string;
};
export type Incident = {
    id: string;
    title: string;
    location: string;
    city?: string;
    country?: string;
    reportedAt?: string;
    severity: Severity;
    peopleAffected: string;
    medicalRisk: boolean;
    escalation: string;
    evidence: string[];
    confidence: number;
    priorityScore: number;
    status: string;
    recommendedAction: string;
    origin?: 'user';
    aiMode?: 'LIVE' | 'DEMO';
    hazard?:string;
    evidenceFactors?:string[];
    locationResolution?:LocationResolution;
    relatedIncidentIds?:string[];
    factors: {
        label: string;
        value: number;
        max: number;
    }[];
};
export type Resource = {
    id: string;
    type: string;
    quantity: number;
    availableQuantity?:number;
    location: string;
    status: string;
    eta: number;
    assignedMission: string[];
};
export const lifecycle = ['Generated', 'Awaiting approval', 'Approved', 'Resource assigned', 'In progress', 'Completed', 'Resolved'] as const;
export type Mission = {
    id: string;
    incidentId: string;
    title: string;
    objective: string;
    requiredResources: Record<string, number>;
    assignedResources: Record<string, number>;
    priority: Severity;
    status: string;
    approvalStatus: string;
    createdAt: string;
    eta: number|null;
    origin?:'user';
    specialistNeeds?:string[];
    route: string[];
};
export type Activity = {
    id: string;
    time: string;
    title: string;
    detail: string;
};
export type State = {
    reports: Report[];
    incidents: Incident[];
    resources: Resource[];
    missions: Mission[];
    activity: Activity[];
    revision: number;
    simulationLoaded?: boolean;
    lastAnalysis?:{requestId:string;reportId:string;incidentId:string;missionId:string;mode:'LIVE'|'DEMO';message:string;fallbackReason?:string};
};
export type Action = {
    type: 'approve' | 'reject' | 'advance' | 'modify' | 'assign' | 'reset' | 'analyze' | 'simulate' | 'remove-simulation';
    reportText?:string;
    locationHint?:string;
    city?:string;
    country?:string;
    requestId?:string;
    id?: string;
    objective?: string;
    resourceId?: string;
    quantity?: number;
    requiredResources?: Record<string, number>;
};
export const rawReports = ['Water entered houses in Village A.', '40 families trapped near Village A.', 'Road blocked close to Village B.', 'Medical emergency reported in Village A.', 'Flood getting worse in Village A.'];
export function available(state: State, id: string) { const r = state.resources.find(r => r.id === id); return (r?.quantity ?? 0) - state.missions.reduce((sum, m) => sum + (m.assignedResources[id] ?? 0), 0); }
export function activeMission(m: Mission) { return ['Approved', 'Resource assigned', 'In progress'].includes(m.status); }
