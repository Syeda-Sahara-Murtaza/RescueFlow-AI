import { database } from '@/lib/rescue/storage';
import { env } from 'cloudflare:workers';
import {requestLiveAnalysis} from '@/lib/rescue/openai.server';
import {resolveCityCountry,LOCATION_FAILURE} from '@/lib/rescue/geocoding.server';
import { createWorkspace, userWorkspace, analyzeNewEmergency } from '@/lib/rescue/ai-service';
import { transition } from '@/lib/rescue/engine';
import { available, type Action, type State } from '@/lib/rescue/model';
function session(request: Request) { const id = request.headers.get('cookie')?.match(/(?:^|;\s*)rf_session=([a-f0-9-]{36})(?:;|$)/)?.[1]; return id ?? crypto.randomUUID(); }
function headers(id: string, request: Request) { return { 'Cache-Control': 'no-store', 'Set-Cookie': `rf_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` }; }
async function read(id: string) { const db = database(); const row = await db.prepare('SELECT state, revision FROM demo_sessions WHERE id = ?').bind(id).first<{
    state: string;
    revision: number;
}>(); if (row)
    return userWorkspace(JSON.parse(row.state) as State); const seed = createWorkspace(); await db.prepare('INSERT OR IGNORE INTO demo_sessions (id,state,revision,updated_at) VALUES (?,?,?,?)').bind(id, JSON.stringify(seed), 0, new Date().toISOString()).run(); return seed; }
export async function GET(request: Request) { const id = session(request); try {
    return Response.json(await read(id), { headers: headers(id, request) });
}
catch (e) {
    console.error('State load failed');
    return Response.json({ error: 'Could not load saved demo progress. Please retry.' }, { status: 503 });
} }
export async function POST(request: Request) {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin)
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    const id = session(request);
    try {
        const body = await request.json() as {
            action: Action;
            revision: number;
        };
        const old = await read(id);
        if(body.action?.type==='analyze'&&old.lastAnalysis?.requestId===body.action.requestId)return Response.json(old,{headers:headers(id,request)});
        if (old.revision !== body.revision)
            return Response.json({ error: 'Progress changed in another tab. Reloading the latest state.' }, { status: 409 });
        let next: State;
        try {
            if(body.action?.type==='analyze'){
                const {reportText,city,country,requestId}=body.action;
                if(typeof reportText!=='string'||reportText.trim().length<15||reportText.length>4000||typeof city!=='string'||!city.trim()||city.length>100||typeof country!=='string'||!country.trim()||country.length>100||typeof requestId!=='string'||!/^[a-f0-9-]{36}$/.test(requestId))return Response.json({error:'Enter an emergency description (15–4,000 characters), city, and country.'},{status:400});
                if(old.reports.filter(r=>r.origin==='user').length>=50)return Response.json({error:'This demo session contains 50 user reports. Use Workspace settings to clear reports before adding more.'},{status:400});
                const recent=old.reports.filter(r=>r.origin==='user'&&Date.now()-Date.parse(r.timestamp)<60000).length;
                if(recent>=4)return Response.json({error:'Please wait a minute before submitting another report.'},{status:429});
                const place={city:city.trim(),country:country.trim()};
                const locationHint=`${place.city}, ${place.country}`;
                // Resolve before analysis or saving: a successful submission always has a valid map location.
                const locationResolution=await resolveCityCountry(place.city,place.country);
                if(locationResolution.status!=='located'||!locationResolution.coordinates)return Response.json({error:LOCATION_FAILURE},{status:422});
                const key=env.OPENAI_API_KEY;
                if(!key)console.warn('rescueflow_live_ai_unavailable',{category:'secret_not_available'});
                next=await analyzeNewEmergency(old,reportText.trim(),locationHint,requestId,key?((text,location,resources)=>requestLiveAnalysis(key,text,location,resources.map(r=>({...r,availableQuantity:available(old,r.id)})))):null,async()=>locationResolution,place);
            } else next = transition(old, body.action);
        }
        catch (e) {
            return Response.json({ error: body.action?.type==='analyze'?'Could not analyze this report. Your text is preserved; please retry.':e instanceof Error ? e.message : 'Invalid action' }, { status: 400 });
        }
        const result = await database().prepare('UPDATE demo_sessions SET state = ?, revision = ?, updated_at = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(next), next.revision, new Date().toISOString(), id, old.revision).run();
        if (result.meta.changes !== 1)
            return Response.json({ error: 'Progress changed. Please retry.' }, { status: 409 });
        return Response.json(next, { headers: headers(id, request) });
    }
    catch (e) {
        console.error('State save failed');
        return Response.json({ error: 'Could not save this action. Your previous progress is unchanged. Please retry.' }, { status: 503 });
    }
}
