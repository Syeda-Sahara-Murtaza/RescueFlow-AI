'use client';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createWorkspace } from '@/lib/rescue/ai-service';
import type { State, Action } from '@/lib/rescue/model';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
type Store = {
    state: State;
    ready: boolean;
    busy: boolean;
    error: string;
    actionError: string;
    act: (action: Action) => Promise<boolean>;
    reload: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function RescueProvider({ children }: {
    children: ReactNode;
}) {
    const [state, setState] = useState<State>(createWorkspace), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [actionError,setActionError]=useState('');
    const reload = useCallback(async () => { try {
        const r = await fetch('/api/state', { cache: 'no-store' });
        const data = await r.json() as State & {
            error?: string;
        };
        if (!r.ok)
            throw new Error(data.error);
        setState(data);
        setReady(true);
        setError('');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Connection unavailable. Please retry.');
        setReady(false);
    } }, []);
    useEffect(() => { void reload(); }, [reload]);
    useEffect(()=>{const refresh=()=>{void reload()};window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh)},[reload]);
    const act = async (action: Action) => { if (busy || !ready)
        return false; setBusy(true); setActionError(''); try {
        const r = await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, revision: state.revision }) });
        const data = await r.json() as State & {
            error?: string;
        };
        if (!r.ok) {
            if (r.status === 409)
                await reload();
            throw new Error(data.error);
        }
        setState(data);
        toast.success(action.type === 'analyze'?'Report analyzed · review the proposed mission':action.type === 'approve' ? 'Mission approved · ready for resource assignment' : action.type === 'simulate' ? 'Simulation connected across all six tabs' : action.type === 'remove-simulation' ? 'Sample scenario removed · your reports retained' : action.type === 'reset' ? 'Workspace cleared' : 'Progress saved');
        return true;
    }
    catch (e) {
        const message=e instanceof Error ? e.message : 'Could not save. Please retry.';
        setActionError(message);toast.error(message);
        return false;
    }
    finally {
        setBusy(false);
    } };
    useEffect(() => { const ctx = (document as Document & {
        modelContext?: {
            registerTool: (tool: unknown, options: {
                signal: AbortSignal;
            }) => void;
        };
    }).modelContext; if (!ctx)
        return; const c = new AbortController(); try {
        ctx.registerTool({ name: 'read_rescueflow_status', title: 'Read RescueFlow demo status', description: 'Read simulated incidents, resource availability, and mission approval state. Does not dispatch or approve missions.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: async (input: unknown) => { if (!input || typeof input !== 'object' || Object.keys(input).length)
                throw new Error('Expected an empty object.'); const r = await fetch('/api/state'); if (!r.ok)
                throw new Error('Saved progress unavailable.'); return await r.json(); } }, { signal: c.signal });
    }
    catch { /* Optional browser capability. */ } return () => c.abort(); }, []);
    return <Context.Provider value={{ state, ready, busy, error, actionError, act, reload }}>{children}<Toaster theme="dark" position="bottom-right" richColors/></Context.Provider>;
}
export function useRescue() { const c = useContext(Context); if (!c)
    throw new Error('RescueProvider is required'); return c; }
