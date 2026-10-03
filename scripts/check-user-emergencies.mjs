import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'rescueflow-user-'));
try{
  await symlink(new URL('../node_modules',import.meta.url).pathname,join(dir,'node_modules'));
  for(const name of ['model','user-analysis','ai-service','engine','openai.server','geocoding.server']){
    const source=await readFile(new URL(`../lib/rescue/${name}.ts`,import.meta.url),'utf8');
    await writeFile(join(dir,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/from '(\.\/[^']+)'/g,"from '$1.mjs'"));
  }
  const{createSeed,createWorkspace,userWorkspace,analyzeNewEmergency}=await import(join(dir,'ai-service.mjs'));
  const{requestLiveAnalysis}=await import(join(dir,'openai.server.mjs'));
  const{resolveLocation}=await import(join(dir,'geocoding.server.mjs'));
  const{transition}=await import(join(dir,'engine.mjs'));
  const{geographicPoint}=await import(join(dir,'user-analysis.mjs'));
  const seed=createSeed();
  const blank=createWorkspace();assert.equal(blank.reports.length,0);assert.equal(blank.incidents.length,0);assert.equal(blank.missions.length,0);assert.equal(blank.activity.length,0);
  assert.deepEqual(userWorkspace(seed),blank);

  const noLocation=async()=>({status:'missing',message:'Location not specified. No marker placed.'});
  const flood='Heavy flooding has entered houses near Sector 8. Around 30 families are trapped and two people need medical assistance.';
  let state=await analyzeNewEmergency(seed,flood,'',crypto.randomUUID(),null,resolveLocation);
  assert.deepEqual(state.reports.slice(0,5),seed.reports);assert.deepEqual(state.incidents.slice(0,2),seed.incidents);assert.deepEqual(state.missions.slice(0,3),seed.missions);
  const cleaned=userWorkspace(state);assert.equal(cleaned.reports.length,1);assert.equal(cleaned.incidents.length,1);assert.equal(cleaned.missions.length,1);assert.equal(cleaned.reports[0].rawText,flood);
  assert.equal(state.lastAnalysis.mode,'DEMO');assert.match(state.reports.at(-1).extractedInformation.people,/30 families/);assert.equal(state.incidents.at(-1).location,'Sector 8');assert.equal(state.incidents.at(-1).locationResolution.coordinates,undefined);assert.equal(state.missions.at(-1).status,'Awaiting approval');assert.equal(state.missions.at(-1).eta,null);
  const fire='A fire has started in a residential building. Several people are trapped on the upper floors and smoke is spreading.';
  state=await analyzeNewEmergency(state,fire,'',crypto.randomUUID(),null,noLocation);
  assert.match(state.reports.at(-1).extractedInformation.hazard,/fire/);assert.doesNotMatch(state.reports.at(-1).extractedInformation.hazard,/flood/i);assert.equal(state.incidents.at(-1).location,'Location not specified');assert.equal(state.incidents.at(-1).status,'Unverified');
  const count=state.incidents.length;
  state=await analyzeNewEmergency(state,flood,'',crypto.randomUUID(),null,resolveLocation);assert.equal(state.incidents.length,count);assert.equal(state.reports.at(-1).related,true);assert.equal(state.missions.length,5);
  const liveResult={extraction:{location:'Lahore',peopleAffected:'Several people',hazard:'Building fire',urgency:'Critical',medicalRisk:'Unknown',escalation:'Smoke spreading',confidence:87},assessment:{severity:'Critical',factors:['People reportedly trapped','Smoke reportedly spreading']},mission:{title:'Coordinate fire response',objective:'Confirm the fire location and coordinate trained fire and rescue responders.',requiredResources:[{resourceId:'team',quantity:1}],specialistNeeds:['Firefighting equipment is not in inventory'],suggestedRoute:[],estimatedResponseTime:null,priority:'Critical'}};
  let requests=0;
  const validFetch=async(url,init)=>{requests++;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(init.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.ok(init.signal);assert.equal(body.input.includes('TEST_ONLY_KEY'),false);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(liveResult)}]}]})};
  const geofetch=async()=>Response.json({results:[{name:'Lahore',latitude:31.558,longitude:74.3507,country:'Pakistan',admin1:'Punjab'}]});
  const resolve=location=>resolveLocation(location,geofetch);
  state=await analyzeNewEmergency(state,fire,'Lahore, Pakistan',crypto.randomUUID(),(text,location,resources)=>requestLiveAnalysis('TEST_ONLY_KEY',text,location,resources,validFetch),resolve);
  assert.equal(requests,1);assert.equal(state.lastAnalysis.mode,'LIVE');assert.equal(state.incidents.at(-1).locationResolution.status,'located');assert.equal(state.missions.at(-1).approvalStatus,'Pending');assert.deepEqual(state.missions.at(-1).assignedResources,{});
  assert.throws(()=>transition(state,{type:'advance',id:state.missions.at(-1).id}),/approval/);
  const id=state.missions.at(-1).id;state=transition(state,{type:'approve',id});state=transition(state,{type:'advance',id});state=transition(state,{type:'advance',id});assert.equal(state.missions.at(-1).status,'In progress');
  const c=state.incidents.at(-1).locationResolution.coordinates;const p=geographicPoint(c);assert.ok(p.x>50&&p.x<100&&p.y>0&&p.y<50);
  for(const fetcher of [async()=>new Response('',{status:401}),async()=>new Response('',{status:429}),async()=>new Response('',{status:503}),async()=>{throw new DOMException('Timeout','TimeoutError')},async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'not-json'}]}]}),async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{}'}]}]})]){
    const fallback=await analyzeNewEmergency(seed,fire,'',crypto.randomUUID(),(t,l,r)=>requestLiveAnalysis('TEST_ONLY_KEY',t,l,r,fetcher),noLocation);
    assert.equal(fallback.lastAnalysis.mode,'DEMO');assert.equal(fallback.missions.at(-1).status,'Awaiting approval');assert.equal(fallback.incidents.at(-1).locationResolution.coordinates,undefined);
  }
  const invented=await analyzeNewEmergency(seed,fire,'',crypto.randomUUID(),async()=>structuredClone(liveResult),noLocation);assert.equal(invented.incidents.at(-1).location,'Location not specified');
  assert.equal((await resolveLocation('31.558, 74.3507')).status,'located');assert.equal((await resolveLocation('190, 400')).coordinates,undefined);
  assert.equal((await resolveLocation('Springfield',async()=>Response.json({results:[{name:'Springfield',latitude:39,longitude:-89},{name:'Springfield',latitude:42,longitude:-72}]}))).status,'ambiguous');
  assert.equal((await resolveLocation('Lahore',async()=>{throw new Error('Unavailable')})).status,'unavailable');
  assert.equal((await resolveLocation('')).status,'missing');
  console.log('PASS: unchanged fixed demo, arbitrary flood/fire inputs, grounded fallback, structured live-response adapter, six API failure paths, no invented location, geocoding and projection, ambiguous/missing coordinates, conservative duplicates, approval and tracking. Live provider call is mocked here.');
}finally{await rm(dir,{recursive:true,force:true})}
