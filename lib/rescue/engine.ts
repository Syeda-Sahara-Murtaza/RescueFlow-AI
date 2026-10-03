import { available, lifecycle, type State, type Action } from './model';
import { createWorkspace, createSeed, userWorkspace } from './ai-service';
export function transition(input: State, action: Action): State {
    const state: State = structuredClone(input);
    if (action.type === 'reset') {
        const fresh = createWorkspace();
        fresh.revision = state.revision + 1;
        return fresh;
    }
    if (action.type === 'simulate') {
        // Explicit opt-in only. Replaying never duplicates the sample or resets decisions.
        if(state.simulationLoaded)return state;
        const clean=userWorkspace(state),seed=createSeed(),now=Date.now();
        clean.simulationLoaded=true;
        clean.reports.push(...seed.reports.map((r,index)=>({...r,timestamp:new Date(now-(5-index)*60000).toISOString()})));
        clean.incidents.push(...seed.incidents);
        clean.missions.push(...seed.missions.map(m=>({...m,createdAt:new Date(now).toISOString()})));
        clean.activity.unshift(...[
            ['Resource matching complete','3 proposed plans matched to sample inventory. Approval is required before resources can be assigned.'],
            ['3 response missions generated','RF-001, RF-002 and RF-003 are awaiting human approval.'],
            ['2 incidents identified and prioritized','INC-001 is critical. Four reports link to Village A; one links to Village B.'],
            ['5 simulation reports received','Fictional flood-response scenario loaded by the coordinator.'],
        ].map(([title,detail],index)=>({id:'sim-'+crypto.randomUUID(),time:new Date(now-index*1000).toISOString(),title,detail})));
        clean.activity=clean.activity.slice(0,150);clean.revision=state.revision+1;return clean;
    }
    if(action.type === 'remove-simulation') {
        const clean=userWorkspace({...state,simulationLoaded:false});
        clean.revision=state.revision+1;return clean;
    }
    const m = state.missions.find(x => x.id === action.id);
    if (!m)
        throw new Error('Mission not found.');
    let detail = '';
    if (action.type === 'approve') {
        if (m.status !== 'Awaiting approval')
            throw new Error('Only pending missions can be approved.');
        if(m.origin==='user'&&!Object.values(m.requiredResources).some(n=>n>0))throw new Error('Use Modify to add at least one available inventory resource before approval.');
        for (const [id, n] of Object.entries(m.requiredResources))
            if (available(state, id) < n)
                throw new Error(`Insufficient ${state.resources.find(r => r.id === id)?.type}. Modify the mission or release resources first.`);
        m.status = 'Approved';
        m.approvalStatus = 'Approved';
        detail = 'Approved by coordinator. Resource assignment is the next step.';
    }
    else if (action.type === 'reject') {
        if (m.status !== 'Awaiting approval')
            throw new Error('Only pending missions can be rejected.');
        m.status = 'Rejected';
        m.approvalStatus = 'Rejected';
        detail = 'Recommendation rejected by coordinator.';
    }
    else if (action.type === 'modify') {
        if (m.status !== 'Awaiting approval')
            throw new Error('Only pending missions can be modified.');
        if (typeof action.objective !== 'string' || action.objective.trim().length < 10 || action.objective.length > 1000)
            throw new Error('Enter an objective between 10 and 1,000 characters.');
        if (action.requiredResources) {
            if (!Object.values(action.requiredResources).some(n => n > 0))
                throw new Error('Choose at least one resource.');
            for (const [id, n] of Object.entries(action.requiredResources)) {
                const r = state.resources.find(x => x.id === id);
                if (!r || !Number.isInteger(n) || n < 0 || n > r.quantity)
                    throw new Error('Resource quantities must be whole numbers within inventory limits.');
            }
            m.requiredResources = Object.fromEntries(Object.entries(action.requiredResources).filter(([, n]) => n > 0));
        }
        m.objective = action.objective.trim();
        detail = 'Objective and resource plan updated. Human approval still required.';
    }
    else if (action.type === 'assign') {
        if (m.status !== 'Approved')
            throw new Error('Approve the mission before assigning resources.');
        const id = action.resourceId ?? '';
        const n = action.quantity ?? 0;
        if (!Number.isInteger(n) || n < 1 || !state.resources.some(r => r.id === id))
            throw new Error('Choose a valid resource quantity.');
        if (n > (m.requiredResources[id] ?? 0) - (m.assignedResources[id] ?? 0))
            throw new Error('Quantity exceeds this mission’s remaining requirement.');
        if (available(state, id) < n)
            throw new Error('This resource is no longer available.');
        m.assignedResources[id] = (m.assignedResources[id] ?? 0) + n;
        if (Object.entries(m.requiredResources).every(([k, q]) => (m.assignedResources[k] ?? 0) >= q))
            m.status = 'Resource assigned';
        detail = `${n} ${state.resources.find(r => r.id === id)?.type} assigned.`;
    }
    else if (action.type === 'advance') {
        if (m.approvalStatus !== 'Approved')
            throw new Error('Human approval is required.');
        const i = lifecycle.findIndex(s => s === m.status);
        if (i < 2 || i >= lifecycle.length - 1)
            throw new Error('Mission cannot advance from this state.');
        if (m.status === 'Approved') {
            const needed = Object.entries(m.requiredResources).map(([id, n]) => [id, n - (m.assignedResources[id] ?? 0)] as const);
            for (const [id, n] of needed)
                if (available(state, id) < n)
                    throw new Error('Insufficient available resources. Recheck resource assignments.');
            m.assignedResources = { ...m.requiredResources };
        }
        m.status = lifecycle[i + 1];
        if (m.status === 'Completed')
            m.assignedResources = {};
        if (m.status === 'Resolved' && state.missions.filter(x => x.incidentId === m.incidentId).every(x => x.status === 'Resolved'))
            state.incidents.find(x => x.id === m.incidentId)!.status = 'Resolved';
        detail = m.status === 'Completed' ? 'Mission completed; resources returned to availability.' : `Mission moved to ${m.status.toLowerCase()}.`;
    }
    else
        throw new Error('Unsupported operation.');
    for (const r of state.resources) {
        r.assignedMission = state.missions.filter(x => (x.assignedResources[r.id] ?? 0) > 0).map(x => x.id);
        r.status = available(state, r.id) > 0 ? 'Available' : 'Fully assigned';
    }
    state.revision++;
    state.activity.unshift({ id: crypto.randomUUID(), time: new Date().toISOString(), title: `${m.id} · ${m.status}`, detail });
    state.activity = state.activity.slice(0, 150);
    return state;
}
