import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AVAILABILITY, commerceAvailability } from '../shared/productCommerce.mjs';
import { DEFAULT_STUDIO21, STUDIO_PRESETS21, normalizeStudio21, studioDpr21, formatAssetStats21 } from '../frontend/src/shop/product/premium21/studio21.mjs';
import { makeSaveReceipt21, receiptMatches21 } from '../frontend/src/shop/admin/premium21/saveReceipt21.mjs';
import { ignoreGeneratedAssets21, GENERATED_ASSET21 } from '../frontend/devWatch21.mjs';

test('stored availability codes are not translated', () => assert.deepEqual(AVAILABILITY, ['demo','in_stock','preorder','out_of_stock']));
test('pre-order English label and singular day', () => {
  const state = commerceAvailability({availabilityStatus:'preorder',leadTimeDays:1});
  assert.equal(state.label,'Pre-order (demo)'); assert.match(state.detail,/1 day\./); assert.equal(state.orderable,true);
});
test('pre-order English plural and unconfirmed lead time', () => {
  assert.match(commerceAvailability({availabilityStatus:'preorder',leadTimeDays:2}).detail,/2 days/);
  assert.match(commerceAvailability({availabilityStatus:'preorder',leadTimeDays:0}).detail,/confirmed/);
});
test('out-of-stock cannot be ordered', () => {
  const state = commerceAvailability({availabilityStatus:'out_of_stock'});
  assert.equal(state.label,'Out of stock'); assert.equal(state.orderable,false); assert.equal(state.max,0);
});
test('in-stock retains quantity gate, including zero stock', () => {
  const p = {availabilityStatus:'in_stock',stockQty:2};
  assert.equal(commerceAvailability(p,2).orderable,true);assert.equal(commerceAvailability(p,3).orderable,false);
  assert.equal(commerceAvailability({...p,stockQty:0}).orderable,false);
});
test('unknown availability still falls back to demo', () => assert.equal(commerceAvailability({availabilityStatus:'bad'}).kind,'demo'));
test('lighting defaults are bounded and immutable', () => {
  assert.deepEqual(normalizeStudio21(null),DEFAULT_STUDIO21);assert.equal(Object.isFrozen(DEFAULT_STUDIO21),true);
  assert.equal(normalizeStudio21({preset:'__proto__'}).preset,'studio');
});
test('exposure clamps without NaN or string coercion', () => {
  assert.equal(normalizeStudio21({exposure:99}).exposure,1.4);assert.equal(normalizeStudio21({exposure:-2}).exposure,.7);
  assert.equal(normalizeStudio21({exposure:NaN}).exposure,1);assert.equal(normalizeStudio21({exposure:'1.2'}).exposure,1);
});
test('original lighting retains original intensity values', () => {
  assert.equal(STUDIO_PRESETS21.original.environment,.7);assert.equal(STUDIO_PRESETS21.original.key,2);
  assert.equal(STUDIO_PRESETS21.original.fill,1.25);assert.equal(STUDIO_PRESETS21.original.rim,0);
});
test('display quality changes DPR only and caps eco mode', () => {
  assert.deepEqual(studioDpr21({quality:'sharp'}),[1,2]);assert.deepEqual(studioDpr21({},false,1.5),[1,1.5]);
  assert.deepEqual(studioDpr21({quality:'sharp'},true),[1,1]);assert.deepEqual(studioDpr21({},false,Infinity),[1,1.5]);
});
test('asset statistics use measured report, never invent counts', () => {
  assert.equal(formatAssetStats21(null),'');assert.equal(formatAssetStats21({byteLength:-1,triangles:3}),'');
  assert.equal(formatAssetStats21({byteLength:1048576,triangles:1123140}),'1.0 MiB · 1,123,140 triangles');
});
const saved={id:'x1r-red',slug:'x1r-red',name:'X1R-GT4',active:true,updatedAt:'2026-10-25T00:00:00.000Z'};
test('save receipt follows ID and version', () => {
  const receipt=makeSaveReceipt21(saved);assert.equal(receiptMatches21(receipt,saved),true);
  assert.equal(receiptMatches21(receipt,{...saved,id:'another'}),false);
  assert.equal(receiptMatches21(receipt,{...saved,updatedAt:'later'}),false);
});
test('save notice is hidden for unsaved edits and visibility changes', () => {
  const receipt=makeSaveReceipt21(saved);assert.equal(receiptMatches21(receipt,saved,true),false);
  assert.equal(receiptMatches21(receipt,{...saved,active:false}),false);
});
test('draft receipt never marks product visible', () => {
  const product={...saved,active:false};const receipt=makeSaveReceipt21(product);
  assert.equal(receipt.visible,false);assert.equal(receiptMatches21(receipt,product),true);
});
test('receipt cannot link external routes', () => {
  assert.equal(makeSaveReceipt21({...saved,id:'../outside'}),null);
  assert.equal(makeSaveReceipt21({...saved,slug:'https://invalid.test'}).slug,saved.id);
  assert.equal(receiptMatches21({...makeSaveReceipt21(saved),slug:'//invalid.test'},saved),false);
});
test('watch guard covers Windows temporary and finalized product files', () => {
  assert.equal(GENERATED_ASSET21.test('C:\\Của Quân\\frontend\\public\\models\\ai-products\\abc.glb.123.tmp'),true);
  assert.equal(GENERATED_ASSET21.test('/app/frontend/public/previews/ai-products/a.webp'),true);
  assert.equal(GENERATED_ASSET21.test('/app/frontend/src/shop/Product.jsx'),false);
  assert.equal(GENERATED_ASSET21.test('/app/frontend/public/models/nvx/nvx-v3.glb'),false);
});
test('watch guard preserves existing options, proxy and ignore function', () => {
  const old=()=>false;const config={server:{proxy:{'/api':'existing'},watch:{ignored:old,usePolling:true}}};
  const plugin=ignoreGeneratedAssets21();plugin.config(config);plugin.config(config);
  assert.equal(config.server.watch.ignored[0],old);assert.equal(config.server.watch.ignored.length,2);
  assert.equal(config.server.watch.usePolling,true);assert.equal(config.server.proxy['/api'],'existing');assert.equal(plugin.apply,'serve');
});
test('disabled watcher remains disabled', () => {const c={server:{watch:null}};ignoreGeneratedAssets21().config(c);assert.equal(c.server.watch,null);});
test('studio module does not fetch textures, mutate the asset, or remesh', async () => {
  const text=await readFile(new URL('../frontend/src/shop/product/premium21/ProductLighting21.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(text,/fetch\(|\.metalness\s*=|\.roughness\s*=|\.geometry\s*=|\.scale\.set/);
  assert.match(text,/original\?\.dispose\(\)/);assert.match(text,/studioTarget\?\.dispose\(\)/);
});
