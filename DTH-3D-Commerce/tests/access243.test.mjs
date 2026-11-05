import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { accessPointer243, accessMotion243, capsLock243 } from '../frontend/src/experience/access243/access243.logic.mjs';

test('pointer mapping is centered, bounded and robust to invalid or collapsed bounds', () => {
  const bounds = { left: 20, top: 40, width: 400, height: 200 };
  assert.deepEqual(accessPointer243(220, 140, bounds), { x: 0, y: 0, active: true });
  assert.deepEqual(accessPointer243(-200, 1000, bounds), { x: -1, y: -1, active: true });
  assert.deepEqual(accessPointer243(1000, -100, bounds), { x: 1, y: 1, active: true });
  for (const bad of [{ ...bounds, width: 0 }, { ...bounds, height: NaN }, null]) {
    assert.deepEqual(accessPointer243(100, 100, bad), { x: 0, y: 0, active: false });
  }
});

test('motion and pointer response respect startup, system, hidden, data and form gates', () => {
  const base = { allowed: true, reduced: false, hidden: false, paused: false, saveData: false, focusing: false, busy: false, finePointer: true };
  assert.deepEqual(accessMotion243(base), { motion: true, interactive: true });
  for (const blocked of [{ allowed: false }, { reduced: true }, { hidden: true }, { paused: true }, { saveData: true }]) {
    assert.deepEqual(accessMotion243({ ...base, ...blocked }), { motion: false, interactive: false });
  }
  for (const blocked of [{ focusing: true }, { busy: true }, { finePointer: false }]) {
    assert.deepEqual(accessMotion243({ ...base, ...blocked }), { motion: true, interactive: false });
  }
});

test('Caps Lock checks a keyboard modifier and does not need input content', () => {
  assert.equal(capsLock243({ getModifierState: key => key === 'CapsLock' }), true);
  assert.equal(capsLock243({ getModifierState: () => false }), false);
  assert.equal(capsLock243({}), false);
  assert.equal(capsLock243(null), false);
});

const read = name => readFile(new URL(`../frontend/src/experience/${name}`, import.meta.url), 'utf8');
test('actual access integration retains validation and stale-session guards without animation-owned auth', async () => {
  const source = await read('access181/AccessScreen181.jsx');
  const submit = source.slice(source.indexOf('async function submit'), source.indexOf('function switchMode'));
  assert(submit.indexOf('validateRegistration') < submit.indexOf('lock.current=true'));
  assert(submit.includes('requestId!==serial.current'));
  assert(submit.includes('epoch!==store.getIdentityEpoch?.()'));
  assert(submit.indexOf('onAuthenticated(user)') > submit.indexOf('epoch!==store.getIdentityEpoch?.()'));
  assert.doesNotMatch(submit, /setTimeout|requestAnimationFrame|gsap|setUser/);
  assert.match(source, /setRegister\(v=>!v\);setPassword\(''\);setConfirm\(''\)/);
  assert.match(source, /useEffect\(\(\)=>\{setVisible\(false\);setCaps\(false\);\},\[register\]\)/);
});

test('new surface and scene do not accept credentials or own network/session actions (source contract)', async () => {
  const integration = await read('access243/AccessSurface243.jsx');
  assert.match(integration, /export \{ default \} from '\.\.\/access245\/AccessSurface245'/);
  assert.doesNotMatch(integration, /MachinedScene|access243\.css/);
  const surface = await read('access245/AccessSurface245.jsx');
  const scene = await read('access245/AccessStage245.jsx');
  for (const source of [surface, scene]) assert.doesNotMatch(source, /authenticate|studioRequest|fetch\(|localStorage|sessionStorage|onAuthenticated/);
  assert.match(surface, /policy=|policy,/);
  assert.match(surface, /useAccessDirector245\(root, \{ policy, focusing, busy, registering/);
  assert.doesNotMatch(surface, /password=|email=|credentials=/);
});

test('current JSX transforms using installed tooling (syntax only)', async () => {
  for (const file of ['access181/AccessScreen181.jsx', 'access243/AccessSurface243.jsx', 'access245/AccessSurface245.jsx', 'access245/AccessStage245.jsx', 'refinement232/Support232.jsx']) {
    const result = await transform(await read(file), { loader: 'jsx', jsx: 'automatic', format: 'esm' });
    assert.equal(result.warnings.length, 0, file);
  }
});
