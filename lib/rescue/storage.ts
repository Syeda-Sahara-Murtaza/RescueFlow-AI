import { env } from 'cloudflare:workers';
export function database() { if (!env.DB)
    throw new Error('Storage temporarily unavailable'); return env.DB; }
