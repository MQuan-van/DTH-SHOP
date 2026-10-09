import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { MODES, LAYOUTS, NVX_IDS, readDiscovery, changeMode, changeLayout, changeSpotlight, discoveryHref, selectSpotlight, nvxChoices, buildProducts, clampQuantity, buildContextKey, sanitizeDraft, pinProduct } from '../frontend/src/shop/discovery174/discovery.logic.mjs';
import { PHOTOS, VEHICLE_PHOTOS } from '../frontend/src/shop/discovery174/discovery.config.mjs';
import { revealNodes, pointerOffset } from '../frontend/src/shop/discovery174/discoveryMotion.mjs';
const vehicles=NVX_IDS.map((id,i)=>({id,make:'Yamaha',model:`NVX V${i+1}`}));
const products=[
  {id:'wheel-one',category:'wheels',price:100,featured:true,vehicleIds:[NVX_IDS[0]]},
  {id:'wheel-two',category:'wheels',price:200,vehicleIds:[NVX_IDS[0],NVX_IDS[1]]},
  {id:'brake-one',category:'brakes',price:150,vehicleIds:[NVX_IDS[0]]},
  {id:'hidden',category:'mirrors',active:false,vehicleIds:[NVX_IDS[0]]},
  {id:'bad-map',category:'mirrors',vehicleIds:[NVX_IDS[0],null]},
];
const source=async name=>readFile(new URL(`../frontend/src/shop/discovery174/${name}`,import.meta.url),'utf8');

test('default /shop keeps the fast existing catalog and old bookmarks',()=>assert.equal(readDiscovery('').mode,'shop'));
for(const mode of MODES)test(`explicit ${mode} mode`,()=>assert.equal(readDiscovery(`mode=${mode}`).mode,mode));
for(const input of ['q=wheel','category=wheels','max=1','page=3','sort=price-low','fit=all','mode=unknown','mode=https://evil.test'])test(`legacy / invalid mode ${input}`,()=>assert.equal(readDiscovery(input).mode,'shop'));
test('opt-in default explore never overrides old filtered URLs',()=>{
 assert.equal(readDiscovery('','explore').mode,'explore');assert.equal(readDiscovery('q=wheel','explore').mode,'shop');assert.equal(readDiscovery('','invalid').mode,'shop');
});
for(const mode of MODES)test(`mode ${mode} preserves every unrelated query and pagination`,()=>{
 const start=new URLSearchParams('q=apex&category=wheels&category=brakes&max=3200000&fit=all&sort=price-high&page=2&campaign=hello');
 const result=changeMode(start,mode);const back=new URLSearchParams(result);back.delete('mode');assert.equal(back.toString(),start.toString());
});
for(const mode of ['',null,{},'SHOP','//else'])test(`invalid mode rejected ${String(mode)}`,()=>assert.throws(()=>changeMode('',mode)));
for(const layout of LAYOUTS)test(`layout ${layout} keeps context`,()=>{const next=changeLayout('q=apex&mode=build&page=2',layout);assert.equal(readDiscovery(next).layout,layout);assert.equal(next.get('q'),'apex');assert.equal(next.get('page'),'2');assert.equal(next.get('mode'),'shop');});
test('invalid layout defaults / rejected on write',()=>{assert.equal(readDiscovery('layout=evil').layout,'grid');assert.throws(()=>changeLayout('','oops'));});
test('spotlight preserves filters without mutating source',()=>{const p=new URLSearchParams('mode=explore&q=apex&page=2');const s=changeSpotlight(p,'apex-suspension');assert.equal(s.get('spotlight'),'apex-suspension');assert.equal(p.has('spotlight'),false);assert.equal(s.get('page'),'2');});
for(const id of ['../bad','<script>','', 'a'.repeat(81),null,{}])test(`bad spotlight ${String(id).slice(0,15)}`,()=>{assert.throws(()=>changeSpotlight('',id));if (id !== null) assert.equal(readDiscovery(`spotlight=${encodeURIComponent(String(id))}`).spotlight,'');});
test('href cannot redirect off-site and encodes query values',()=>assert.equal(discoveryHref('q=https://example.com&a=1'),'/shop?q=https%3A%2F%2Fexample.com&a=1'));
test('filtered-out spotlight never reappears from full catalog',()=>assert.equal(selectSpotlight([products[1]],products[0].id).id,products[1].id));
test('empty spotlight has explicit empty state',()=>assert.equal(selectSpotlight([], 'old'),null));
test('inactive product is never a spotlight',()=>assert.equal(selectSpotlight([products[3]],'hidden'),null));
test('explicit product wins; featured fallback second',()=>{assert.equal(selectSpotlight(products,'wheel-two').id,'wheel-two');assert.equal(selectSpotlight(products,'missing').id,'wheel-one');});
test('NVX choices are canonical, available, and ordered',()=>assert.deepEqual(nvxChoices([vehicles[2],{id:'demo-old'},vehicles[0]]),[vehicles[0],vehicles[2]]));
for(const id of ['', 'demo-old', 'yamaha-nvx-v4'])test(`build refuses unselected/unknown ${id}`,()=>assert.deepEqual(buildProducts(products,vehicles,id),[]));
test('build requires vehicle to exist in current catalog',()=>assert.deepEqual(buildProducts(products,[],NVX_IDS[0]),[]));
test('build only includes active, well-formed recorded matches',()=>assert.deepEqual(buildProducts(products,vehicles,NVX_IDS[0]).map(p=>p.id),['wheel-one','wheel-two','brake-one']));
test('no fabricated cross-version matches',()=>assert.deepEqual(buildProducts(products,vehicles,NVX_IDS[2]),[]));
test('V3 has no invented photographic asset',()=>{assert.ok(VEHICLE_PHOTOS[NVX_IDS[0]]);assert.ok(VEHICLE_PHOTOS[NVX_IDS[1]]);assert.equal(VEHICLE_PHOTOS[NVX_IDS[2]],undefined);});
for(const [value,remaining,expected] of [[1,10,1],[9,2,2],[0,10,1],[3,0,1],[Infinity,10,1],['3',10,1],[5,NaN,1],[99,20,10]])test(`quantity clamp ${value}/${remaining}`,()=>assert.equal(clampQuantity(value,remaining),expected));
test('build context isolates accounts and vehicles',()=>{assert.notEqual(buildContextKey('a','v1'),buildContextKey('b','v1'));assert.notEqual(buildContextKey('a','v1'),buildContextKey('a','v2'));});
test('pin swaps one category and never mutates earlier list',()=>{const ids=['wheel-one'];const result=pinProduct(ids,products[1],products);assert.deepEqual(result,['wheel-two']);assert.deepEqual(ids,['wheel-one']);});
test('different categories coexist in shortlist',()=>assert.deepEqual(pinProduct(['wheel-one'],products[2],products),['wheel-one','brake-one']));
test('unknown pin is ignored',()=>assert.deepEqual(pinProduct(['wheel-one'],{id:'missing'},products),['wheel-one']));
test('stale/duplicate/cross-vehicle draft entries are removed',()=>assert.deepEqual(sanitizeDraft(['hidden','wheel-one','wheel-two','brake-one'],products,vehicles,NVX_IDS[0]).map(p=>p.id),['wheel-one','brake-one']));
test('draft cannot survive a different vehicle without explicit new selection',()=>assert.deepEqual(sanitizeDraft(['wheel-one','brake-one'],products,vehicles,NVX_IDS[1]),[]));
test('pointer is bounded',()=>{const a=pointerOffset(9999,-9999,{left:0,top:0,width:100,height:100});assert.deepEqual(a,{x:7,y:-7});});
for(const rect of [null,{}, {width:0,height:100},{width:100,height:NaN}])test(`invalid pointer rect ${JSON.stringify(rect)}`,()=>assert.deepEqual(pointerOffset(1,1,rect),{x:0,y:0}));
test('motion reduced / unavailable creates no animation',()=>{let n=0;const root={querySelectorAll:()=>[{animate(){n++}}]};revealNodes(root,{enabled:false})();assert.equal(n,0);assert.doesNotThrow(()=>revealNodes(null)());});
test('motion is finite, bounded, transform/opacity only and cleaned once',()=>{
 let cancelled=0;const calls=[];const node={animate(frames,opts){calls.push({frames,opts});return{cancel(){cancelled++}}}};
 const stop=revealNodes({querySelectorAll:()=>Array(50).fill(node)});assert.equal(calls.length,8);for(const c of calls){assert.equal(c.opts.iterations,1);assert.ok(c.opts.duration<600);assert.ok(c.opts.delay<=180);assert.deepEqual(Object.keys(c.frames[0]).sort(),['opacity','transform']);}stop();stop();assert.equal(cancelled,8);
});
test('animation API failure cannot hide page',()=>assert.doesNotThrow(()=>revealNodes({querySelectorAll:()=>[{animate(){throw Error('no')}}]})()));
test('purchase goes through existing validation AND existing store acceptance',async()=>{const s=await source('ProductSpotlight.jsx');assert.match(s,/validatePurchase\(/);assert.match(s,/if \(!store\.add\(/);assert.match(s,/lock\.current \|\| busy \|\| blocked/);assert.doesNotMatch(s,/createOrder|fetch\(|localStorage|setBag\(/);});
test('only one reused media boundary, never a canvas for each card',async()=>{const stage=await source('DiscoveryStage.jsx'),rail=await source('ProductRail.jsx');assert.match(stage,/import\('\.\.\/product\/ProductMedia'\)/);assert.match(stage,/useStartupAllowed/);assert.match(stage,/policy\.saveData/);assert.doesNotMatch(rail,/Canvas|ProductMedia|useGLTF/);});
test('default garage and account are not written by discovery',async()=>{const s=await source('DiscoveryPage.jsx');assert.doesNotMatch(s,/saveAccountVehicle|saveGarage|setUser\(|setBag\(|localStorage\s*[.\[]|fetch\(/);assert.match(s,/store\.setVehicle\(id\)/);});
test('catalog source remains reused, not rewritten',async()=>{const s=await source('DiscoveryPage.jsx');assert.match(s,/import\('\.\.\/catalog\/ShopPage'\)/);assert.match(s,/selectShopProducts/);assert.match(s,/changeMode\(previous, mode\)/);});
test('asset files are present, WebP, bounded and recorded',async()=>{
 const provenance=JSON.parse(await readFile(new URL('../frontend/public/discovery174/provenance.json',import.meta.url),'utf8'));
 assert.equal(provenance.length,8);
 for(const item of provenance){assert.equal(item.outputs.length,2);assert.ok(/^[0-9a-f]{64}$/.test(item.originalSha256));for(const file of item.outputs){const b=await readFile(new URL(`../frontend/public/discovery174/${file.file}`,import.meta.url));assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.length,file.bytes);assert.ok(file.width<=1280);}}
 for(const photo of Object.values(PHOTOS)){assert.ok(photo.src.startsWith('/discovery174/'));assert.ok(photo.alt.length>15);}
});
