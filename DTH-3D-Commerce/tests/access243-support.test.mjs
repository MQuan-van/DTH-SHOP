import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { supportAccess243, supportIsOpen243, supportThread243 } from '../frontend/src/experience/access243/support243.logic.mjs';

const customer = { id: 'customer-1', role: 'customer' };
const current = (overrides = {}) => supportAccess243({ mode: 'api', user: customer, identityEpoch: 4, pathname: '/shop', ...overrides });

test('guest, unresolved session and auth failures expose no support surface', () => {
  for (const fields of [{ user: null }, { user: {} }, { user: { id: 1 } }, { authLoading: true }, { authError: 'Session check failed.' }]) {
    const access = current(fields);
    assert.equal(access.visible, false);
    assert.equal(supportIsOpen243(access, current().contextKey), false);
    assert.equal(supportThread243(access, { contextKey: current().contextKey, id: 'old-thread' }), '');
  }
});

test('preview and flow never expose real messaging even with fixture users', () => {
  for (const mode of ['preview', 'flow', undefined]) assert.equal(current({ mode }).visible, false);
});

test('login and Admin workspaces suppress the global widget', () => {
  for (const pathname of ['/login', '/login/', '/admin', '/admin/inbox', '/admin/mount-calibration']) assert.equal(current({ pathname }).visible, false);
  assert.equal(current({ pathname: '/account' }).visible, true);
  assert.equal(current({ pathname: '/products/part-a' }).visible, true);
});

test('authenticated customers need their own explicit open gesture', () => {
  const access = current();
  assert.equal(access.kind, 'customer');
  assert.equal(supportIsOpen243(access, ''), false);
  assert.equal(supportIsOpen243(access, access.contextKey), true);
});

test('admin retains Inbox identity but cannot open a customer conversation', () => {
  const access = current({ user: { id: 'admin-1', role: 'admin' } });
  assert.equal(access.visible, true);
  assert.equal(access.kind, 'admin');
  assert.equal(supportIsOpen243(access, access.contextKey), false);
  assert.equal(supportThread243(access, { contextKey: access.contextKey, id: 'not-a-customer-thread' }), '');
});

test('open gesture and conversation cannot cross account, role, page or same-account session epochs', () => {
  const access = current(), opened = access.contextKey, thread = { contextKey: opened, id: 'conversation-1' };
  assert.equal(supportThread243(access, thread), 'conversation-1');
  for (const replacement of [
    { user: { id: 'customer-2', role: 'customer' } },
    { user: { ...customer, role: 'admin' } },
    { identityEpoch: 5 },
    { pathname: '/story' },
    { authLoading: true },
    { user: null },
  ]) {
    const next = current(replacement);
    assert.equal(supportIsOpen243(next, opened), false);
    assert.equal(supportThread243(next, thread), '');
  }
});

test('context binding avoids delimiter collisions', () => {
  assert.notEqual(current({ user: { id: 'a:customer:4:/shop', role: 'customer' } }).contextKey, current({ user: { id: 'a', role: 'customer' } }).contextKey);
});

test('malformed or missing conversation identifiers never mount a thread', () => {
  const access = current();
  for (const thread of [null, {}, { contextKey: access.contextKey }, { contextKey: access.contextKey, id: 2 }, { contextKey: access.contextKey, id: '' }]) assert.equal(supportThread243(access, thread), '');
});

// Static wiring assertions supplement the pure context tests; these do not certify browser execution.
test('component gates POST and rendering synchronously and rejects late replies', () => {
  const source = readFileSync(new URL('../frontend/src/experience/refinement232/Support232.jsx', import.meta.url), 'utf8');
  assert.match(source, /supportIsOpen243\(access, openedKey\)/);
  assert.match(source, /if \(!open \|\| mode !== 'customer'\) return/);
  assert.match(source, /if \(!access\.visible\) return null/);
  assert.match(source, /currentContext\.current !== contextKey/);
  assert.match(source, /store\.getIdentityEpoch\?\.\(\)/);
  assert.match(source, /from '\.\.\/\.\.\/shop\/support\/ChatThread'/);
  assert.match(source, /to="\/admin\/inbox"/);
  assert.doesNotMatch(source, /\/messages/);
});
