import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { accessDecision, accessDestination, guardsAccess, safeAccessReturn, visualPhase, scenePolicy, validateScenePhase } from '../frontend/src/experience/access181/access.logic.mjs';
import { LOGO_MESHES } from '../frontend/src/experience/access181/logo.mesh.mjs';
import { identity, multiply, rotation, translation, torus, spring, hexNut } from '../frontend/src/experience/access181/scene.geometry.mjs';
const customer={id:'customer',role:'customer'},admin={id:'staff',role:'admin'};
for (const pathname of ['/', '/login', '/account', '/shop', '/shop/', '/story', '/bag', '/checkout', '/admin/products/new', '/products/apex-wheels']) {
  test(`Guest gate: ${pathname}`,()=>assert.equal(accessDecision({pathname}), 'login'));
}
test('Unknown routes preserve the existing 404',()=>assert.equal(accessDecision({pathname:'/unknown'}),'pass'));
test('Existing session does not force logout',()=>assert.equal(accessDecision({user:customer}),'pass'));
test('Authenticated login URL redirects',()=>assert.equal(accessDecision({user:customer,pathname:'/login'}),'redirect'));
test('Session check precedes the form',()=>assert.equal(accessDecision({authLoading:true}),'checking'));
test('API errors never produce fake login',()=>assert.equal(accessDecision({authError:'offline'}),'connection-error'));
test('Preview entry explains configuration',()=>assert.equal(accessDecision({mode:'preview'}),'configure'));
test('Preview catalog still has read-only access',()=>assert.equal(accessDecision({mode:'preview',pathname:'/shop'}),'pass'));
test('Flow mode is explicit and usable',()=>assert.equal(accessDecision({mode:'flow'}),'login'));
test('Normal entry now goes to Shop, not Story',()=>assert.equal(accessDestination({user:customer}),'/shop'));
test('Normal staff entry goes to Admin',()=>assert.equal(accessDestination({user:admin}),'/admin'));
test('Plain Account login goes to Shop',()=>assert.equal(accessDestination({pathname:'/account',user:customer}),'/shop'));
test('Direct checkout intent wins',()=>assert.equal(accessDestination({pathname:'/checkout',user:customer}),'/checkout'));
test('Purchase return wins over role default',()=>assert.equal(accessDestination({search:'?return=%2Fbag',user:admin}),'/bag'));
test('Shop query survives login',()=>assert.equal(accessDestination({pathname:'/shop',search:'?mode=build&q=brake%20set&category=brakes',user:customer}),'/shop?mode=build&q=brake+set&category=brakes'));
test('Explicit Garage view survives login',()=>assert.equal(accessDestination({pathname:'/account',search:'?view=vehicle',user:customer}),'/account?view=vehicle'));
test('Customer cannot select an Admin redirect',()=>assert.equal(accessDestination({pathname:'/login',search:'?return=%2Fadmin',user:customer}),'/shop'));
for (const value of ['https://bad.test','//bad.test','/\\bad.test','javascript:alert(1)','/login','/','/login?return=/login','/shop#x','/products/%2e%2e/admin','/shop\u0000','/shop?return=//evil\n',null,{},'/admin/products']) {
  test(`Reject unsafe return: ${JSON.stringify(value)}`,()=>assert.equal(safeAccessReturn(value),''));
}
test('Drop redirect-like query keys',()=>assert.equal(safeAccessReturn('/shop?return=%2Fadmin&mode=explore&token=secret'),'/shop?mode=explore'));
test('Staff return stays same-origin and same path',()=>assert.equal(safeAccessReturn('/admin/inbox?thread=abc','admin'),'/admin/inbox?thread=abc'));
test('Logo is actual finite triangle geometry',()=>{assert.ok(LOGO_MESHES.length);for(const m of LOGO_MESHES){assert.equal(m.positions.length,m.normals.length);assert.equal(m.positions.length%9,0);assert.ok(m.positions.every(Number.isFinite));assert.ok(Math.max(...m.positions.filter((_,i)=>i%3===2))>0);assert.ok(Math.min(...m.positions.filter((_,i)=>i%3===2))<0);}});
for(const [name,data] of [['coil',spring()],['fastener',hexNut()],['ring',torus(1,.1)]])test(`Valid ${name} geometry`,()=>{assert.equal(data.positions.length,data.normals.length);assert.equal(data.positions.length%9,0);assert.ok(data.normals.every(Number.isFinite));});
test('Transform identity preserved',()=>assert.deepEqual([...multiply(identity(),translation(1,2,3))],[...translation(1,2,3)]));
test('Rotation zero is identity',()=>assert.deepEqual([...rotation(0,0,0)].map(x=>x||0),[...identity()]));
test('No WebGL before loader ends',()=>assert.equal(scenePolicy({allowed:false,optedIn:true}).mount,false));
test('Mobile asks before mounting',()=>assert.equal(scenePolicy({compact:true}).mount,false));
test('Mobile may opt in',()=>assert.equal(scenePolicy({compact:true,optedIn:true}).mount,true));
test('Reduced motion remains still even after opt-in',()=>assert.equal(scenePolicy({reduced:true,optedIn:true}).run,false));
test('Hidden/offscreen scene pauses',()=>{assert.equal(scenePolicy({hidden:true}).run,false);assert.equal(scenePolicy({visible:false}).run,false);});
test('Typing and Pause stop continuous rendering',()=>{assert.equal(scenePolicy({focusing:true}).run,false);assert.equal(scenePolicy({paused:true}).run,false);});
test('Invalid phase values never reach shader state',()=>assert.equal(validateScenePhase('arbitrary-password'),'idle'));
test('Visual phase receives a semantic state, not input values',()=>{assert.equal(visualPhase({focus:'password'}),'secure');assert.equal(visualPhase({busy:true,focus:'email'}),'working');assert.equal(visualPhase({error:'error'}),'error');});
const text = p=>readFile(new URL(p,import.meta.url),'utf8');
test('Access uses existing auth validation and identity epoch',async()=>{const s=await text('../frontend/src/experience/access181/AccessScreen181.jsx');assert.match(s,/validateRegistration/);assert.match(s,/await authenticate/);assert.match(s,/getIdentityEpoch/);assert.match(s,/requestId!==serial\.current/);assert.doesNotMatch(s,/localStorage|sessionStorage/);});
test('Only verified callback publishes a session',async()=>{const s=await text('../frontend/src/experience/access181/AccessBoundary181.jsx');assert.match(s,/store\.setUser\(user\)/);assert.match(s,/navigate\(target,\{replace:true\}\)/);const fn=s.slice(s.indexOf('function authenticated'),s.indexOf("if(state==='redirect')"));assert.doesNotMatch(fn,/setTimeout|requestAnimationFrame/);});
test('Renderer mount respects intro and device policy',async()=>{const s=await text('../frontend/src/experience/access181/BrandScene.jsx');assert.match(s,/policy\.allowed/);assert.match(s,/import\('\.\/brandScene\.webgl\.mjs'\)/);assert.match(s,/api\.dispose\(\)/);assert.match(s,/!focusing/);});
test('Renderer frees owned resources and does not force context loss on StrictMode cleanup',async()=>{const s=await text('../frontend/src/experience/access181/brandScene.webgl.mjs');assert.match(s,/deleteBuffer/);assert.match(s,/deleteProgram/);assert.match(s,/deleteShader/);assert.doesNotMatch(s,/\.loseContext\(/);});
