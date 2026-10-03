import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'rescueflow-check-'));
try {
  await symlink(new URL('../node_modules',import.meta.url).pathname,join(dir,'node_modules'));
  for(const name of ['model','user-analysis','ai-service','engine','openai.server','geocoding.server']){
    const source=await readFile(new URL(`../lib/rescue/${name}.ts`,import.meta.url),'utf8');
    const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/from '(\.\/[^']+)'/g,"from '$1.mjs'");
    await writeFile(join(dir,name+'.mjs'),code);
  }
  const {createSeed}=await import(join(dir,'ai-service.mjs'));
  const {transition}=await import(join(dir,'engine.mjs'));
  const {available}=await import(join(dir,'model.mjs'));
  let s=createSeed();
  assert.deepEqual([s.reports.length,s.incidents.length,s.missions.length],[5,2,3]);
  assert.equal(s.incidents[0].peopleAffected,'40 families');
  assert.equal(s.incidents[0].evidence.length,4);
  assert.equal(s.incidents[0].priorityScore,96);
  assert.throws(()=>transition(s,{type:'advance',id:'RF-001'}),/approval/);
  assert.throws(()=>transition(s,{type:'assign',id:'RF-001',resourceId:'boat',quantity:1}),/Approve/);
  assert.equal(s.missions[0].status,'Awaiting approval');
  s=transition(s,{type:'modify',id:'RF-001',objective:'Evacuate families with expanded medical assistance.',requiredResources:{boat:2,ambulance:1,team:1,medical:2}});
  s=transition(s,{type:'approve',id:'RF-001'});
  assert.throws(()=>transition(s,{type:'approve',id:'RF-001'}),/pending/);
  s=transition(s,{type:'assign',id:'RF-001',resourceId:'boat',quantity:1});
  assert.equal(available(s,'boat'),2);
  assert.throws(()=>transition(s,{type:'assign',id:'RF-001',resourceId:'boat',quantity:2}),/exceeds/);
  s=transition(s,{type:'advance',id:'RF-001'});
  assert.equal(s.missions[0].status,'Resource assigned');
  assert.equal(available(s,'boat'),1);
  assert.equal(available(s,'medical'),0);
  assert.throws(()=>transition(s,{type:'approve',id:'RF-002'}),/Insufficient/);
  for(const status of ['In progress','Completed','Resolved']){s=transition(s,{type:'advance',id:'RF-001'});assert.equal(s.missions[0].status,status)}
  assert.equal(available(s,'medical'),2);
  assert.equal(s.incidents[0].status,'Verified');
  s=transition(s,{type:'approve',id:'RF-002'});
  for(let i=0;i<4;i++)s=transition(s,{type:'advance',id:'RF-002'});
  assert.equal(s.incidents[0].status,'Resolved');
  s=transition(s,{type:'reject',id:'RF-003'});
  assert.equal(s.missions[2].approvalStatus,'Rejected');
  assert.throws(()=>transition(s,{type:'advance',id:'RF-003'}),/approval/);
  const revision=s.revision;
  s=transition(s,{type:'reset'});
  assert.equal(s.revision,revision+1);
  assert.equal(available(s,'boat'),3);
  assert.ok(s.missions.every(m=>m.status==='Awaiting approval'));
  console.log('PASS: scenario extraction, incident clustering, approval gates, modification, partial assignment, shortage protection, lifecycle, release, resolution, rejection, reset.');
}finally{await rm(dir,{recursive:true,force:true})}
