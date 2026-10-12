import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isIntroRoute } from '../frontend/src/experience/loader/loader.logic.mjs';
const load = p => readFile(new URL('../'+p,import.meta.url),'utf8');
test('root remains eligible for the existing intro gate',()=>assert.equal(isIntroRoute('/'),true));
test('root route uses the new StudioEntry',async()=>{
  const s=await load('frontend/src/shop/StoreApp.jsx');
  assert.match(s,/<Route index element=\{<StudioEntry \/>\} \/>/);
  assert.doesNotMatch(s,/<Route index element=\{<(?:EntryPage|HomePage) \/>\} \/>/);
});
test('entry uses actual authenticated state, not a fake signed-in flag',async()=>{
  const s=await load('frontend/src/experience/journey/StudioEntry.jsx');
  assert.match(s,/store\.authLoading/);assert.match(s,/store\.user/);assert.match(s,/<AccountPage \/>/);assert.match(s,/<HomePage \/>/);
});
test('successful authentication keeps explicit return intents or enters Story',async()=>{
  const s=await load('frontend/src/shop/account/AccountPage.jsx');
  assert.match(s,/signInDestination\(params.get\('return'\), MODE, user\)/);
});
