import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const dir = await mkdtemp(join(tmpdir(), 'rescueflow-d1-http-'));
try {
  const source = await readFile(new URL('../lib/deployment/d1-http.server.ts', import.meta.url), 'utf8');
  const file = join(dir, 'd1-http.mjs');
  await writeFile(file, ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText);
  const { createD1HttpDatabase } = await import(pathToFileURL(file).href);
  const settings = { accountId: 'a'.repeat(32), databaseId: '00000000-0000-4000-8000-000000000001', apiToken: 'test-only-token' };
  const calls = [];
  let response = () => Response.json({ success: true, result: [{ success: true, results: [{ state: 'saved', revision: 1 }], meta: { changes: 1 } }] });
  const db = createD1HttpDatabase(() => settings, async (url, init) => {
    calls.push({ url, init });
    return response();
  });
  const injected = "Lahore'; DROP TABLE demo_sessions;--";
  const row = await db.prepare('SELECT state, revision FROM demo_sessions WHERE id = ?').bind(injected).first();
  assert.equal(row.state, 'saved');
  assert.equal(calls[0].url, `https://api.cloudflare.com/client/v4/accounts/${settings.accountId}/d1/database/${settings.databaseId}/query`);
  assert.deepEqual(JSON.parse(calls[0].init.body), { sql: 'SELECT state, revision FROM demo_sessions WHERE id = ?', params: [injected] });
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-only-token');
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(calls[0].init.redirect, 'error');
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  const result = await db.prepare('UPDATE demo_sessions SET revision = ? WHERE id = ? AND revision = ?').bind(2, 'session', 1).run();
  assert.equal(result.meta.changes, 1);
  assert.deepEqual(JSON.parse(calls.at(-1).init.body).params, ['2', 'session', '1']);
  response = () => Response.json({ success: true, result: [{ success: true, results: [], meta: { changes: 0 } }] });
  assert.equal(await db.prepare('SELECT state FROM demo_sessions WHERE id = ?').bind('missing').first(), null);
  assert.equal((await db.prepare('UPDATE demo_sessions SET revision = ? WHERE revision = ?').bind(2, 1).run()).meta.changes, 0);
  for (const failure of [
    () => new Response('sensitive provider error', { status: 403 }),
    () => Response.json({ success: false, errors: [{ message: 'private SQL data' }] }),
    () => Response.json({ success: true, result: [{ success: false }] }),
    () => Response.json({ success: true, result: [] }),
  ]) {
    response = failure;
    const before = calls.length;
    await assert.rejects(db.prepare('UPDATE demo_sessions SET revision = 1').run(), error => !/private SQL|sensitive provider/.test(error.message));
    assert.equal(calls.length, before + 1, 'Failed writes must not be retried');
  }
  const missing = createD1HttpDatabase(() => ({}), () => { throw new Error('must not fetch'); });
  await assert.rejects(missing.prepare('SELECT 1').first(), /not configured/);
  console.log('PASS: authenticated server-only D1 HTTP requests, parameterized SQL, numeric parameters, CAS metadata, empty reads, missing credentials, and safe failures without write retries.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
