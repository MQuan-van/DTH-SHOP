/** Pure view helpers. Only represent data supplied by the live API; no demo KPIs. */
export function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
export function queueMetrics(rows) {
  const items = Array.isArray(rows) ? rows : [];
  return {
    loaded: items.length,
    open: items.filter(item => item?.status === 'open').length,
    unreadThreads: items.filter(item => safeCount(item?.unread) > 0).length,
    unreadMessages: items.reduce((n, item) => n + (safeCount(item?.unread) ?? 0), 0),
  };
}
export function catalogCoverage(stats) {
  const total = safeCount(stats?.products);
  const active = safeCount(stats?.active);
  if (total === null || active === null || total === 0) return { total, active, percent: null };
  return { total, active, percent: Math.min(100, Math.max(0, Math.round(active / total * 100))) };
}
export function prioritizeRows(rows, mode = 'recent') {
  const items = Array.isArray(rows) ? [...rows] : [];
  if (mode !== 'unread') return items;
  return items.map((item, index) => ({ item, index }))
    .sort((a,b) => (safeCount(b.item.unread) ?? 0) - (safeCount(a.item.unread) ?? 0) || a.index - b.index)
    .map(entry => entry.item);
}
export function relativeTime(value, now = Date.now()) {
  if (value == null || value === '') return 'No recent activity';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'No recent activity';
  const elapsed = Math.max(0, now - time);
  if (elapsed < 60_000) return 'Just now';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  return new Intl.DateTimeFormat('en-GB', { day:'2-digit', month:'short' }).format(time);
}
export function threadHref(id) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) return '/admin/inbox';
  return `/admin/inbox?thread=${encodeURIComponent(id)}`;
}
