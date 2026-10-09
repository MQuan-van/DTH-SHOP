/** Display rules only. No authorization, price/fitment inference or artificial KPIs. */
export const UI_KEY = 'dth.admin.ops18b.ui.v1';
export function count(value) { return Number.isSafeInteger(value) && value >= 0 ? value : null; }
export function metrics(rows = []) {
  const items = Array.isArray(rows) ? rows : [];
  return { loaded: items.length, open: items.filter(r => r?.status === 'open').length,
    unread: items.filter(r => count(r?.unread) > 0).length,
    messages: items.reduce((sum, r) => sum + (count(r?.unread) || 0), 0) };
}
export function coverage(stats) {
  const total = count(stats?.products), active = count(stats?.active);
  if (total === null || active === null || active > total) return {total, active, hidden: null, percent: null};
  return {total, active, hidden: total - active, percent: total ? Math.round(active / total * 100) : 0};
}
export const stamp = value => { const n = new Date(value || '').getTime(); return Number.isFinite(n) ? n : 0; };
export function relativeTime(value, now = Date.now()) {
  const t = stamp(value); if (!t) return '—';
  const delta = Math.max(0, now - t);
  if (delta < 60000) return 'Just now';
  if (delta < 3600000) return `${Math.floor(delta / 60000)}m ago`;
  if (delta < 86400000) return `${Math.floor(delta / 3600000)}h ago`;
  return `${Math.floor(delta / 86400000)}d ago`;
}
export function sortRows(rows, order = 'recent') {
  return [...(Array.isArray(rows) ? rows : [])].sort((a,b) =>
    (order === 'unread' ? Number(count(b?.unread) > 0) - Number(count(a?.unread) > 0) : 0) ||
    stamp(b?.lastMessageAt || b?.updatedAt) - stamp(a?.lastMessageAt || a?.updatedAt) || String(a?.id).localeCompare(String(b?.id)));
}
export function readQuery(params) {
  const input = new URLSearchParams(params), rawPage = input.get('page');
  return { page: /^[1-9][0-9]{0,4}$/.test(rawPage || '') ? Number(rawPage) : 1,
    status: ['open', 'resolved'].includes(input.get('status')) ? input.get('status') : '',
    q: (input.get('q') || '').slice(0,100),
    id: /^[a-f0-9-]{36}$/i.test(input.get('thread') || '') ? input.get('thread') : '',
    invalidThread: !!input.get('thread') && !/^[a-f0-9-]{36}$/i.test(input.get('thread')) };
}
export function appendReply(draft, snippet, limit = 3000) {
  if (typeof draft !== 'string' || typeof snippet !== 'string' || !snippet.trim()) return null;
  const next = `${draft}${draft.trim() ? '\n\n' : ''}${snippet.trim()}`;
  return next.length <= limit ? next : null;
}
export const REPLIES = Object.freeze([
  {id:'vehicle', label:'Ask vehicle', text:'Bạn đang dùng NVX V1, V2 hay V3? Gửi thêm ảnh vị trí cần lắp để DTH kiểm tra nhé.'},
  {id:'photo', label:'Ask detail photo', text:'Bạn gửi giúp DTH một ảnh rõ hơn của phụ tùng và vị trí lắp nhé. DTH sẽ kiểm tra trước khi tư vấn.'},
  {id:'check', label:'Checking details', text:'DTH đã nhận thông tin và đang kiểm tra chi tiết. Mình sẽ phản hồi ngay khi có kết quả.'},
]);
export function connectionLabel(status) {
  return status === 'live' ? 'Support connected' : status === 'offline' ? 'Support offline' : status === 'connecting' ? 'Connecting support' : 'Reconnecting support';
}
export function vehicleName(vehicle) {
  if (!vehicle) return 'No saved vehicle';
  return [vehicle.make,vehicle.model].filter(v => typeof v === 'string' && v.trim()).join(' ') || 'Saved vehicle';
}
