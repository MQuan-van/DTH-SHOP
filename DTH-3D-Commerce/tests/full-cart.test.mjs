import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectCartPage, reviewSignature, retargetCartLine, rememberPrices, reviewedPriceChanges, actorKey, productPath, matchingPartsPath, payloadSignature } from '../frontend/src/shop/cart/page/cartPage.logic.mjs';
import { getCartIntent, finishCartIntent, createCheckoutController } from '../frontend/src/shop/cart/page/checkoutSession.mjs';
import { createCartState } from '../frontend/src/shop/cart/cartState.mjs';
const data = () => ({ products: [
  { id:'part-a', slug:'part-a', name:'Part A', category:'suspension', price:2800000, active:true, vehicleIds:['bike-a','bike-b'] },
  { id:'part-b', slug:'part-b', name:'Part B', category:'wheels', price:1200000, active:true, vehicleIds:['bike-b'] },
], vehicles:[{ id:'bike-a',make:'Demo',model:'Street',year:2022 },{ id:'bike-b',make:'Demo',model:'Road',year:2024 }] });
const line = (quantity=2) => ({ productId:'part-a', vehicleId:'bike-a', quantity });
const view = () => inspectCartPage([line()],data());
const storage = () => {const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const clone = value => structuredClone(value);

test('empty cart has zero total and no review',()=>{const v=inspectCartPage([],data());assert.equal(v.subtotal,0);assert.equal(v.canReview,false);});
test('subtotal is integer VND from catalog',()=>{const v=view();assert.equal(v.subtotal,5600000);assert.equal(v.lines[0].unitPrice,2800000);assert.equal(v.canReview,true);});
test('two line vehicles remain distinct',()=>{const v=inspectCartPage([line(),{...line(1),vehicleId:'bike-b'}],data());assert.equal(v.vehicleCount,2);assert.equal(v.lines.length,2);assert.equal(v.count,3);});
test('client-supplied price is not authority',()=>{const v=inspectCartPage([{...line(),price:1,unitPrice:1,lineTotal:1}],data());assert.equal(v.subtotal,5600000);});
for (const [label,edit,status] of [
 ['inactive',d=>{d.products[0].active=false;},'unavailable'],
 ['removed',d=>{d.products=[];},'unavailable'],
 ['mismatch',d=>{d.products[0].vehicleIds=['bike-b'];},'incompatible'],
 ['unknown mapping',d=>{delete d.products[0].vehicleIds;},'unknown'],
 ['unknown vehicle',d=>{d.vehicles=d.vehicles.slice(1);},'unknown'],
]) test(`${label} never receives a misleading valid total`,()=>{const d=data();edit(d);const v=inspectCartPage([line()],d);assert.equal(v.lines[0].status,status);assert.equal(v.canReview,false);assert.equal(v.subtotal,null);assert.equal(v.lines.length,1);});
for(const price of [0,-1,NaN,Infinity,0.5,1000000001,'2800000',null])test(`invalid price ${price} is explicit`,()=>{const d=data();d.products[0].price=price;const v=inspectCartPage([line()],d);assert.equal(v.lines[0].status,'price-unavailable');assert.equal(v.quote,null);});
for(const quantity of [0,-1,11,1.5,'2'])test(`invalid quantity ${quantity} blocks review`,()=>{assert.equal(inspectCartPage([line(quantity)],data()).canReview,false);});
test('catalog loading cannot become a valid quote',()=>{assert.equal(inspectCartPage([line()],data(),{loading:true}).canReview,false);});
test('catalog error preserves row but blocks total',()=>{const v=inspectCartPage([line()],data(),{error:'offline'});assert.equal(v.lines.length,1);assert.equal(v.subtotal,null);});
test('mixed valid and invalid cart has no partial total disguised as full',()=>{const v=inspectCartPage([line(),{productId:'part-b',vehicleId:'bike-a',quantity:1}],data());assert.equal(v.subtotal,null);assert.equal(v.issueCount,1);});
test('selected global vehicle is irrelevant to existing bag validation',()=>{assert.deepEqual(inspectCartPage([line()],data(),{vehicleId:'bike-b'}),view());});
test('a different line vehicle changes its label in a review',()=>{const a=reviewSignature('flow:one',view());const b=reviewSignature('flow:one',inspectCartPage([{...line(),vehicleId:'bike-b'}],data()));assert.notEqual(a,b);});
test('review fingerprints include actor',()=>assert.notEqual(reviewSignature('flow:a',view()),reviewSignature('flow:b',view())));
test('review fingerprints include current prices',()=>{const d=data();d.products[0].price++;assert.notEqual(reviewSignature('a',view()),reviewSignature('a',inspectCartPage([line()],d)));});
test('review fingerprints include visible vehicle label',()=>{const d=data();d.vehicles[0].model='New label';assert.notEqual(reviewSignature('a',view()),reviewSignature('a',inspectCartPage([line()],d)));});
test('review fingerprints include quantities',()=>assert.notEqual(reviewSignature('a',view()),reviewSignature('a',inspectCartPage([line(3)],data()))));
test('invalid review has empty signature',()=>assert.equal(reviewSignature('a',inspectCartPage([],data())),''));
test('price differences require an observed previous review',()=>assert.deepEqual(reviewedPriceChanges([],view()),[]));
test('price changes report before and after accurately',()=>{const old=rememberPrices(view()),d=data();d.products[0].price=2950000;assert.deepEqual(reviewedPriceChanges(old,inspectCartPage([line()],d)),[{key:'part-a:bike-a',name:'Part A',before:2800000,after:2950000}]);});
test('quantity alone is not called price change',()=>assert.deepEqual(reviewedPriceChanges(rememberPrices(view()),inspectCartPage([line(4)],data())),[]));
test('invalid new price is not displayed as price comparison',()=>{const d=data();d.products[0].price=NaN;assert.deepEqual(reviewedPriceChanges(rememberPrices(view()),inspectCartPage([line()],d)),[]);});
test('retarget changes only explicitly selected line',()=>{const input=[line(),{productId:'part-b',vehicleId:'bike-b',quantity:1}];const copy=clone(input);const out=retargetCartLine(input,'part-a','bike-a','bike-b',data());assert.equal(out.ok,true);assert.deepEqual(input,copy);assert.equal(out.bag.find(i=>i.productId==='part-b').quantity,1);assert.equal(out.bag.find(i=>i.productId==='part-a').vehicleId,'bike-b');});
test('retarget combines matching destination once',()=>{const out=retargetCartLine([line(2),{...line(3),vehicleId:'bike-b'}],'part-a','bike-a','bike-b',data());assert.equal(out.merged,true);assert.deepEqual(out.bag,[{...line(5),vehicleId:'bike-b'}]);});
test('retarget refuses overflow, never clamps away paid-for quantity',()=>{const input=[line(6),{...line(5),vehicleId:'bike-b'}];assert.equal(retargetCartLine(input,'part-a','bike-a','bike-b',data()).ok,false);assert.equal(input[0].quantity,6);});
test('retarget refuses unknown vehicle',()=>assert.equal(retargetCartLine([line()],'part-a','bike-a','unknown',data()).ok,false));
test('retarget refuses mismatching vehicle',()=>assert.equal(retargetCartLine([{productId:'part-b',vehicleId:'bike-b',quantity:1}],'part-b','bike-b','bike-a',data()).ok,false));
test('retarget refuses inactive product',()=>{const d=data();d.products[0].active=false;assert.equal(retargetCartLine([line()],'part-a','bike-a','bike-b',d).ok,false);});
test('retarget missing line changes nothing',()=>assert.equal(retargetCartLine([],'part-a','bike-a','bike-b',data()).ok,false));
test('transaction buffer preserves consecutive changes before render',()=>{const state=createCartState([line(2)]);state.quantity('part-a','bike-a',3,data());state.replace(bag=>retargetCartLine(bag,'part-a','bike-a','bike-b',data()).bag);assert.equal(state.read()[0].quantity,3);assert.equal(state.read()[0].vehicleId,'bike-b');});
test('payload ordering is stable for retry',()=>{const a=[line(),{productId:'part-b',vehicleId:'bike-b',quantity:1}];assert.equal(payloadSignature(a),payloadSignature([...a].reverse()));});
test('payload rejects invalid rows',()=>assert.equal(payloadSignature([line(11)]),''));
test('safe product paths only',()=>{for(const slug of ['//evil','../outside','x?next=//evil','<script>',''])assert.equal(productPath({slug}),null);assert.equal(productPath({slug:'apex-suspension'}),'/products/apex-suspension');});
test('alternative URL does not inject arbitrary category',()=>{assert.equal(matchingPartsPath({category:'wheels'}),'/shop?fit=match&category=wheels');assert.equal(matchingPartsPath({category:'x&bad=1'}),'/shop?fit=match');});
test('mode and account keys separated',()=>{assert.notEqual(actorKey('flow',{id:'a'}),actorKey('api',{id:'a'}));assert.notEqual(actorKey('flow',{id:'a'}),actorKey('flow',null));});
test('same attempt survives retry and only clears matching ID',()=>{const s=storage();let n=0;const opts={storage:s,uuid:()=>`intent-${++n}`};const a=getCartIntent('flow','actorX:payload',opts);assert.equal(getCartIntent('flow','actorX:payload',opts).id,a.id);finishCartIntent('flow','other-id',s);assert.equal(getCartIntent('flow','actorX:payload',opts).id,a.id);finishCartIntent('flow',a.id,s);assert.notEqual(getCartIntent('flow','actorX:payload',opts).id,a.id);});
test('blocked storage uses memory without crashing',()=>{const s={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};const a=getCartIntent('preview','blocked-unique',{storage:s,uuid:()=> 'blocked-123'});assert.equal(getCartIntent('preview','blocked-unique',{storage:s,uuid:()=> 'other-123'}).id,a.id);finishCartIntent('preview',a.id,s);});
function setup(request) {
 let state={bag:[line()],data:data(),actor:'flow:test-user',identity:1,mode:'flow',canSubmit:true};
 const events=[];
 const ctl=createCheckoutController({getCurrent:()=>state,requestOrder:request,onPending:v=>events.push(['pending',v]),onSuccess:(o,p)=>events.push(['success',o,p]),onFailure:e=>events.push(['failure',e.status]),storage:storage(),uuid:()=> 'request-12345'});
 return {ctl,events,get state(){return state;},set state(v){state=v;},signature:()=>reviewSignature(state.actor,inspectCartPage(state.bag,state.data))};
}
const order={id:'FLOW-ORDER-12345',total:5600000,lines:[line()]};
test('submit sends only line payload + expected catalog total',async()=>{let args;const t=setup(async(...a)=>{args=a;return order;});assert.equal((await t.ctl.submit(t.signature())).ok,true);assert.deepEqual(args[0],[line()]);assert.equal(args[2],true);assert.equal(args[4],5600000);assert.equal(t.events.filter(e=>e[0]==='success').length,1);});
test('same-frame double submit sends only one request',async()=>{let done,calls=0;const t=setup(()=>{calls++;return new Promise(r=>done=r);});const a=t.ctl.submit(t.signature());const b=await t.ctl.submit(t.signature());assert.equal(b.ignored,true);done(order);await a;assert.equal(calls,1);});
test('submission refused without acknowledgement',async()=>{let calls=0;const t=setup(async()=>{calls++;return order;});await t.ctl.submit('');assert.equal(calls,0);});
test('submission refused on stale reviewed price',async()=>{let calls=0;const t=setup(async()=>{calls++;return order;});const signature=t.signature();t.state.data.products[0].price++;await t.ctl.submit(signature);assert.equal(calls,0);});
test('submission refused for unauthenticated flow',async()=>{let calls=0;const t=setup(async()=>{calls++;return order;});t.state.canSubmit=false;await t.ctl.submit(t.signature());assert.equal(calls,0);});
test('failed request permits same intent retry',async()=>{const ids=[];const t=setup(async(_,id)=>{ids.push(id);if(ids.length===1)throw Error('Network');return order;});await t.ctl.submit(t.signature());await t.ctl.submit(t.signature());assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);});
test('409 leaves error for re-review and unlocks controls',async()=>{const t=setup(async()=>{throw Object.assign(Error('Price changed'),{status:409});});await t.ctl.submit(t.signature());assert.deepEqual(t.events.at(-2),['failure',409]);assert.equal(t.ctl.isPending(),false);});
test('malformed confirmation does not clear bag',async()=>{const t=setup(async()=>({id:'broken'}));await t.ctl.submit(t.signature());assert.equal(t.events.some(e=>e[0]==='success'),false);});
test('response after unmount cannot navigate or clear bag',async()=>{let done;const t=setup(()=>new Promise(r=>done=r));const promise=t.ctl.submit(t.signature());t.ctl.dispose();done(order);await promise;assert.equal(t.events.some(e=>e[0]==='success'),false);});
test('response after account change is discarded',async()=>{let done;const t=setup(()=>new Promise(r=>done=r));const promise=t.ctl.submit(t.signature());t.state={...t.state,actor:'flow:other',identity:2};done(order);await promise;assert.equal(t.events.some(e=>e[0]==='success'),false);});
test('account switch away and back uses identity epoch',async()=>{let done;const t=setup(()=>new Promise(r=>done=r));const promise=t.ctl.submit(t.signature());t.state={...t.state,identity:3};done(order);await promise;assert.equal(t.events.some(e=>e[0]==='success'),false);});
test('changed bag is identified before clear by supplied payload',async()=>{const t=setup(async()=>order);const before=payloadSignature(t.state.bag);await t.ctl.submit(t.signature());const [, ,payload]=t.events.find(e=>e[0]==='success');assert.equal(payload,before);assert.notEqual(payload,payloadSignature([line(3)]));});
test('full cart does not import WebGL or 3D model loader',async()=>{for(const file of ['FullCartPage.jsx','BagLine.jsx']){const s=await readFile(new URL('../frontend/src/shop/cart/page/'+file,import.meta.url),'utf8');assert.doesNotMatch(s,/from ['"](?:three|@react-three)|<Canvas/);}});
