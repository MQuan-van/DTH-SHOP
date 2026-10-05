import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cleanSearch, highlightPieces, nextSuggestionIndex, productPath, searchReturnUrl, suggestProducts } from '../frontend/src/shop/catalog/search/search.logic.mjs';
import { readShopQuery, selectShopProducts } from '../frontend/src/shop/catalog/catalog.logic.mjs';
const { products, vehicles } = JSON.parse(await readFile(new URL('../shared/catalog.json', import.meta.url), 'utf8'));
const query = readShopQuery('', 1000000000);
const first = products.find(p => p.active !== false);

test('suggestions use the exact catalog matching and sort pipeline', () => {
  const actual = suggestProducts(products, vehicles, '', query, 'apex');
  const expected = selectShopProducts(products, vehicles, '', {...query, search: 'apex'});
  assert.deepEqual(actual.items, expected.slice(0,6)); assert.equal(actual.total, expected.length);
});
test('two characters required; no arbitrary featured suggestions for an empty input', () => {
  for (const v of ['', ' ', 'a', null, 32]) assert.equal(suggestProducts(products, vehicles, '', query, v).eligible, false);
});
test('term trims, respects the 160 character cap and keeps case for display', () => {
  assert.equal(cleanSearch('  Apex  '), 'Apex'); assert.equal(cleanSearch('a'.repeat(170)).length,160);
});
test('case-insensitive search remains consistent with the catalog', () => {
  assert.deepEqual(suggestProducts(products, vehicles, '', query, 'APEX').items, suggestProducts(products, vehicles, '', query, 'apex').items);
});
test('multiword search matches all terms, not any term', () => {
  assert.ok(suggestProducts(products, vehicles, '', query, 'apex coil').items.every(p => p.name.toLowerCase().includes('apex') && p.name.toLowerCase().includes('coil')));
});
test('at most six suggestions, real total count is preserved', () => {
  const many = Array.from({length:12}, (_,i)=>({...first,id:`part-${i}`,slug:`part-${i}`,name:`Apex ${i}`}));
  const result=suggestProducts(many, vehicles, '', query, 'apex'); assert.equal(result.items.length,6); assert.equal(result.total,12);
});
test('category filtering is not silently cleared for suggestions', () => {
  const result=suggestProducts(products,vehicles,'',{...query,categories:['wheels']},'apex');
  assert.ok(result.items.every(p=>p.category==='wheels'));
});
test('price ceiling excludes more expensive suggestions', () => {
  const result=suggestProducts(products,vehicles,'',{...query,maxPrice:0},'apex'); assert.equal(result.total,0);
});
test('selected-vehicle fit mode is retained', () => {
  const vehicle=vehicles[0].id;
  const result=suggestProducts(products,vehicles,vehicle,{...query,fit:'match'},'apex');
  assert.deepEqual(result.items,selectShopProducts(products,vehicles,vehicle,{...query,fit:'match',search:'apex'}).slice(0,6));
});
test('unknown vehicle is not falsely declared compatible', () => assert.equal(suggestProducts(products,vehicles,'missing',query,'apex').total,0));
test('all-fit mode may include nonmatching items, retaining the original behavior', () => {
  const q={...query,fit:'all'}; assert.equal(suggestProducts(products,vehicles,'missing',q,'apex').total,suggestProducts(products,vehicles,'',q,'apex').total);
});
test('inactive, malformed and missing-slug products are never suggested', () => {
  const data=[null,{...first,active:false},{...first,slug:null},{...first,slug:'//evil.test'},{...first,price:NaN}];
  assert.equal(suggestProducts(data,vehicles,'',query,'apex').total,0);
});
test('valid product path is same-origin and fixed to products', () => assert.equal(productPath(first),`/products/${first.slug}`));
for (const slug of ['https://evil.test','../admin','%2fadmin','test?x=1','a#b','a/b','',null]) {
  test(`unsafe slug rejected: ${String(slug)}`,()=>assert.equal(productPath({slug}),null));
}
test('source product array and records are not mutated',()=>{
  const data=structuredClone(products); data.forEach(Object.freeze); Object.freeze(data);
  suggestProducts(data,vehicles,'',{...query,sort:'price-high'},'apex'); assert.deepEqual(data,products);
});
test('different sort orders match the real catalog exactly',()=>{
  for (const sort of ['featured','price-low','price-high','name']) {
    assert.deepEqual(suggestProducts(products,vehicles,'',{...query,sort},'apex').items,selectShopProducts(products,vehicles,'',{...query,sort,search:'apex'}).slice(0,6));
  }
});
test('back URL preserves filters and unrelated keys while resetting changed-search page',()=>{
  const p=new URLSearchParams('category=brakes&category=wheels&max=5000000&sort=price-high&fit=all&page=3&utm_test=1&q=old');
  const url=searchReturnUrl(p,'apex'); const next=new URL(url,'https://local.test').searchParams;
  assert.equal(next.get('q'),'apex'); assert.deepEqual(next.getAll('category'),['brakes','wheels']);
  for (const key of ['max','sort','fit','utm_test']) assert.equal(next.get(key),p.get(key));
  assert.equal(next.has('page'),false); assert.equal(p.get('q'),'old');
});
test('unchanged query retains current page on product selection',()=>assert.equal(new URL(searchReturnUrl('q=apex&page=2','apex'),'https://local.test').searchParams.get('page'),'2'));
test('clearing query uses a safe shop path',()=>assert.equal(searchReturnUrl('q=old',''),'/shop'));
test('query containing markup or redirects remains URL data',()=>{
  const u=new URL(searchReturnUrl('','<img src=x> //evil.test'),'https://local.test'); assert.equal(u.pathname,'/shop'); assert.equal(u.origin,'https://local.test');
});
test('arrow navigation starts at first/last and stays bounded',()=>{
  assert.equal(nextSuggestionIndex(-1,4,1),0); assert.equal(nextSuggestionIndex(-1,4,-1),3);
  assert.equal(nextSuggestionIndex(3,4,1),3); assert.equal(nextSuggestionIndex(0,4,-1),-1);
  assert.equal(nextSuggestionIndex(0,0,1),-1); assert.equal(nextSuggestionIndex(0,4,9),-1);
});
test('highlight output preserves the exact original text',()=>{
  for (const s of ['Apex Coilover','<img src=x onerror=alert(1)>','Phuộc Đỏ','a+b [test]']) {
    const p=highlightPieces(s,'a'); assert.equal(p.map(x=>x.text).join(''),s);
  }
});
test('highlights multiple occurrences and treats regex syntax literally',()=>{
  assert.equal(highlightPieces('Apex apex','apex').filter(p=>p.match).length,2);
  assert.equal(highlightPieces('a+b aab','a+b').filter(p=>p.match).map(p=>p.text).join(''),'a+b');
});
test('overlapping highlight ranges are merged',()=>assert.deepEqual(highlightPieces('coilover','coil coilover'),[{text:'coilover',match:true}]));
test('no-match highlight keeps all text unmarked',()=>assert.deepEqual(highlightPieces('Apex','zzz'),[{text:'Apex',match:false}]));
test('Shop actually integrates the component without removing QuickView',async()=>{
  const s=await readFile(new URL('../frontend/src/shop/catalog/ShopPage.jsx',import.meta.url),'utf8');
  assert.match(s,/<SearchDiscovery\b/); assert.match(s,/<QuickView\b/); assert.match(s,/onReset=\{reset\}/);
});
