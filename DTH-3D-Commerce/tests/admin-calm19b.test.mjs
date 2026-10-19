import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const file = path => readFile(new URL(`../frontend/src/shop/admin/ops18b/${path}`, import.meta.url),'utf8');

test('Admin hero no longer mounts 3D Mechanism or imports a WebGL scene',async()=>{
  const body=await file('ProShared.jsx');
  assert.doesNotMatch(body,/import\s+Mechanism\s+from/);
  assert.doesNotMatch(body,/<Mechanism\b/);
  assert.match(body,/className=\{calm\.heroGraphic\}/);
  assert.match(body,/In control\./);
});

test('Inbox always offers a direct Overview link and website Home link',async()=>{
  const body=await file('InboxPro.jsx');
  assert.match(body,/<Link\s+className=\{calm\.backToOverview\}\s+to="\/admin"/);
  assert.match(body,/<Link\s+className=\{calm\.siteHome\}\s+to="\/"/);
  const topbar=body.slice(body.indexOf('<Topbar label="Inbox"'),body.indexOf('</Topbar>'));
  assert.match(topbar,/Back to Admin overview/);
  assert.doesNotMatch(topbar,/Focus inbox/);
  assert.doesNotMatch(topbar,/ui\.focus\s*&&\s*<Link/);
});

test('Inbox retains live support, thread, identity, status update, and customer context',async()=>{
  const body=await file('InboxPro.jsx');
  for(const text of ['ChatThread key=', 'support.revision', 'onMeta={setMeta}', "method:'PUT'", 'CustomerPanel id={id}', 'onClick={resolve}', 'composerTools={args=><ReplyTools'])
    assert.ok(body.includes(text),`Missing existing workflow: ${text}`);
  assert.match(body,/data-selected=\{!!id\}/);
  assert.match(body,/Clear search and filters/);
});

test('The refinement styles are scoped, static for Hero, and accommodate mobile/reduced motion',async()=>{
  const body=await file('adminCalm19B.module.css');
  assert.match(body,/\.inboxRoot/);
  assert.match(body,/\.heroGraphic/);
  assert.match(body,/@media\(max-width:680px\)/);
  assert.match(body,/prefers-reduced-motion/);
  assert.doesNotMatch(body,/@keyframes/);
});
