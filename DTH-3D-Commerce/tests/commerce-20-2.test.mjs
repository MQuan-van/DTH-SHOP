import test from 'node:test';
import assert from 'node:assert/strict';
import { commerceAvailability } from '../shared/productCommerce.mjs';

for (const [status,qty,request,canOrder] of [
  ['in_stock', 3, 2, true], ['in_stock', 1, 2, false], ['in_stock', 0, 1, false],
  ['out_of_stock', 3, 1, false], ['preorder', 0, 10, true], ['demo', 0, 10, true],
]) test(`availability ${status}, stock ${qty}, request ${request}`, () => {
  assert.equal(commerceAvailability({ availabilityStatus: status, stockQty: qty }, request).orderable, canOrder);
});
test('old products remain compatible', () => {
  assert.equal(commerceAvailability({ name: 'Existing item' }).kind, 'demo');
});

import { validateProduct } from '../shared/domain.mjs';
import { quoteCart } from '../shared/cartQuote.mjs';
const vehicles=[{id:'yamaha-nvx-v2',make:'Yamaha',model:'NVX V2'},{id:'yamaha-nvx-v3',make:'Yamaha',model:'NVX V3'}];
const baseProduct={id:'nvx-shock-black',name:'NVX Shock Black',category:'suspension',price:1500000,finish:'Black',description:'AI demo sample',
  imageUrl:'/previews/ai-products/00000000-0000-4000-8000-000000000001.webp',
  modelUrl:'/models/ai-products/00000000-0000-4000-8000-000000000001.glb',
  vehicleIds:['yamaha-nvx-v2','yamaha-nvx-v3'],variantGroup:'nvx-shock',availabilityStatus:'in_stock',stockQty:2,leadTimeDays:0};
test('admin validates SKU / price / colour group / stock fields',()=>{
  const product=validateProduct(baseProduct, vehicles);
  assert.equal(product.variantGroup,'nvx-shock');
  assert.equal(product.availabilityStatus,'in_stock');
  assert.equal(product.stockQty,2);
});
test('invalid stock quantity and preorder lead time are rejected',()=>{
  assert.throws(()=>validateProduct({...baseProduct,stockQty:-1},vehicles));
  assert.throws(()=>validateProduct({...baseProduct,availabilityStatus:'preorder',leadTimeDays:0},vehicles));
});
test('cart quote checks total SKU quantity across multiple vehicles',()=>{
  const product=validateProduct(baseProduct, vehicles);
  const valid=quoteCart([{productId:product.id,vehicleId:'yamaha-nvx-v2',quantity:2}],[product],vehicles);
  assert.equal(valid.valid,true);
  const invalid=quoteCart([{productId:product.id,vehicleId:'yamaha-nvx-v2',quantity:2},
    {productId:product.id,vehicleId:'yamaha-nvx-v3',quantity:1}],[product],vehicles);
  assert.equal(invalid.valid,false);
  assert.equal(invalid.lines[0].status,'unavailable');
});
test('preorder can enter demo quote without stock reservation',()=>{
  const product=validateProduct({...baseProduct,availabilityStatus:'preorder',stockQty:0,leadTimeDays:14},vehicles);
  const q=quoteCart([{productId:product.id,vehicleId:'yamaha-nvx-v2',quantity:2}],[product],vehicles);
  assert.equal(q.valid,true);
  assert.equal(q.inventoryChecked,false);
});
