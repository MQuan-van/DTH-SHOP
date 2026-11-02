/** Presentation helpers only. The existing Discovery/Store providers own all writes. */
export function ownerKey232(ownerId, vehicleId) {
  return JSON.stringify([typeof ownerId === 'string' ? ownerId : null, typeof vehicleId === 'string' ? vehicleId : null]);
}
export function memberLabel232(user) {
  const email = typeof user?.email === 'string' ? user.email : '';
  return { signedIn: Boolean(user?.id), label: user?.id ? 'My DTH' : 'Sign in', initial: email.trim().slice(0, 1).toUpperCase() || 'D' };
}
export function receipt232(request, draft, key) {
  if (!request || request.key !== key || !Array.isArray(draft)) return null;
  const item = draft.find(p => p?.id === request.product?.id && p.category === request.product?.category);
  if (!item || draft.filter(p => p?.category === item.category).length !== 1) return null;
  const replaced = request.previous && request.previous.id !== item.id ? request.previous : null;
  return { product: item, replaced, key, count: draft.length, trigger: request.trigger, action: replaced ? 'replaced' : 'added' };
}
export function supportMode232(mode, user) {
  if (mode !== 'api') return 'preview';
  if (!user?.id) return 'guest';
  return user.role === 'admin' ? 'admin' : 'customer';
}
export function safeMoney232(price) {
  return Number.isSafeInteger(price) && price >= 0 ? new Intl.NumberFormat('vi-VN').format(price) + ' ₫' : 'Price unavailable';
}
export function isBuild232(pathname, search) {
  return pathname === '/shop' && new URLSearchParams(search).get('mode') === 'build';
}
