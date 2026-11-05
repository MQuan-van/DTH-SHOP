import test from 'node:test';
import assert from 'node:assert/strict';
import { headerVehicle25, safeBagCount25, studioHref25 } from '../frontend/src/experience/studio25Preview/header25.logic.mjs';

test('header distinguishes the current shopping choice from no vehicle without inventing a saved default', () => {
  assert.deepEqual(headerVehicle25(null), { selected: false, label: 'Choose your NVX', compact: 'Your NVX', accessibleLabel: 'Choose shopping vehicle' });
  assert.deepEqual(headerVehicle25({ make: 'Yamaha', model: 'NVX V2' }), { selected: true, label: 'Yamaha NVX V2', compact: 'NVX V2', accessibleLabel: 'Change shopping vehicle: Yamaha NVX V2' });
});
test('labels tolerate missing/invalid identity values and preserve real model naming', () => {
  assert.equal(headerVehicle25({ make: {}, model: 4 }).selected, false);
  assert.equal(headerVehicle25({ model: ' Custom NVX ' }).label, 'Custom NVX');
});
test('bag counter accepts only a nonnegative safe integer and does not coerce supplied values', () => {
  for (const value of [-1, 1.2, NaN, Infinity, '2', {}, null]) assert.equal(safeBagCount25(value), 0);
  assert.equal(safeBagCount25(0), 0); assert.equal(safeBagCount25(8), 8);
});
test('preview Studio stays in its exact local entry without accepting arbitrary navigation URLs', () => {
  assert.equal(studioHref25('/studio-spatial-preview.html'), '/studio-spatial-preview.html');
  for (const href of [undefined, '/', '/other.html', '//external.example', 'javascript:alert(1)']) assert.equal(studioHref25(href), '/');
});
