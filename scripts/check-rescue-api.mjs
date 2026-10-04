import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'rescueflow-api-'));
const vercelAdapter=process.argv.includes('--vercel-adapter');
try{
  await symlink(new URL('../node_modules',import.meta.url).pathname,join(dir,'node_modules'));
  for(const name of ['model','user-analysis','ai-service','engine','openai.server','geocoding.server','map-data']){
    const source=await readFile(new URL(`../lib/rescue/${name}.ts`,import.meta.url),'utf8');
    await writeFile(join(dir,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/from '(\.\/[^']+)'/g,"from '$1.mjs'"));
  }
  await writeFile(join(dir,'storage.mjs'),`import {DatabaseSync} from 'node:sqlite';
export const env={};
const db=new DatabaseSync(':memory:');
db.exec('CREATE TABLE demo_sessions (id TEXT PRIMARY KEY, state TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL)');
export function database(){return {prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}}}}}}}
`);
  if(vercelAdapter){
    const adapter=await readFile(new URL('../lib/deployment/d1-http.server.ts',import.meta.url),'utf8');
    await writeFile(join(dir,'d1-http.mjs'),ts.transpileModule(adapter,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
    await writeFile(join(dir,'storage.mjs'),`import {DatabaseSync} from 'node:sqlite';
import {createD1HttpDatabase} from './d1-http.mjs';
export const env={};
const sqlDb=new DatabaseSync(':memory:');
sqlDb.exec('CREATE TABLE demo_sessions (id TEXT PRIMARY KEY, state TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL)');
const httpDb=createD1HttpDatabase(()=>({accountId:'a'.repeat(32),databaseId:'00000000-0000-4000-8000-000000000001',apiToken:'test-only-token'}),async(url,options)=>{
  const {sql,params}=JSON.parse(options.body);
  const statement=sqlDb.prepare(sql);
  const rows=/^SELECT/i.test(sql)?statement.all(...params):[];
  const changes=/^SELECT/i.test(sql)?0:Number(statement.run(...params).changes);
  return Response.json({success:true,result:[{success:true,results:rows,meta:{changes}}]});
});
export function database(){return httpDb;}
`);
  }
  const source=await readFile(new URL('../app/api/state/route.ts',import.meta.url),'utf8');
  const route=ts.transpileModule(source.replace("'cloudflare:workers'","'./storage'"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/'@\/lib\/rescue\/([^']+)'/g,"'./$1.mjs'").replace("'./storage'","'./storage.mjs'");
  await writeFile(join(dir,'route.mjs'),route);
  const {GET,POST}=await import(join(dir,'route.mjs'));
  const {incidentMapEntries}=await import(join(dir,'map-data.mjs'));
  const nativeFetch=globalThis.fetch;
  const liveGeocoding=process.argv.includes('--live-geocoding');
  globalThis.fetch=async(input,init)=>{
    const target=new URL(String(input));
    assert.equal(target.hostname,'geocoding-api.open-meteo.com');
    if(liveGeocoding)return nativeFetch(input,init);
    const name=target.searchParams.get('name');
    const places={Lahore:{name:'Lahore',latitude:31.558,longitude:74.35071,country:'Pakistan',country_code:'PK'},Karachi:{name:'Karachi',latitude:24.8608,longitude:67.0104,country:'Pakistan',country_code:'PK'}};
    return Response.json({results:places[name]?[places[name]]:[]});
  };
  const url='https://rescueflow.test/api/state';
  const first=await GET(new Request(url));assert.equal(first.status,200);
  const cookie=first.headers.get('set-cookie').split(';')[0];
  assert.match(first.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  let state=await first.json();assert.equal(state.missions.length,0);assert.equal(state.reports.length,0);assert.equal(state.incidents.length,0);
  const post=(action,revision=state.revision,extra={})=>POST(new Request(url,{method:'POST',headers:{cookie,origin:'https://rescueflow.test','content-type':'application/json',...extra},body:JSON.stringify({action,revision})}));
  let res=await post({type:'approve',id:'RF-001'},state.revision,{origin:'https://other.test'});assert.equal(res.status,403);
  res=await post({type:'approve',id:'RF-001'});assert.equal(res.status,400);
  const requestId=crypto.randomUUID();
  const lahoreEmergency='Severe flooding has occurred after continuous heavy rainfall. Several houses are flooded, people are trapped on rooftops, and electricity has been disrupted. Immediate rescue and medical assistance are required.';
  const analysisAction={type:'analyze',requestId,reportText:lahoreEmergency,city:'Lahore',country:'Pakistan'};
  res=await post(analysisAction);assert.equal(res.status,200);state=await res.json();assert.equal(state.lastAnalysis.mode,'DEMO');assert.equal(state.incidents.at(-1).locationResolution.status,'located');assert.equal(state.missions.at(-1).approvalStatus,'Pending');
  const firstIncident=state.incidents[0];assert.equal(firstIncident.city,'Lahore');assert.equal(firstIncident.country,'Pakistan');assert.ok(Math.abs(firstIncident.locationResolution.coordinates.latitude-31.558)<0.01);assert.ok(Math.abs(firstIncident.locationResolution.coordinates.longitude-74.35071)<0.01);assert.equal(state.reports[0].rawText,lahoreEmergency);
  const reportCount=state.reports.length;res=await post(analysisAction,0);assert.equal(res.status,200);assert.equal((await res.json()).reports.length,reportCount);
  res=await post({type:'analyze',requestId:crypto.randomUUID(),reportText:'tiny'});assert.equal(res.status,400);
  const id=state.missions[0].id;
  res=await post({type:'advance',id});assert.equal(res.status,400);
  res=await post({type:'approve',id});assert.equal(res.status,200);state=await res.json();
  const parallel=await Promise.all([post({type:'advance',id}),post({type:'advance',id})]);assert.deepEqual(parallel.map(r=>r.status).sort(),[200,409]);
  state=await(await GET(new Request(url,{headers:{cookie}}))).json();assert.equal(state.missions[0].status,'Resource assigned');assert.equal(state.reports.length,1);
  for(const status of ['In progress','Completed','Resolved']){res=await post({type:'advance',id});assert.equal(res.status,200);state=await res.json();assert.equal(state.missions[0].status,status)}
  const separate=await(await GET(new Request(url))).json();assert.equal(separate.reports.length,0);
  const userReportId=state.reports[0].id,userMission=state.missions[0];
  res=await post({type:'simulate'});assert.equal(res.status,200);state=await res.json();
  assert.equal(state.simulationLoaded,true);assert.equal(state.reports.length,6);assert.equal(state.incidents.length,3);assert.equal(state.missions.length,4);
  assert.equal(state.reports.filter(r=>r.origin!=='user').length,5);assert.equal(state.incidents.filter(i=>i.origin!=='user').length,2);assert.equal(state.missions.filter(m=>m.origin!=='user').length,3);
  assert.ok(state.missions.filter(m=>m.origin!=='user').every(m=>m.status==='Awaiting approval'&&Object.keys(m.assignedResources).length===0));
  state=await(await GET(new Request(url,{headers:{cookie}}))).json();assert.equal(state.reports.length,6);assert.equal(state.simulationLoaded,true);
  res=await post({type:'simulate'});state=await res.json();assert.equal(state.reports.length,6);
  res=await post({type:'approve',id:'RF-001'});state=await res.json();assert.equal(state.missions.find(m=>m.id==='RF-001').status,'Approved');
  res=await post({type:'advance',id:'RF-001'});state=await res.json();assert.equal(state.resources.find(r=>r.id==='boat').assignedMission[0],'RF-001');
  state=await(await GET(new Request(url,{headers:{cookie}}))).json();assert.equal(state.missions.find(m=>m.id==='RF-001').assignedResources.boat,2);
  res=await post({type:'advance',id:'RF-001'});state=await res.json();assert.equal(state.missions.find(m=>m.id==='RF-001').status,'In progress');
  res=await post({type:'remove-simulation'});state=await res.json();assert.equal(state.reports.length,1);assert.equal(state.reports[0].id,userReportId);assert.deepEqual(state.missions[0],userMission);assert.equal(state.resources.find(r=>r.id==='boat').assignedMission.length,0);
  state=await(await GET(new Request(url,{headers:{cookie}}))).json();assert.equal(state.simulationLoaded,false);assert.equal(state.reports.length,1);
  res=await post({type:'reset'});state=await res.json();assert.equal(state.reports.length,0);assert.equal(state.missions.length,0);

  // Multiple independently selectable pins, including two incidents at the same city center.
  for(const [city,reportText]of [['Lahore',lahoreEmergency],['Lahore','A warehouse fire is spreading and residents need evacuation.'],['Karachi','A road has collapsed and several motorists are stranded.']]){
    res=await post({type:'analyze',requestId:crypto.randomUUID(),reportText,city,country:'Pakistan'});assert.equal(res.status,200);state=await res.json();
  }
  const saved=structuredClone(state);
  state=await(await GET(new Request(url,{headers:{cookie}}))).json();assert.deepEqual(state,saved);
  const entries=incidentMapEntries(state.incidents,state.reports);assert.equal(entries.length,3);assert.equal(new Set(entries.map(e=>e.incident.id)).size,3);
  assert.notDeepEqual(entries[0].offset,entries[1].offset);assert.deepEqual(entries[0].coordinates,entries[1].coordinates);
  assert.equal(entries[0].report.rawText,lahoreEmergency);assert.match(entries[1].report.rawText,/warehouse fire/);assert.equal(entries[2].city,'Karachi');assert.equal(state.lastAnalysis.incidentId,entries[2].incident.id);
  for(const place of [{city:'QzxvMissingCity987',country:'Pakistan'},{city:'Lahore',country:'NotACountry987'}]){
    res=await post({type:'analyze',requestId:crypto.randomUUID(),reportText:lahoreEmergency,...place});assert.equal(res.status,422);assert.equal((await res.json()).error,'Could not locate this emergency. Please check the city and country name.');
    assert.deepEqual(await(await GET(new Request(url,{headers:{cookie}}))).json(),saved);
  }
  res=await post({type:'analyze',requestId:crypto.randomUUID(),reportText:lahoreEmergency,city:'',country:'Pakistan'});assert.equal(res.status,400);
  globalThis.fetch=nativeFetch;

  console.log(`PASS: ${vercelAdapter?'Vercel D1 HTTP adapter':'native D1 interface'}; ${liveGeocoding?'LIVE':'fixture'} city/country geocoding, exact Lahore emergency, persisted coordinates and report, three markers including two in Lahore, isolated reports, latest map target, invalid location rejected without mutation, plus HTTP/SQLite persistence, approval gates, concurrency, shared simulation and mission tracking.`);
}finally{await rm(dir,{recursive:true,force:true})}
