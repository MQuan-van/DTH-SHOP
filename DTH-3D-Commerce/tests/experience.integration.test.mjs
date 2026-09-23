/** Actual HTTP + MongoDB. Cleanup is confined to the exact disposable database name. */
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {makeApp} from '../backend/commerce/app.mjs';
import {Product,Vehicle,User,Session,Order} from '../backend/commerce/models.mjs';
import {Experience} from '../backend/commerce/experience/routes.mjs';
import {DEFAULT_EXPERIENCE} from '../shared/experience.mjs';
const uri=process.env.TEST_MONGO_URI;
if(!/^mongodb:\/\/127\.0\.0\.1:\d+\/dth_experience_test$/.test(uri||''))throw new Error('Only dth_experience_test on local MongoDB may be used.');
await test('Versioned experience publication on standalone MongoDB',async t=>{
 await mongoose.connect(uri);await mongoose.connection.dropDatabase();
 await Promise.all([Product,Vehicle,User,Session,Order,Experience].map(m=>m.init()));
 const catalog=JSON.parse(await readFile(new URL('../shared/catalog.json',import.meta.url),'utf8'));
 await Product.insertMany(catalog.products);await Vehicle.insertMany(catalog.vehicles);
 let app,server,base;const temporary=[];
 async function start(){app=await makeApp();server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}/api/shop`;}
 async function stop(){if(!server)return;app.locals.supportHub.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 await start();
 async function req(actor,path,body,method=body?'POST':'GET',extra={}){const r=await fetch(base+path,{method,headers:{Origin:'http://127.0.0.1:5173','Content-Type':'application/json',...(actor?{Cookie:actor.cookie,'X-CSRF-Token':actor.csrf}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,headers:r.headers,data:await r.json()};}
 async function register(email){const r=await req(null,'/auth/register',{email,password:'Isolated experience test 2026!'});assert.equal(r.status,201);return{id:r.data.user.id,cookie:r.headers.get('set-cookie').split(';')[0],csrf:r.data.csrf};}
 const admin=await register('experience-admin@example.test'),customer=await register('experience-customer@example.test');await User.updateOne({_id:admin.id},{$set:{role:'admin'}});
 const path='/admin/experience/home';let revision=0;const config=structuredClone(DEFAULT_EXPERIENCE);
 try{
 await t.test('No publication means safe bundled defaults; public GET does not create documents',async()=>{const r=await req(null,'/experience/home');assert.equal(r.data.data,null);assert.equal(await Experience.countDocuments(),0);});
 await t.test('Guest and customer cannot read or mutate drafts',async()=>{assert.equal((await req(null,path)).status,401);assert.equal((await req(customer,path)).status,403);assert.equal((await req(customer,path+'/draft',{expectedRevision:0,config},'PUT')).status,403);});
 await t.test('Writes require both Origin and CSRF',async()=>{assert.equal((await req(admin,path+'/draft',{expectedRevision:0,config},'PUT',{'X-CSRF-Token':''})).status,403);assert.equal((await req(admin,path+'/draft',{expectedRevision:0,config},'PUT',{Origin:'https://other.test'})).status,403);});
 await t.test('Concurrent first saves produce one revision, not two home documents',async()=>{const rs=await Promise.all([req(admin,path+'/draft',{expectedRevision:0,config},'PUT'),req(admin,path+'/draft',{expectedRevision:0,config},'PUT')]);assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);revision=1;assert.equal(await Experience.countDocuments(),1);});
 await t.test('Draft remains private and public has not changed',async()=>{assert.equal((await req(null,'/experience/home')).data.data,null);assert.equal((await req(admin,path)).data.data.revision,revision);});
 await t.test('Invalid numeric, path and executable config writes do not change the revision',async()=>{for(const patch of [{returnSeconds:99},{modelUrl:'https://remote.test/a.glb'},{javascript:'alert(1)'}]){const r=await req(admin,path+'/draft',{expectedRevision:revision,config:{...config,...patch}},'PUT');assert.equal(r.status,400);}assert.equal((await req(admin,path)).data.data.revision,revision);});
 await t.test('Publication binds to a real asset and exposes neither draft nor history',async()=>{const r=await req(admin,path+'/publish',{expectedRevision:revision});assert.equal(r.status,200);revision=r.data.data.revision;const pub=await req(null,'/experience/home');assert.equal(pub.data.data.version,revision);assert.match(pub.data.data.binding.sha256,/^[a-f0-9]{64}$/);assert.equal(pub.data.data.draft,undefined);assert.equal(pub.data.data.history,undefined);});
 const first=revision;
 await t.test('Stale editors cannot overwrite draft or publish',async()=>{assert.equal((await req(admin,path+'/draft',{expectedRevision:0,config},'PUT')).status,409);assert.equal((await req(admin,path+'/publish',{expectedRevision:0})).status,409);});
 await t.test('Editing a draft never changes the public configuration',async()=>{config.chapters[0].title=['Precision','in motion.'];const r=await req(admin,path+'/draft',{expectedRevision:revision,config},'PUT');assert.equal(r.status,200);revision=r.data.data.revision;assert.equal((await req(null,'/experience/home')).data.data.version,first);});
 await t.test('Concurrent publish calls have one winner',async()=>{const rs=await Promise.all([req(admin,path+'/publish',{expectedRevision:revision}),req(admin,path+'/publish',{expectedRevision:revision})]);assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);revision++;assert.equal((await req(admin,path)).data.data.history.length,2);});
 await t.test('Restoring creates a new publication and restores the saved draft atomically',async()=>{const r=await req(admin,path+'/restore',{expectedRevision:revision,version:first});assert.equal(r.status,200);assert.equal(r.data.data.revision,revision+1);revision++;assert.equal(r.data.data.published.version,revision);assert.equal(r.data.data.draft.chapters[0].title[0],DEFAULT_EXPERIENCE.chapters[0].title[0]);});
 await t.test('Hidden product falls back publicly and cannot be newly published',async()=>{await Product.updateOne({id:config.productId},{$set:{active:false}});assert.equal((await req(null,'/experience/home')).data.data,null);assert.equal((await req(admin,path+'/publish',{expectedRevision:revision})).status,409);await Product.updateOne({id:config.productId},{$set:{active:true}});});
 await t.test('Changed product asset cannot silently reuse published camera/rig settings',async()=>{await Product.updateOne({id:config.productId},{$set:{modelUrl:'/models/new-asset.glb'}});assert.equal((await req(null,'/experience/home')).data.data,null);assert.equal((await req(admin,path+'/publish',{expectedRevision:revision})).status,409);await Product.updateOne({id:config.productId},{$set:{modelUrl:config.modelUrl}});});
 await t.test('Corrupt local GLB is rejected without saving a draft',async()=>{const name='studio-invalid-'+randomUUID();const file=new URL('../frontend/public/models/'+name+'.glb',import.meta.url);await writeFile(file,'not a model',{flag:'wx'});temporary.push(file);await Product.create({...catalog.products[0],_id:undefined,id:name,slug:name,modelUrl:'/models/'+name+'.glb'});assert.equal((await req(admin,path+'/draft',{expectedRevision:revision,config:{...config,productId:name,modelUrl:'/models/'+name+'.glb'}},'PUT')).status,400);await Product.deleteOne({id:name});});
 await t.test('Restart retrieves the same publication from MongoDB',async()=>{await stop();await start();assert.equal((await req(null,'/experience/home')).data.data.version,revision);});
 await t.test('Publishing enabled=false provides an explicit legacy Home rollback',async()=>{const current=(await req(admin,path)).data.data.draft;const r=await req(admin,path+'/draft',{expectedRevision:revision,config:{...current,enabled:false}},'PUT');assert.equal(r.status,200);revision++;assert.equal((await req(admin,path+'/publish',{expectedRevision:revision})).status,200);revision++;assert.equal((await req(null,'/experience/home')).data.data.config.enabled,false);});
 await t.test('No catalog, user role or order mutation was caused by publication',async()=>{assert.equal(await Product.countDocuments(),20);assert.equal(await Vehicle.countDocuments(),8);assert.equal(await Order.countDocuments(),0);assert.equal((await User.findById(customer.id)).role,'customer');});
 }finally{for(const f of temporary)await unlink(f).catch(()=>{});await stop();await mongoose.connection.dropDatabase();await mongoose.disconnect();}
});
