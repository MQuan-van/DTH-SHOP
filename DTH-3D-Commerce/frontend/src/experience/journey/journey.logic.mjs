/** Entrance preference, never an authentication/authorization decision. */
export const JOURNEY_KEY = 'dth.story.visited.v1';
const memory = new Set();
const idKey = (mode, id) => typeof id === 'string' && id && id.length < 200
  ? `${JOURNEY_KEY}:${mode === 'flow' ? 'flow' : 'api'}:${encodeURIComponent(id)}` : '';
export function browserSession() { try { return window.sessionStorage; } catch { return null; } }
export function storyVisited(mode, id, storage = browserSession()) {
  const key = idKey(mode, id); if (!key) return false;
  try { return memory.has(key) || storage?.getItem(key) === '1'; } catch { return memory.has(key); }
}
export function visitStory(mode, id, storage = browserSession()) {
  const key = idKey(mode, id); if (!key) return false;
  memory.add(key);
  try { storage?.setItem(key, '1'); } catch { /* This document still remembers the visit. */ }
  return true;
}
export function forgetStory(mode, id, storage = browserSession()) {
  const key = idKey(mode, id); memory.delete(key);
  try { storage?.removeItem(key); } catch { /* No other storage keys are touched. */ }
}
export function safeJourneyReturn(value) {
  if (typeof value !== 'string' || value.length > 180) return '';
  // Never accept arbitrary URLs, account loops, fragments or protocol-relative paths.
  if (['/bag', '/checkout', '/shop'].includes(value)) return value;
  return /^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : '';
}
export function signInDestination(value, mode, user, storage = browserSession()) {
  const requested = safeJourneyReturn(value);
  if (requested) return requested; // Do not interrupt a customer's checkout/product intent.
  return storyVisited(mode, user?.id, storage) ? '/' : '/story?intro=1';
}
export function entranceDecision({ loading, error, user, mode = 'api', visited = false } = {}) {
  if (loading) return 'pending';
  if (error || !user || mode === 'preview') return 'account';
  return visited ? 'home' : 'story';
}
