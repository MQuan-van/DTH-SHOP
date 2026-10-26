import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultPresentation21, validatePresentation21, getPresentation21, presentationState21, initialSpin21, productHref21, presentationSaveCommand21, isPresentationModel21 } from '../shared/productPresentation21.mjs';
import { presentationFromBounds21, rotatePoint21, radians21, capturedCamera21, fitDistance21 } from '../frontend/src/shop/presentation21/presentationMath21.mjs';
import { installProductPresentation21 } from '../backend/commerce/presentation21/routes.mjs';
const url='/models/ai-products/example.glb', rev='11111111-1111-4111-a111-111111111111',rev2='22222222-2222-4222-a222-222222222222';
const product=()=>({id:'x1r-red',slug:'x1r-red',name:'X1R-GT4',modelUrl:url,price:7000000,active:true,updatedAt:new Date('2026-10-25T00:00:00.000Z')});
const body=p=>({settings:defaultPresentation21(p.modelUrl),expectedUpdatedAt:p.updatedAt.toISOString(),expectedRevision:p.presentation3d?.revision??null});
const near=(actual,expected,epsilon=1e-9)=>assert.ok(Math.abs(actual-expected)<epsilon,`${actual} differs from ${expected}`);
test('defaults produce a detached valid configuration',()=>{const a=defaultPresentation21(url),b=defaultPresentation21(url);assert.deepEqual(validatePresentation21(a,url),a);a.rotationDeg[0]=90;assert.equal(b.rotationDeg[0],0);});
test('local model URLs only; version query included in binding',()=>{for(const s of ['https://bad.test/a.glb','/models/../a.glb','/models/a.glb?secret=x','/models/a.txt','/models/a.glb#x'])assert.equal(isPresentationModel21(s),false);assert.ok(isPresentationModel21(url+'?v=abc'));assert.throws(()=>validatePresentation21(defaultPresentation21(url),url+'?v=abc'));});
for(const [name,mutate] of [
  ['rotation outside range',c=>c.rotationDeg[0]=181],['invalid vector length',c=>c.offset=[0]],['NaN',c=>c.scale=NaN],['Infinity',c=>c.camera.pitchDeg=Infinity],
  ['numeric string',c=>c.scale='1'],['unsafe zoom',c=>c.camera.zoom=8],['too fast spin',c=>c.spin.secondsPerTurn=1],['string boolean',c=>c.spin.enabled='true'],
  ['extra price field',c=>c.price=1],['extra nested field',c=>c.camera.price=1],['wrong version',c=>c.schemaVersion=2],['missing field',c=>delete c.spin],
])test(`validation rejects ${name}`,()=>{const c=defaultPresentation21(url);mutate(c);assert.throws(()=>validatePresentation21(c,url));});
test('configuration input is never mutated',()=>{const c=defaultPresentation21(url),snapshot=structuredClone(c);validatePresentation21(c,url);assert.deepEqual(c,snapshot);});
test('saved settings are accepted only for their model',()=>{const p={...product(),presentation3d:{revision:rev,settings:defaultPresentation21(url)}};assert.equal(presentationState21(p).status,'saved');p.modelUrl='/models/new.glb';assert.equal(getPresentation21(p),null);assert.equal(presentationState21(p).status,'model-changed');});
test('invalid stored settings fail closed to automatic presentation',()=>{const p={...product(),presentation3d:{settings:{assetUrl:url}}};assert.equal(presentationState21(p).status,'invalid');assert.equal(getPresentation21(p),null);});
test('unconfigured products retain automatic mode',()=>assert.equal(presentationState21(product()).status,'automatic'));
test('auto rotation default respects reduced motion, compact and data saver',()=>{const p=product();assert.equal(initialSpin21(p),true);for(const key of ['reduced','compact','saveData'])assert.equal(initialSpin21(p,{[key]:true}),false);p.presentation3d={settings:defaultPresentation21(url)};p.presentation3d.settings.spin.enabled=false;assert.equal(initialSpin21(p),false);});
test('product links cannot navigate outside the store',()=>{assert.equal(productHref21(product()),'/products/x1r-red');assert.equal(productHref21({slug:'https://bad.test'}),null);});
test('save command updates presentation only',()=>{const p=product(),cmd=presentationSaveCommand21(body(p),p,rev);assert.deepEqual(Object.keys(cmd.update.$set),['presentation3d']);assert.equal(cmd.filter.modelUrl,url);assert.equal(cmd.update.$set.presentation3d.revision,rev);assert.equal(p.price,7000000);});
test('save uses exact product timestamp and revision',()=>{const p=product();const b=body(p);b.expectedUpdatedAt='2020-01-01T00:00:00.000Z';assert.throws(()=>presentationSaveCommand21(b,p,rev),e=>e.status===409);b.expectedUpdatedAt=p.updatedAt.toISOString();p.presentation3d={revision:rev,settings:defaultPresentation21(url)};assert.throws(()=>presentationSaveCommand21(b,p,rev2),e=>e.status===409);});
test('save blocks extra price and role writes',()=>{const p=product();assert.throws(()=>presentationSaveCommand21({...body(p),role:'admin'},p,rev));});
test('save rejects a missing product',()=>assert.throws(()=>presentationSaveCommand21({settings:{},expectedUpdatedAt:'',expectedRevision:null},null,rev),e=>e.status===404));
test('Euler XYZ rotates X to Y without changing geometry length',()=>{const p=rotatePoint21([2,0,0],[0,0,Math.PI/2]);near(p[0],0);near(p[1],2);near(Math.hypot(...p),2);});
test('rotation order matches independently applied Z then Y then X',()=>{const point=[1,2,3],rotation=[.2,.4,.6];let [x,y,z]=point;let c=Math.cos(.6),s=Math.sin(.6);[x,y]=[c*x-s*y,s*x+c*y];c=Math.cos(.4);s=Math.sin(.4);[x,z]=[c*x+s*z,-s*x+c*z];c=Math.cos(.2);s=Math.sin(.2);[y,z]=[c*y-s*z,s*y+c*z];rotatePoint21(point,rotation).forEach((n,i)=>near(n,[x,y,z][i]));});
const bounds={min:[-1,-2,-.5],max:[1,2,.5]},normalization={scale:1.35/Math.sqrt(5.25),offset:[0,0,0]};
test('model rotation and camera yaw remain independent',()=>{const s=defaultPresentation21(url),a=presentationFromBounds21(bounds,normalization,s);s.rotationDeg[2]=90;const b=presentationFromBounds21(bounds,normalization,s);assert.deepEqual(a.camera,b.camera);assert.notDeepEqual(a.heightRange,b.heightRange);assert.deepEqual(bounds,{min:[-1,-2,-.5],max:[1,2,.5]});});
test('scale changes the asset while preserving camera frame radius',()=>{const s=defaultPresentation21(url),a=presentationFromBounds21(bounds,normalization,s);s.scale=1.25;const b=presentationFromBounds21(bounds,normalization,s);near(b.scale/a.scale,1.25);assert.equal(b.camera.frameRadius,a.camera.frameRadius);});
test('offset remains a visual translation, not a GLB edit',()=>{const s=defaultPresentation21(url);s.offset=[.1,-.2,.05];const a=presentationFromBounds21(bounds,normalization,s);assert.deepEqual(a.center,s.offset);assert.deepEqual(a.camera.center,[0,0,0]);assert.deepEqual(a.offset,normalization.offset);});
test('all permitted extreme camera presets stay outside the conservative asset envelope',()=>{for(const scale of [.75,1.25])for(const zoom of [.7,1.25])for(const pitch of [-65,65]){const s=defaultPresentation21(url);s.scale=scale;s.offset=[.2,.2,.2];s.camera.zoom=zoom;s.camera.pitchDeg=pitch;const c=presentationFromBounds21(bounds,normalization,s).camera;for(const p of Object.values(c.presets)){const d=Math.hypot(...p.position.map((n,i)=>n-p.target[i]));assert.ok(d>=c.radius*(2.05/1.35));assert.ok(d<=c.referenceDistance*1.9);}}});
test('presentation preserves original source bounds and disables stale annotations',()=>{const a=presentationFromBounds21(bounds,normalization,defaultPresentation21(url));assert.deepEqual(a.sourceBounds,bounds);assert.deepEqual(a.hotspots,[]);});
test('portrait framing is farther away, avoiding horizontal cropping',()=>assert.ok(fitDistance21(300,600)>fitDistance21(800,600)));
test('captured camera uses degrees and bounded zoom',()=>{const c=capturedCamera21([5,0,0],[0,0,0],5);near(c.yawDeg,90);near(c.pitchDeg,0);near(c.zoom,1);assert.equal(capturedCamera21([0,0,0],[0,0,0],5),null);});
function fakeAPI(){
  let doc=product();const routes=new Map(),checks={writes:0};
  const Product={findOne:query=>({lean:async()=>query.id===doc.id?structuredClone(doc):null}),findOneAndUpdate:(filter,update)=>({lean:async()=>{
    const match=filter.id===doc.id&&filter.modelUrl===doc.modelUrl&&+new Date(filter.updatedAt)===+new Date(doc.updatedAt)&&
      (typeof filter['presentation3d.revision']==='object'?!doc.presentation3d?.revision:filter['presentation3d.revision']===doc.presentation3d?.revision);
    if(!match)return null;checks.writes++;doc={...doc,...structuredClone(update.$set),updatedAt:new Date(+new Date(doc.updatedAt)+1)};return structuredClone(doc);
  }})};
  const router={get:(path,...h)=>routes.set(`GET ${path}`,h),put:(path,...h)=>routes.set(`PUT ${path}`,h)};
  const authenticated=(req,res,next)=>!req.user?res.status(401).json({message:'Sign in'}):req.method==='PUT'&&req.csrf!==true?res.status(403).json({message:'CSRF'}):next();
  const admin=(req,res,next)=>req.user==='admin'?next():res.status(403).json({message:'Admin only'});
  installProductPresentation21(router,{Product,authenticated,admin,writeLimit:(req,res,next)=>next()});
  return {checks,getDoc:()=>structuredClone(doc),async request(method,extra={}){
    const req={method,params:{id:'x1r-red'},user:'admin',csrf:true,...extra},res={code:200,headers:{},status(n){this.code=n;return this;},set(k,v){this.headers[k]=v;return this;},json(data){this.body=data;return this;}};
    const handlers=routes.get(`${method} /admin/studio/products/:id/presentation`);
    const dispatch=async index=>{if(index>=handlers.length)return;return handlers[index](req,res,e=>{if(e)throw e;return dispatch(index+1);});};await dispatch(0);return res;
  }};
}
test('endpoint denies unauthenticated reads',async()=>{const api=fakeAPI();assert.equal((await api.request('GET',{user:null})).code,401);});
test('endpoint denies ordinary customers',async()=>{const api=fakeAPI();assert.equal((await api.request('PUT',{user:'customer'})).code,403);assert.equal(api.checks.writes,0);});
test('endpoint retains CSRF protection',async()=>{const api=fakeAPI();assert.equal((await api.request('PUT',{csrf:false})).code,403);assert.equal(api.checks.writes,0);});
test('GET supplies defaults without writing the database',async()=>{const api=fakeAPI(),r=await api.request('GET');assert.equal(r.code,200);assert.equal(r.body.data.status,'automatic');assert.equal(api.checks.writes,0);assert.equal(r.headers['Cache-Control'],'no-store');});
test('PUT persists setup without changing commercial data',async()=>{const api=fakeAPI(),b=body(api.getDoc());b.settings.rotationDeg=[0,0,90];const r=await api.request('PUT',{body:b});assert.equal(r.code,200);assert.deepEqual(r.body.data.settings.rotationDeg,[0,0,90]);assert.equal(api.getDoc().price,7000000);assert.equal(api.getDoc().active,true);});
test('two editors cannot silently overwrite each other',async()=>{const api=fakeAPI(),b=body(api.getDoc());assert.equal((await api.request('PUT',{body:b})).code,200);assert.equal((await api.request('PUT',{body:b})).code,409);assert.equal(api.checks.writes,1);});
test('endpoint rejects injected model paths',async()=>{const api=fakeAPI(),b=body(api.getDoc());b.settings.assetUrl='https://attacker.invalid/model.glb';assert.equal((await api.request('PUT',{body:b})).code,400);assert.equal(api.checks.writes,0);});
test('endpoint rejects arbitrary IDs before database updates',async()=>{const api=fakeAPI();assert.equal((await api.request('GET',{params:{id:'../users'}})).code,404);});
test('render module uses the existing bounded loader and does not remesh or recolour',async()=>{const s=await readFile(new URL('../frontend/src/shop/presentation21/ProductPresentationPreview21.jsx',import.meta.url),'utf8');assert.match(s,/useProfiledModel\(base,selection,onFailure\)/);assert.doesNotMatch(s,/\.material\s*=|\.geometry\s*=|\.color\.set|decimat|simplif/i);assert.doesNotMatch(s,/<img\b|ProductStudioTools21/);});
test('card consumes the common presentation renderer instead of a photograph',async()=>{const s=await readFile(new URL('../frontend/src/shop/presentation21/ConfiguredCard21.jsx',import.meta.url),'utf8');assert.match(s,/ProductPresentationPreview21/);assert.match(s,/IntersectionObserver/);assert.doesNotMatch(s,/ProductImage|<img\b/);});
test('editor has explicit save and no Meshy generation call',async()=>{const s=await readFile(new URL('../frontend/src/shop/admin/presentation21/Product3DEditor21.jsx',import.meta.url),'utf8');assert.match(s,/Save 3D setup/);assert.match(s,/expectedRevision/);assert.doesNotMatch(s,/api\.meshy|\/ai-assets\/jobs/);});
