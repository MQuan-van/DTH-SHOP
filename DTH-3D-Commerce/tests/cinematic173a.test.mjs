import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { entranceDecision, safeJourneyReturn, signInDestination, storyVisited, visitStory } from '../frontend/src/experience/journey/journey.logic.mjs';
import { loginPhase } from '../frontend/src/shop/account/login/login.logic.mjs';
import { pointerVector } from '../frontend/src/experience/cinematic/motion.tokens.mjs';
import { routeKey, shouldTransition } from '../frontend/src/experience/journey/transition.logic.mjs';

const storage = () => { const map = new Map(); return { getItem:k=>map.get(k), setItem:(k,v)=>map.set(k,v), removeItem:k=>map.delete(k), map }; };
const user = { id:'cinematic-member' };

test('first signed-in entrance goes to Story and later entrances go Home', () => {
  const s=storage();
  assert.equal(signInDestination(null,'api',user,s),'/story?intro=1');
  assert.equal(storyVisited('api',user.id,s),false);
  visitStory('api',user.id,s);
  assert.equal(signInDestination(null,'api',user,s),'/');
});
for (const path of ['/bag','/checkout','/shop','/products/apex-suspension']) test(`purchase return preserved ${path}`,()=>{
  assert.equal(safeJourneyReturn(path),path);assert.equal(signInDestination(path,'api',user,storage()),path);
});
for (const [input,expected] of [
  [{loading:true},'pending'],[{error:'offline',user},'account'],[{user:null},'account'],[{mode:'preview',user},'account'],[{user},'story'],[{user,visited:true},'home'],
]) test(`entrance decision ${expected}`,()=>assert.equal(entranceDecision(input),expected));

test('login focus phases are deterministic',()=>{
  assert.equal(loginPhase({field:'email'}),'identify');assert.equal(loginPhase({field:'password'}),'password');
  assert.equal(loginPhase({registering:true}),'register');assert.equal(loginPhase({busy:true,error:true}),'working');
  assert.equal(loginPhase({error:true}),'error');
});
test('pointer vector is bounded and centred',()=>{
  const rect={left:10,top:20,width:200,height:100};
  assert.deepEqual(pointerVector(110,70,rect),{x:0,y:0});
  assert.deepEqual(pointerVector(-999,9999,rect),{x:-1,y:1});
});
test('filters on Shop do not trigger route transition while pages do',()=>{
  assert.equal(routeKey({pathname:'/shop',search:'?q=a'}),routeKey({pathname:'/shop',search:'?q=b'}));
  assert.equal(shouldTransition({from:{pathname:'/'},to:{pathname:'/story'}}),true);
  assert.equal(shouldTransition({from:{pathname:'/'},to:{pathname:'/checkout'}}),false);
});
const source = rel => readFile(new URL('../'+rel,import.meta.url),'utf8');
test('root is auth-aware and routes share one transition owner',async()=>{
  const s=await source('frontend/src/shop/StoreApp.jsx');
  assert.match(s,/<TransitionRoutes>/);assert.match(s,/<Route index element=\{<StudioEntry \/>\}/);
});
test('Login 2.0 connects focus, pointer and post-auth Story destination',async()=>{
  const s=await source('frontend/src/shop/account/AccountPage.jsx');
  for(const part of ['data-cinematic-auth','cinematic.field(\'email\')','cinematic.field(\'password\')','signInDestination']) assert.ok(s.includes(part),part);
  assert.match(s,/AccountVisual phase=\{cinematic\.phase\}/);
});
test('Login renderer waits for startup release and uses phase-responsive light rig',async()=>{
  const visual=await source('frontend/src/shop/account/AccountVisual.jsx');
  const scene=await source('frontend/src/shop/account/AccountScene.jsx');
  assert.match(visual,/useStartupAllowed/);assert.match(visual,/startupAllowed&&visible&&capable/);
  assert.match(scene,/function LightRig/);assert.match(scene,/phase==='working'/);assert.doesNotMatch(scene,/EffectComposer|Bloom|postprocessing/);
});
test('Story uses rider journal and heavy 3D waits for loader release',async()=>{
  const s=await source('frontend/src/experience/story/StoryPage.jsx');
  assert.match(s,/StoryEditorial/);assert.match(s,/useStartupWebGL/);assert.match(s,/allow3D && status !== 'fallback'/);
});
test('loader remains image/code based with three CSS 3D fragments',async()=>{
  const s=await source('frontend/src/experience/loader/AppLoader.jsx');
  assert.match(s,/REGIONS = \[/);assert.match(s,/data-ignition-depth/);assert.match(s,/data-ignition-portal/);
  assert.doesNotMatch(s,/<video|\.mp4|\.webm|WebGLRenderer|Canvas/);
});
test('rider assets are actual WebP files',async()=>{
  for(const name of ['crew','lineup']) for(const width of [768,1536]){
    const b=await readFile(new URL(`../frontend/public/story/ride-journal/${name}-${width}.webp`,import.meta.url));
    assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
  }
});
