import { patchShopQuery, selectShopProducts } from '../catalog.logic.mjs';

export const SEARCH_DISCOVERY = Object.freeze({ minLength: 2, limit: 6, maxLength: 160 });
export const cleanSearch = value => typeof value === 'string' ? value.trim().slice(0, SEARCH_DISCOVERY.maxLength) : '';
export const productPath = product => typeof product?.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug)
  ? `/products/${product.slug}` : null;

/** Exactly the same matching, sorting and fitment rules as the actual catalog. */
export function suggestProducts(products, vehicles, vehicleId, query, value) {
  const term = cleanSearch(value);
  if (Array.from(term).length < SEARCH_DISCOVERY.minLength) return { term, items: [], total: 0, eligible: false };
  const pool = Array.isArray(products) ? products.filter(p => p && productPath(p)) : [];
  const matches = selectShopProducts(pool, Array.isArray(vehicles) ? vehicles : [], vehicleId, { ...query, search: term });
  return { term, items: matches.slice(0, SEARCH_DISCOVERY.limit), total: matches.length, eligible: true };
}

/** Preserve filters and unrelated URL keys; a changed search resets pagination only. */
export function searchReturnUrl(input, value) {
  const params = new URLSearchParams(input);
  const term = cleanSearch(value);
  const next = cleanSearch(params.get('q')) === term ? params : patchShopQuery(params, { q: term });
  const search = next.toString();
  return `/shop${search ? `?${search}` : ''}`;
}

export function nextSuggestionIndex(index, count, direction) {
  if (!Number.isInteger(count) || count < 1) return -1;
  if (direction !== 1 && direction !== -1) return -1;
  if (!Number.isInteger(index) || index < 0 || index >= count) return direction === 1 ? 0 : count - 1;
  return Math.max(-1, Math.min(count - 1, index + direction));
}

/** Plain text pieces, never HTML. Treat regex metacharacters as ordinary search text. */
export function highlightPieces(value, input) {
  const text = typeof value === 'string' ? value : '';
  const terms = [...new Set(cleanSearch(input).toLowerCase().split(/\s+/u).filter(Boolean))];
  if (!text || !terms.length) return [{ text, match: false }];
  const lower = text.toLowerCase(), ranges = [];
  for (const term of terms) {
    let start = 0, index;
    while ((index = lower.indexOf(term, start)) !== -1) { ranges.push([index, index + term.length]); start = index + term.length; }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  const pieces = []; let end = 0;
  for (const [start, stop] of merged) {
    if (start > end) pieces.push({ text: text.slice(end, start), match: false });
    pieces.push({ text: text.slice(start, stop), match: true }); end = stop;
  }
  if (end < text.length) pieces.push({ text: text.slice(end), match: false });
  return pieces.length ? pieces : [{ text, match: false }];
}
