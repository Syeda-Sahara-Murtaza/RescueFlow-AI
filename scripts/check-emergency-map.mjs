import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
import {JSDOM} from 'jsdom';

const dir=await mkdtemp(join(tmpdir(),'rescue-map-'));
const dom=new JSDOM('<!doctype html><div id="map"></div>',{url:'https://rescueflow.test/command-center',pretendToBeVisual:true});
try{
  for(const key of ['window','document','navigator','HTMLElement','Element','SVGElement','getComputedStyle'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
  window.matchMedia=()=>({matches:true});
  const container=document.getElementById('map');
  Object.defineProperties(container,{clientWidth:{value:900},clientHeight:{value:440}});
  const L=(await import('leaflet')).default;
  for(const name of ['incident-map-controller','map-data']){
    const source=await readFile(new URL(`../lib/rescue/${name}.ts`,import.meta.url),'utf8');
    await writeFile(join(dir,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
  }
  const {IncidentMapController}=await import(join(dir,'incident-map-controller.mjs'));
  const {incidentMapEntries}=await import(join(dir,'map-data.mjs'));
  const description='Severe flooding has occurred after continuous heavy rainfall. Several houses are flooded, people are trapped on rooftops, and electricity has been disrupted. Immediate rescue and medical assistance are required.';
  const incident=(id,city,latitude,longitude)=>({id,origin:'user',city,country:'Pakistan',location:city+', Pakistan',hazard:'Flood',severity:'High',status:'Unverified',locationResolution:{status:'located',coordinates:{latitude,longitude,city,country:'Pakistan',label:city,source:'Open-Meteo / GeoNames',precision:'Locality center'}}});
  const report=(incidentId,rawText)=>({id:'R-'+incidentId,incidentId,rawText,timestamp:'2026-10-03T12:00:00Z',extractedInformation:{hazard:'Flood'}});
  const lahore=incident('INC-LAHORE','Lahore',31.558,74.35071),karachi=incident('INC-KARACHI','Karachi',24.8608,67.0104),second=incident('INC-LAHORE-2','Lahore',31.558,74.35071);
  const reports=[report(lahore.id,description),report(karachi.id,'Road obstruction in Karachi; motorists need help.'),report(second.id,'A different emergency in Lahore. <img src=x onerror=alert(1)>')];
  const selected=[];
  const controller=new IncidentMapController(L,container,id=>selected.push(id),()=>{});
  controller.update(incidentMapEntries([lahore],reports));controller.focus(lahore.id);
  assert.equal(controller.map.getZoom(),12);assert.ok(Math.abs(controller.map.getCenter().lat-31.558)<0.000001);
  let marker=document.querySelector('[data-incident-id="INC-LAHORE"]');
  assert.ok(marker.classList.contains('emergency-pin'));assert.ok(!marker.classList.contains('is-resolved'));
  marker.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  let popup=document.querySelector('.emergency-map-popup');
  for(const text of [description,'INC-LAHORE','Lahore','Pakistan','High','Unverified','Reported','Flood'])assert.ok(popup.textContent.includes(text),text);
  assert.deepEqual(selected,['INC-LAHORE']);
  const pins=incidentMapEntries([lahore,karachi,second],reports);
  controller.update(pins);assert.equal(document.querySelectorAll('.emergency-pin').length,3);
  controller.focus(karachi.id);assert.ok(Math.abs(controller.map.getCenter().lng-67.0104)<0.000001);
  document.querySelector('[data-incident-id="INC-KARACHI"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  popup=document.querySelector('.emergency-map-popup');assert.ok(popup.textContent.includes('Road obstruction in Karachi'));assert.ok(!popup.textContent.includes(description));assert.equal(document.querySelectorAll('.emergency-map-popup').length,1);
  document.querySelector('.leaflet-popup-close-button').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  assert.equal(document.querySelectorAll('.emergency-map-popup').length,0);assert.equal(document.querySelectorAll('.emergency-pin').length,3);
  controller.focus(second.id,true);popup=document.querySelector('.emergency-map-popup');assert.ok(popup.textContent.includes('<img src=x'));assert.equal(popup.querySelectorAll('img').length,0);
  const firstPin=document.querySelector('[data-incident-id="INC-LAHORE"]'),secondPin=document.querySelector('[data-incident-id="INC-LAHORE-2"]');assert.notEqual(firstPin.style.marginLeft+firstPin.style.marginTop,secondPin.style.marginLeft+secondPin.style.marginTop);
  controller.showAll();assert.ok(controller.map.getBounds().contains([31.558,74.35071]));assert.ok(controller.map.getBounds().contains([24.8608,67.0104]));
  // Reconstruct the map with JSON-round-tripped stored incidents, as on refresh.
  controller.destroy();
  const restored=new IncidentMapController(L,container,()=>{},()=>{});
  restored.update(incidentMapEntries(JSON.parse(JSON.stringify([lahore,karachi,second])),reports));assert.equal(document.querySelectorAll('.emergency-pin').length,3);
  const invalid={...lahore,id:'BAD',locationResolution:{status:'located',coordinates:{latitude:NaN,longitude:999}}};
  assert.equal(incidentMapEntries([invalid],reports).length,0);
  restored.destroy();
  console.log('PASS: real Leaflet DOM markers, Lahore focus/zoom, full report popup, multiple and overlapping pins, separate report clicks, popup close, safe text rendering, show-all bounds, restored markers, invalid coordinates excluded. DOM interaction test; not a full browser visual test.');
}finally{dom.window.close();await rm(dir,{recursive:true,force:true});}
