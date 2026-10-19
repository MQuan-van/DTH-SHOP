import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const adminFile = name => readFile(new URL(`../frontend/src/shop/admin/ops18b/${name}`, import.meta.url), 'utf8');

test('Admin topbar has no manual motion toggle and Overview has no refresh icon', async () => {
  const [shared, overview] = await Promise.all([adminFile('ProShared.jsx'), adminFile('OverviewPro.jsx')]);
  assert.doesNotMatch(shared, /Pause interface motion|Enable interface motion|setMotion/);
  assert.doesNotMatch(overview, /Refresh dashboard/);
  assert.match(shared, /connectionLabel\(status\)/);
});

test('Focus mode and obsolete persisted controls are gone; motion follows accessibility preference', async () => {
  const [inbox, ui] = await Promise.all([adminFile('InboxPro.jsx'), adminFile('useOpsUI.js')]);
  assert.doesNotMatch(inbox, /Focus inbox|Exit focus|ui\.focus|setFocus|data-focus=/);
  assert.doesNotMatch(ui, /sessionStorage|UI_KEY|prefs\.focus|setMotion|setFocus/);
  assert.match(ui, /motion:!reduced/);
});

test('Clear navigation to Overview and website Home is kept in Inbox', async () => {
  const inbox = await adminFile('InboxPro.jsx');
  assert.match(inbox, /className=\{calm\.backToOverview\} to="\/admin"/);
  assert.match(inbox, /data-website-home to="\/"/);
  assert.match(inbox, /<Hero inbox/);
});

test('Existing real support behavior is preserved', async () => {
  const inbox = await adminFile('InboxPro.jsx');
  for (const expected of [
    'support.revision','ChatThread key=', 'conversationId={id}', 'onMeta={setMeta}',
    "method:'PUT'", 'onClick={resolve}', 'ReplyTools', 'CustomerPanel id={id}',
    'data-selected={!!id}', 'data-inbox-thread-head', 'data-inbox-scroll-list',
  ]) assert.ok(inbox.includes(expected), `Missing existing Inbox contract: ${expected}`);
  assert.doesNotMatch(inbox, /setInterval\(|wheelDelta|preventDefault\(\).*scroll/);
});

test('Animations target only queue DOM entering view and new message nodes', async () => {
  const hook=await adminFile('useInboxKinetics.js');
  assert.match(hook, /IntersectionObserver/);
  assert.match(hook, /MutationObserver/);
  assert.match(hook, /WeakSet/);
  assert.match(hook, /fresh\.slice\(-4\)/);
  assert.match(hook, /document\.hidden/);
  assert.doesNotMatch(hook, /fetch\(|studioRequest|sendMessage|addEventListener\(['"]wheel/);
});

test('Animation stylesheet is scoped, responsive and respects reduced-motion', async () => {
  const css=await adminFile('adminKinetic19C.module.css');
  assert.match(css,/\.root \[data-inbox-hero\]/);
  assert.match(css,/\[data-inbox-workspace\]/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/max-width:680px/);
  assert.doesNotMatch(css,/\.dth-admin\s*\{|@import|url\(https?:/);
});
