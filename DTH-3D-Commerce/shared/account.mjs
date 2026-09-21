/** Account boundary helpers. No browser or database dependencies. */
import { InputError } from './domain.mjs';

export function accountReturnPath(value) {
  if (value === '/bag' || value === '/shop') return value;
  if (typeof value === 'string' && /^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100) return value;
  return '/account';
}

export function vehiclePreference(body) {
  const id = body?.vehicleId;
  if (id === '') return '';
  if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 80) {
    throw new InputError('Choose a vehicle from the catalog.');
  }
  return id;
}

export function orderQuery(query = {}) {
  const rawPage = typeof query.page === 'string' ? query.page : '1';
  if (!/^[1-9][0-9]{0,4}$/.test(rawPage)) throw new InputError('Invalid order page.');
  const rawSearch = query.q ?? '';
  if (typeof rawSearch !== 'string' || rawSearch.length > 64) throw new InputError('Keep the order search under 65 characters.');
  return { page: Number(rawPage), pageSize: 8, search: rawSearch.trim() };
}

export function literalSearch(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function orderUnits(order) {
  return Array.isArray(order?.lines) ? order.lines.reduce((n, line) => n + (Number.isSafeInteger(line.quantity) && line.quantity > 0 ? line.quantity : 0), 0) : 0;
}
