import test from 'node:test';
import assert from 'node:assert/strict';
import { safeCount, queueMetrics, catalogCoverage, prioritizeRows, relativeTime, threadHref } from '../frontend/src/shop/admin/ops18/ops.logic.mjs';

test('admin counts preserve unavailable data rather than inventing zeros', () => {
  assert.equal(safeCount(undefined), null);
  assert.equal(safeCount(-1), null);
  assert.equal(safeCount(4.2), null);
  assert.equal(safeCount(0), 0);
});
test('overview catalog coverage comes from real product counts', () => {
  assert.deepEqual(catalogCoverage({products:20,active:15}), {total:20,active:15,percent:75});
  assert.equal(catalogCoverage({products:0,active:0}).percent, null);
  assert.equal(catalogCoverage(null).percent, null);
  assert.equal(catalogCoverage({products:2,active:5}).percent,100);
});
test('inbox metrics represent just the currently loaded page', () => {
  const rows=[{id:'a',status:'open',unread:3},{id:'b',status:'resolved',unread:0},{id:'c',status:'open',unread:1}];
  assert.deepEqual(queueMetrics(rows),{loaded:3,open:2,unreadThreads:2,unreadMessages:4});
  assert.deepEqual(queueMetrics(undefined),{loaded:0,open:0,unreadThreads:0,unreadMessages:0});
});
test('priority ordering stable and never mutates API rows', () => {
  const rows=[{id:'a',unread:0},{id:'b',unread:2},{id:'c',unread:2}];
  assert.deepEqual(prioritizeRows(rows,'unread').map(x=>x.id),['b','c','a']);
  assert.deepEqual(rows.map(x=>x.id),['a','b','c']);
  assert.deepEqual(prioritizeRows(rows,'recent').map(x=>x.id),['a','b','c']);
});
test('relative time gracefully handles unknown timestamps', () => {
  const now=new Date('2026-10-09T10:00:00Z').getTime();
  assert.equal(relativeTime(null,now),'No recent activity');
  assert.equal(relativeTime('2026-10-09T09:55:00Z',now),'5m ago');
  assert.equal(relativeTime('2026-10-09T08:00:00Z',now),'2h ago');
});
test('conversation navigation only accepts UUID-style ids', () => {
  assert.equal(threadHref('a'.repeat(36)), '/admin/inbox?thread='+ 'a'.repeat(36));
  assert.equal(threadHref('/admin'), '/admin/inbox');
});
