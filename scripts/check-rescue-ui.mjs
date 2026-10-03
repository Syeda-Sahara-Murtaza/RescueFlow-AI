import assert from 'node:assert/strict';
import {mkdtemp,readdir,writeFile,rm,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const root=new URL('..',import.meta.url).pathname;
const store=join(root,'node_modules/.pnpm');
const esbuild=(await readdir(store)).find(n=>/^esbuild@/.test(n));
if(!esbuild)throw new Error('Installed build dependency esbuild is unavailable');
const{build}=await import(join(store,esbuild,'node_modules/esbuild/lib/main.js'));
const dir=await mkdtemp(join(tmpdir(),'rescue-ui-'));
try{
 await symlink(join(root,'node_modules'),join(dir,'node_modules'));
 const entry=join(dir,'entry.tsx');
 await writeFile(entry,`import React from 'react';import{renderToString}from'react-dom/server';import App,{navigation}from'${join(root,'components/rescue/app.tsx')}';import{createWorkspace}from'${join(root,'lib/rescue/ai-service.ts')}';import{transition}from'${join(root,'lib/rescue/engine.ts')}';export{navigation};export function render(view,populated){globalThis.__rescueState=populated?transition(createWorkspace(),{type:'simulate'}):createWorkspace();return renderToString(React.createElement(App,{view}))}`);
 await build({entryPoints:[entry],outfile:join(dir,'bundle.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',alias:{'@':root},plugins:[{name:'test-shared-state',setup(b){b.onResolve({filter:/^\.\/provider$/},a=>a.importer.includes('/components/rescue/')?{path:'test-provider',namespace:'fixture'}:null);b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export function useRescue(){return {state:globalThis.__rescueState,ready:true,busy:false,error:'',act:async()=>true,reload:async()=>{}}}`,loader:'js'}))}}]});
 const{render,navigation}=await import(join(dir,'bundle.mjs'));
 assert.deepEqual(navigation.map(n=>n[1]),['Overview','Reports','Incidents','Missions','Resources','Command Center']);
 for(const filled of [false,true])for(const[view,label]of navigation){const html=render(view,filled);assert.ok(html.includes(`<h1>${label}</h1>`),view);assert.equal((html.match(/data-slot="sidebar-menu-button"/g)||[]).length,6,view);if(view==='overview')assert.ok(html.includes('RUN RESCUE SIMULATION'));if(view==='reports'){assert.ok(!html.includes('STRUCTURED EXTRACTION'));assert.ok(!html.includes('HUMAN APPROVAL REQUIRED'))}if(view==='command-center'){assert.ok(html.includes('Live response timeline'));assert.ok(!html.includes('class="panel mission-card'))}if(filled&&view==='incidents'){assert.ok(html.includes('Village A Flood Emergency'));assert.ok(html.includes('PRIORITY SCORE'))}if(filled&&view==='missions')assert.ok(html.includes('HUMAN APPROVAL REQUIRED'))}
 console.log('PASS: all six views render for empty and shared simulation state, exact navigation order, Overview entry action, raw Reports, incident intelligence, mission approval and map/timeline composition.');
}finally{await rm(dir,{recursive:true,force:true})}
