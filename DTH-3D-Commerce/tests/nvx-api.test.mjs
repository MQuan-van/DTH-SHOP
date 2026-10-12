/** Actual cart route factory; database reads and Express response are test doubles. No MongoDB access. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { installCart } from '../backend/commerce/cart/routes.mjs';
import { NVX_IDS, buildNVXDemoCatalog, nvxVehicleQuery } from '../shared/nvx.mjs';
import { makeNVXBaselineFixture } from './nvx-fixtures.mjs';
const data = buildNVXDemoCatalog(makeNVXBaselineFixture());
function setup({generic=false, products=data.products, vehicles=data.vehicles}={}) {
  let handlers, calls=[];
  const model=(collection,records)=>({find(query){calls.push({collection,query});return {select(){return {lean:async()=>records.filter(r=>query.id.$in.includes(r.id))}}}}});
  const router={post(route,...steps){assert.equal(route,'/cart/quote');handlers=steps}};
  installCart(router,{Product:model('products',products),Vehicle:model('vehicles',vehicles),...(!generic?{vehicleQuery:nvxVehicleQuery}:{})});
  async function request(items){let data,error,headers={},status=200;const req={body:{items},ip:'127.0.0.1'},res={set(k,v){headers[k]=v;return this},setHeader(k,v){headers[k]=v},status(s){status=s;return this},json(v){data=v;return this}};let pending; handlers[0](req,res,()=>{pending=handlers[1](req,res,e=>{error=e})}); await pending;return {data,error,headers,status};}
  return {request,calls};
}
const line=(vehicleId=NVX_IDS[0],productId='apex-suspension',quantity=1)=>({vehicleId,productId,quantity});
test('cart API factory accepts the scoped NVX query and returns an authoritative quote',async()=>{const f=setup(),r=await f.request([line()]);assert.ifError(r.error);assert.equal(r.data.data.valid,true);assert.equal(r.data.data.source,'api');assert.equal(r.data.data.lines[0].vehicleLabel,'Yamaha NVX V1');assert.equal(r.headers['Cache-Control'],'no-store');});
test('valid-looking legacy request cannot broaden the NVX database query',async()=>{const f=setup({vehicles:[...data.vehicles,{id:'street155-2022',make:'Demo Moto',model:'Street155',year:2022}]});const r=await f.request([line('street155-2022')]);assert.ifError(r.error);assert.equal(r.data.data.valid,false);assert.deepEqual(f.calls.find(c=>c.collection==='vehicles').query.id.$in,[])});
test('per-line versions remain distinct in the API payload',async()=>{const f=setup(),r=await f.request([line(),line(NVX_IDS[1],'vector-suspension'),line(NVX_IDS[2],'touring-suspension')]);assert.equal(r.data.data.valid,true);assert.equal(new Set(r.data.data.lines.map(l=>l.vehicleId)).size,3)});
test('wrong NVX/product combination returns an invalid review, not a fabricated fit',async()=>{const r=await setup().request([line(NVX_IDS[2])]);assert.equal(r.data.data.valid,false);assert.equal(r.data.data.total,null);assert.equal(r.data.data.lines[0].status,'incompatible')});
test('malformed IDs fail before any database read',async()=>{const f=setup(),r=await f.request([line({$ne:null})]);assert.ok(r.error);assert.equal(f.calls.length,0)});
test('excessive quantity fails before a query',async()=>{const f=setup(),r=await f.request([line(NVX_IDS[0],'apex-suspension',11)]);assert.ok(r.error);assert.equal(f.calls.length,0)});
test('caller-provided price and total cannot control the server total',async()=>{const r=await setup().request([{...line(),unitPrice:1,total:1}]);assert.equal(r.data.data.total,data.products[0].price)});
test('generic injected factory remains backwards-compatible for existing isolated tests',async()=>{const p={...data.products[0],vehicleIds:['old']};const r=await setup({generic:true,products:[p],vehicles:[{id:'old',make:'Test',model:'Legacy',year:2020}]}).request([line('old')]);assert.equal(r.data.data.valid,true);assert.equal(r.data.data.lines[0].vehicleLabel,'Test Legacy · 2020')});
