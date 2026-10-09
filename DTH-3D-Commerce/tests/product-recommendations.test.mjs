import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { selectProductRecommendations as select, rankRecommendations, recommendationBrowseHref,
  recommendationLinkState, recommendationProductHref, recommendationSignature, recommendationTilt,
  isRecommendationProduct } from '../frontend/src/shop/product/recommendations/recommendation.logic.mjs';
import { CATEGORIES, fitment } from '../shared/domain.mjs';
const vehicles = [
  { id:'v1', make:'Demo Moto', model:'One',year:2023 },
  { id:'v2', make:'Demo Moto', model:'Two',year:2024 },
];
const item=(id, extra={}) => ({ id,slug:id,name:id,category:'suspension',price:1000000,currency:'VND',vehicleIds:['v1'],active:true,...extra });
const current=item('current');
const run=(extra={}) => select({currentProduct:current,products:[current],vehicles,vehicleId:'v1',...extra});
const names=r=>r.items.map(p=>p.id);
const clone=value=>JSON.parse(JSON.stringify(value));
const freeze=value=>{if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

test('no vehicle means no guessed recommendations',()=>{
  const r=run({vehicleId:'',products:[item('other')]});assert.equal(r.mode,'unselected');assert.deepEqual(r.items,[]);
});
test('missing/invalid vehicle data returns unknown, not incompatible',()=>{
  for(const [id,vs] of [['gone',vehicles],['v1',null],[{id:'v1'},vehicles],['v1',[null]]]){
    const r=run({vehicleId:id,vehicles:vs});assert.equal(r.mode,'unknown-vehicle');assert.equal(r.matchStatus,'unknown');assert.equal(r.items.length,0);
  }
});
test('duplicate vehicle identity is not silently treated as verified',()=>{
  assert.equal(run({vehicles:[...vehicles,vehicles[0]]}).mode,'unknown-vehicle');
});
test('matching current product selects other categories only',()=>{
  const r=run({products:[current,item('same'),item('w',{category:'wheels'}),item('b',{category:'brakes'})]});
  assert.equal(r.mode,'build');assert.deepEqual(names(r),['w','b']);
});
test('mismatch selects only same category with an explicit mapping',()=>{
  const r=run({currentProduct:item('current',{vehicleIds:['v2']}),products:[item('yes'),item('bad',{vehicleIds:['v2']}),item('wheel',{category:'wheels'})]});
  assert.equal(r.mode,'alternatives');assert.deepEqual(names(r),['yes']);
});
test('unknown current mapping keeps unknown wording and may offer mapped peers',()=>{
  const r=run({currentProduct:item('current',{vehicleIds:null}),products:[item('yes'),item('wheel',{category:'wheels'})]});
  assert.equal(r.mode,'unknown');assert.equal(r.matchStatus,'unknown');assert.deepEqual(names(r),['yes']);
});
test('empty mapping is a known no-match, not missing data',()=>{
  assert.equal(run({currentProduct:item('current',{vehicleIds:[]})}).mode,'alternatives');
});
test('missing or unusable current reference produces no filler',()=>{
  for(const p of [null,{},item('current',{category:'bad'}),item('current',{active:false}),item('../x'),item('current',{slug:'//bad'})]){
    const r=run({currentProduct:p,products:[item('a')]});assert.equal(r.mode,'unavailable');assert.equal(r.items.length,0);
  }
});
test('current product excluded by either ID or slug',()=>{
  const c=item('current',{vehicleIds:['v2']});
  assert.deepEqual(names(run({currentProduct:c,products:[item('current'),item('alias',{slug:'current'}),item('peer')]})),['peer']);
});
for(const [title,patch] of [
  ['inactive',{active:false}],['missing mapping',{vehicleIds:undefined}],['null mapping',{vehicleIds:null}],
  ['incompatible',{vehicleIds:['v2']}],['invalid category',{category:'forklift'}],
  ['string price',{price:'100'}],['zero price',{price:0}],['negative price',{price:-5}],
  ['non-integer price',{price:3.5}],['NaN price',{price:NaN}],['infinite price',{price:Infinity}],
  ['oversized price',{price:1000000001}],['wrong currency',{currency:'USD'}],
  ['unsafe slug',{slug:'../../shop'}],['empty name',{name:' '}],['non-string name',{name:77}],
]) test(`candidate rejected: ${title}`,()=>{
  const r=run({currentProduct:item('current',{vehicleIds:['v2']}),products:[item('candidate',patch)]});assert.equal(r.items.length,0);
});
test('legacy omitted active and currency flags remain eligible',()=>{
  const p=item('a',{active:undefined,currency:undefined});assert.equal(isRecommendationProduct(p),true);
});
test('duplicates are excluded entirely, even if one row would otherwise pass',()=>{
  assert.deepEqual(names(run({currentProduct:item('current',{vehicleIds:[]}),products:[item('x'),item('x',{active:false}),item('a',{slug:'dup'}),item('b',{slug:'dup'}),item('valid')]})),['valid']);
});
test('source arrays are not sorted/mutated and frozen inputs work',()=>{
  const input=freeze({currentProduct:current,products:[current,item('z',{category:'wheels'}),item('a',{category:'wheels'})],vehicles,vehicleId:'v1'});
  const before=JSON.stringify(input);select(input);assert.equal(JSON.stringify(input),before);
});
test('ranking is featured then price-distance then name then ID',()=>{
  const pool=[item('z',{name:'Tie',price:1000005}),item('a',{name:'Tie',price:1000005}),item('far',{featured:true,price:5000000}),item('closest'),item('near',{price:1000002})];
  assert.deepEqual(rankRecommendations(pool,1000000).map(p=>p.id),['far','closest','near','a','z']);
  assert.equal(pool[0].id,'z');
});
test('featured uses real boolean, not arbitrary truthy data',()=>{
  assert.equal(rankRecommendations([item('a',{featured:'yes',price:5000000}),item('b')],1000000)[0].id,'b');
});
test('invalid current price has a deterministic name/ID fallback',()=>{
  for(const price of [NaN,0,undefined,'10'])assert.deepEqual(rankRecommendations([item('b'),item('a')],price).map(p=>p.id),['a','b']);
});
test('one product per build category, stable category order',()=>{
  const pool=CATEGORIES.flatMap(cat=>[item(`${cat}-b`,{category:cat}),item(`${cat}-a`,{category:cat})]);
  const r=run({products:pool});assert.equal(new Set(r.items.map(p=>p.category)).size,4);
  assert.deepEqual(r.items.map(p=>p.category),CATEGORIES.filter(c=>c!=='suspension'));
});
test('fewer than four eligible categories never fills with unrelated items',()=>{
  const r=run({products:[item('a',{category:'wheels'}),item('b',{category:'wheels'})]});
  assert.equal(r.items.length,1);assert.equal(r.candidateCount,2);
});
test('limits are bounded from one to four',()=>{
  const pool=Array.from({length:9},(_,i)=>item(`p-${i}`));
  for(const [limit,count] of [[1,1],[2,2],[100,4],[0,1],[NaN,4],['2',4]])assert.equal(run({currentProduct:item('current',{vehicleIds:[]}),products:pool,limit}).items.length,count);
});
test('catalog reordering cannot change the selected IDs',()=>{
  const pool=[item('c'),item('a'),item('b')], currentProduct=item('current',{vehicleIds:[]});
  assert.deepEqual(names(run({currentProduct,products:pool})),names(run({currentProduct,products:[...pool].reverse()})));
});
test('changing vehicle immediately changes eligible results, no retained previous list',()=>{
  const pool=[item('one',{category:'wheels'}),item('two',{vehicleIds:['v2']})];
  assert.deepEqual(names(run({products:pool,vehicleId:'v1'})),['one']);
  assert.deepEqual(names(run({products:pool,vehicleId:'v2'})),['two']);
});
test('inactive refresh removes a previously recommended product',()=>{
  const p=item('peer',{category:'wheels'});assert.equal(run({products:[p]}).items.length,1);
  assert.equal(run({products:[{...p,active:false}]}).items.length,0);
});
test('null catalog and malformed rows never throw or invent data',()=>{
  for(const products of [null,undefined,{},[null,7,[],{}]])assert.deepEqual(run({products}).items,[]);
});
test('bag-like input is not read or mutated',()=>{
  const bag=freeze([{productId:'current',vehicleId:'v2',quantity:2}]);const before=JSON.stringify(bag);
  select({currentProduct:current,products:[item('wheel',{category:'wheels'})],vehicles,vehicleId:'v1',bag});assert.equal(JSON.stringify(bag),before);
});
test('Back to Shop query is preserved through each product link',()=>{
  const source='/shop?q=apex&category=wheels&max=3200000&sort=price-low&page=2';
  assert.deepEqual(recommendationLinkState(source),{fromShop:source});
});
test('unsafe Back locations are rejected',()=>{
  for(const p of ['https://evil.test/shop','//evil.test/shop','/shopper','/shop/../admin','/shop\\bad',null])assert.equal(recommendationLinkState(p).fromShop,'/shop');
});
test('browse link explicitly requests vehicle matches without stale search filters',()=>{
  assert.equal(recommendationBrowseHref('alternatives','wheels'),'/shop?fit=match&category=wheels');
  assert.equal(recommendationBrowseHref('build','wheels'),'/shop?fit=match');
  assert.equal(recommendationBrowseHref('unknown','brakes'),'/shop?fit=match&category=brakes');
  assert.equal(recommendationBrowseHref('unknown-vehicle','wheels'),'/shop');
});
test('invalid product links do not become arbitrary navigation URLs',()=>{
  assert.equal(recommendationProductHref({slug:'apex-suspension'}),'/products/apex-suspension');
  for(const slug of ['/admin','..','javascript:alert(1)','a?x=1','a'.repeat(81),undefined])assert.equal(recommendationProductHref({slug}),null);
});
test('signature changes with vehicle/price/route/image, not unrelated cart data',()=>{
  const a=run({products:[item('w',{category:'wheels'})]});const b=clone(a);b.items[0].price+=1;assert.notEqual(recommendationSignature(a),recommendationSignature(b));
  b.items[0].price=a.items[0].price;assert.equal(recommendationSignature(a),recommendationSignature(b));
});
test('pointer tilt is finite and bounded, including invalid input',()=>{
  assert.deepEqual(recommendationTilt(50,50,100,100),{x:-0,y:0});
  for(const data of [[-100,1000,100,100],[Infinity,0,10,10],[1,1,0,4],[NaN,2,3,4]]){
    const t=recommendationTilt(...data);assert.ok(Number.isFinite(t.x)&&Number.isFinite(t.y));assert.ok(Math.abs(t.x)<=3&&Math.abs(t.y)<=4);
  }
});
test('all bundled catalog recommendations are real mapped records',()=>{
  const data=JSON.parse(readFileSync(new URL('../shared/catalog.json',import.meta.url),'utf8'));
  for(const p of data.products)for(const v of data.vehicles){const r=select({currentProduct:p,products:data.products,vehicles:data.vehicles,vehicleId:v.id});
    for(const q of r.items){assert.notEqual(q.id,p.id);assert.equal(fitment(q,v.id,data.vehicles).status,'compatible');assert.ok(q.active!==false);
      assert.equal(q.category===p.category,r.mode!=='build');}}
});
test('recommendation package has no GLB loader or cart mutation dependency',()=>{
  const dir=fileURLToPath(new URL('../frontend/src/shop/product/recommendations/',import.meta.url));
  for(const name of readdirSync(dir).filter(n=>/\.(jsx|js|mjs)$/.test(n))){const s=readFileSync(`${dir}/${name}`,'utf8');assert.doesNotMatch(s,/from ['"](?:three|@react-three)|fetch\(|useGLTF\(|useStore\(|setBag\(|\.add\(/);}
});

test('malformed mapping stays consistent with the existing FitmentStatus helper',()=>{
  const r=run({currentProduct:item('current',{vehicleIds:['v1',17]}),products:[item('bad',{vehicleIds:['v1',null]}),item('good')]});
  assert.equal(r.matchStatus,'unknown');assert.equal(r.mode,'unknown');assert.deepEqual(names(r),['good']);
});
