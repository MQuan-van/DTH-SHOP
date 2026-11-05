import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { useStudioHeader26, shouldOpenCart26, liveVehicle26 } from '../frontend/src/experience/header26/header26.logic.mjs';
import { memberLabel232 } from '../frontend/src/experience/refinement232/refinement232.logic.mjs';

const primary = Object.freeze({ button: 0, detail: 1, defaultPrevented: false, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false });
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('approved masthead is enabled on the default Studio and ordinary Studio query states', () => {
  for (const search of ['', '?q=ttx', '?studio=gallery', '?studio=other', '?mode=build']) {
    assert.equal(useStudioHeader26('/', search), true, search);
  }
});

test('legacy Studio modes retain their original header and sizing contracts', () => {
  for (const search of ['?studio=classic', '?studio=precision', '?q=ttx&studio=classic', '?studio=%70recision']) {
    assert.equal(useStudioHeader26('/', search), false, search);
  }
});

test('Studio-only integration never replaces commerce, account, auth, admin or preview navigation', () => {
  for (const path of ['/shop', '/products/ohlins', '/story', '/account', '/bag', '/checkout', '/login', '/admin', '/studio', '/studio-spatial-preview.html']) {
    assert.equal(useStudioHeader26(path, ''), false, path);
  }
});

test('cart drawer accepts a normal primary activation without changing the supplied event', () => {
  assert.equal(shouldOpenCart26(primary, '/'), true);
  assert.deepEqual(primary, { button: 0, detail: 1, defaultPrevented: false, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false });
});

test('keyboard-generated anchor click opens the same cart drawer', () => {
  assert.equal(shouldOpenCart26({ ...primary, detail: 0 }, '/'), true);
});

for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
  test(`${modifier} bag activation preserves native link behavior`, () => {
    assert.equal(shouldOpenCart26({ ...primary, [modifier]: true }, '/'), false);
  });
}

test('middle and secondary bag activation do not open a drawer', () => {
  for (const button of [1, 2, 3]) assert.equal(shouldOpenCart26({ ...primary, button }, '/'), false);
});

test('prevented activation and the full bag page are never intercepted', () => {
  assert.equal(shouldOpenCart26({ ...primary, defaultPrevented: true }, '/'), false);
  assert.equal(shouldOpenCart26(primary, '/bag'), false);
});

test('account presentation continues to require authenticated identity rather than a supplied email', () => {
  for (const user of [null, undefined, {}, { email: 'rider@example.test' }]) {
    assert.equal(memberLabel232(user).label, 'Sign in');
    assert.equal(memberLabel232(user).signedIn, false);
  }
  const member = Object.freeze({ id: 'member-26', email: 'rider@example.test' });
  assert.equal(memberLabel232(member).label, 'My DTH');
  assert.equal(memberLabel232(member).signedIn, true);
});

test('live vehicle labels preserve authoritative NVX naming without inventing a year or saved default', () => {
  const vehicle = Object.freeze({ id: 'yamaha-nvx-v2', make: 'Yamaha', model: 'NVX V2', year: 2026 });
  assert.deepEqual(liveVehicle26(vehicle), {
    selected: true,
    label: 'Yamaha NVX V2',
    compact: 'NVX V2',
    accessibleLabel: 'Change shopping vehicle: Yamaha NVX V2',
  });
  assert.equal(vehicle.year, 2026);
  assert.equal(liveVehicle26(null).selected, false);
  assert.equal(liveVehicle26({ make: 'Yamaha', model: null }).accessibleLabel, 'Choose shopping vehicle');
});

test('a legacy vehicle keeps its existing full receipt-style label while compact text stays a model name', () => {
  assert.deepEqual(liveVehicle26({ id: 'street155-2022', make: ' Demo Moto ', model: ' Street 155 ', year: 2022 }), {
    selected: true,
    label: 'Demo Moto Street 155 · 2022',
    compact: 'Street 155',
    accessibleLabel: 'Change shopping vehicle: Demo Moto Street 155 · 2022',
  });
});

test('production navigation actually selects the new Studio branch with live store props', async () => {
  const navigation = await read('frontend/src/experience/commerce23/DTHNavigation23.jsx');
  assert.match(navigation, /useStudioHeader26\(location\.pathname,\s*location\.search\)/);
  const branch = navigation.match(/if\s*\(studioHeader\)\s*return\s*<StudioHeader26\b[^>]*\/>/);
  assert.ok(branch, 'the tested route guard must control the actual live header');
  for (const prop of ['vehicle', 'count', 'disabled', 'onChooseVehicle', 'openCart']) {
    assert.match(branch[0], new RegExp(`${prop}=\\{${prop}\\}`));
  }
  assert.match(branch[0], /headerRef=\{header\}/);
  assert.match(navigation, /--dth-one-header-height/);
  assert.match(navigation, /\[studioHeader\]/, 'header height observation must rebind when changing header surfaces');
  assert.match(navigation, /setOpen\(false\);\s*\},\s*\[location\.pathname,\s*active,\s*studioHeader\]/,
    'query-only Studio surface switches must close the legacy menu even when pathname and active stay the same');
  assert.match(navigation, /useLayoutEffect\(\(\)=>\{const host=nav\.current[\s\S]*?\},\s*\[active,\s*open,\s*studioHeader\]/,
    'the legacy marker must rebind and clean up when default and legacy Studio surfaces switch');
  assert.match(navigation, /useEffect\(\(\)=>\{if\(!open\|\|studioHeader\)return;[\s\S]*?document\.removeEventListener\('keydown',close\)[\s\S]*?document\.removeEventListener\('pointerdown',outside\)[\s\S]*?\},\s*\[open,\s*studioHeader\]/,
    'legacy menu listeners must be suppressed and cleaned up on the new Studio surface');
});

test('new live bag link preserves the real route and passes the anchor to the existing drawer', async () => {
  const header = await read('frontend/src/experience/header26/StudioHeader26.jsx');
  assert.match(header, /<Link\b(?=[^>]*\bto=["']\/bag["'])(?=[^>]*\bonClick=\{bag\})[^>]*>/);
  assert.match(header, /if\s*\(!shouldOpenCart26\(event,\s*location\.pathname\)\)\s*return/);
  assert.match(header, /event\.preventDefault\(\);\s*openCart\(event\.currentTarget\)/);
  assert.match(header, /aria-controls=["']dth-cart-drawer["']/);
});

test('new header reuses account identity handling and the existing account destination', async () => {
  const [header, account] = await Promise.all([
    read('frontend/src/experience/header26/StudioHeader26.jsx'),
    read('frontend/src/experience/refinement232/AccountAccess232.jsx'),
  ]);
  assert.match(header, /<AccountAccess232\b[^>]*plainIcon\b/);
  assert.match(account, /memberLabel232\(store\.user\)/);
  assert.match(account, /<Link\b[^>]*to=["']\/account["']/);
  assert.match(account, /member\.signedIn\s*\?\s*'Open your DTH account'\s*:\s*'Sign in to DTH'/);
  assert.match(account, /data-build-workspace232/);
  assert.match(account, /plainIcon\s*=\s*false/, 'other routes retain their original account presentation by default');
});

test('live adapter delegates disabled vehicle controls and Router links instead of owning store writes', async () => {
  const header = await read('frontend/src/experience/header26/StudioHeader26.jsx');
  assert.match(header, /vehicleDisabled=\{disabled\}/);
  assert.match(header, /onVehicle=\{onChooseVehicle\}/);
  assert.match(header, /linkComponent=\{RouterSurface26\}/);
  assert.match(header, /<Link\b[^>]*to=\{href\}/);
  assert.doesNotMatch(header, /\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b|\bsetVehicle\s*\(|\bsetUser\s*\(/);
});
