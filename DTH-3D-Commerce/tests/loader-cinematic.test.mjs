import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LOADER_CONFIG as config } from '../frontend/src/experience/loader/loader.config.mjs';
import { buildLoaderCues } from '../frontend/src/experience/loader/loaderCues.mjs';
import { createLoaderMotion } from '../frontend/src/experience/loader/loaderMotion.mjs';
import { loaderDecision } from '../frontend/src/experience/loader/loader.logic.mjs';

function fixture({width=1440,throws=false}={}){
  const calls=[];let cancelled=0;
  const node={animate(frames,options){if(throws)throw Error('unsupported');calls.push({frames,options});return{finished:Promise.resolve(),pause(){},finish(){},cancel(){cancelled++}}}};
  const counts={fragment:3};
  const root={...node,ownerDocument:{defaultView:{innerWidth:width},timeline:{currentTime:1000}},querySelector:()=>node,
    querySelectorAll:s=>Array.from({length:counts[s.replace('[data-ignition-','').replace(']','')]||0},()=>node)};
  return{root,calls,cancelled:()=>cancelled};
}
const flatten=cue=>Object.values(cue).flatMap(v=>Array.isArray(v)?v:[v]).filter(v=>v&&typeof v==='object');
test('presentation and exit are finite',()=>{assert.ok(config.brandMs>=2200&&config.brandMs<=3200);assert.ok(config.exitMs>0&&config.exitMs<=700);assert.ok(config.maxCoverMs>config.brandMs+config.exitMs);});
test('cue windows leave a readable still hold',()=>{const cue=buildLoaderCues();assert.ok(cue.recognitionHoldMs>=650);for(const e of flatten(cue))assert.ok(e.delay+e.duration<=cue.total-cue.recognitionHoldMs+1e-6);});
test('desktop uses at most nine entry tracks and compact drops secondary depth work',()=>{
  const wide=fixture(),small=fixture({width:390});const a=createLoaderMotion(wide.root),b=createLoaderMotion(small.root);
  assert.ok(wide.calls.length<=9);assert.ok(small.calls.length<wide.calls.length);assert.ok(wide.calls.length>=7);a.dispose();b.dispose();
});
test('entry animates transform and opacity, never clipping, layout or filters',()=>{
  const f=fixture();createLoaderMotion(f.root).dispose();
  for(const call of f.calls){const text=JSON.stringify(call.frames);assert.doesNotMatch(text,/clipPath|width|height|filter|left|top/);assert.equal(call.options.iterations,1);}
});
test('exit is a camera push plus fade on full motion and one fade when reduced',()=>{
  const normal=fixture(),reduced=fixture();createLoaderMotion(normal.root,{exit:true,duration:420}).dispose();createLoaderMotion(reduced.root,{exit:true,reduced:true,duration:100}).dispose();
  assert.equal(normal.calls.length,2);assert.equal(reduced.calls.length,1);assert.match(JSON.stringify(normal.calls[0].frames),/180px/);
});
test('cleanup is idempotent and motion failure never locks app',()=>{const f=fixture();const c=createLoaderMotion(f.root);c.dispose();c.dispose();assert.equal(f.cancelled(),f.calls.length);assert.doesNotThrow(()=>createLoaderMotion(fixture({throws:true}).root).dispose());});
test('readiness still exits after brand clock and fails open',()=>{
  assert.equal(loaderDecision({ready:true,logoReady:true,elapsed:config.brandMs+1,brandElapsed:config.brandMs}).reason,'ready');
  assert.equal(loaderDecision({elapsed:0,failed:true}).reason,'error');assert.equal(loaderDecision({elapsed:config.maxCoverMs}).reason,'timeout');
});
test('source contains no video, WebGL or animated clipping',async()=>{
  const [jsx,css,motion]=await Promise.all([
    readFile(new URL('../frontend/src/experience/loader/AppLoader.jsx',import.meta.url),'utf8'),
    readFile(new URL('../frontend/src/experience/loader/AppLoader.module.css',import.meta.url),'utf8'),
    readFile(new URL('../frontend/src/experience/loader/loaderMotion.mjs',import.meta.url),'utf8'),
  ]);
  assert.doesNotMatch(jsx+css+motion,/<video|\.mp4|\.webm|WebGLRenderer|backdrop-filter/);
  assert.doesNotMatch(motion,/clipPath/);assert.match(css,/perspective:1400px/);
});
