import { normalizeItems } from './domain.mjs';
import { cartQuoteFingerprint } from './cartQuote.mjs';

const statuses = new Set(['compatible', 'unavailable', 'price-unavailable', 'unknown', 'incompatible']);
const key = item => `${item.productId}:${item.vehicleId}`;
const money = value => Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000;
const sameItem = (a, b) => a?.productId === b?.productId && a?.vehicleId === b?.vehicleId && a?.quantity === b?.quantity;

/** Check the response contract before displaying a quote as checked. This does
 * not make client state authoritative; orders are revalidated by the server. */
export function verifyCartQuoteResponse(quote, requestedItems, expectedSource) {
  const fail = () => { throw new Error('The cart quote could not be verified. Your bag has been kept. Please try again.'); };
  const requested = normalizeItems(requestedItems);
  if (!quote || typeof quote !== 'object' || Array.isArray(quote)
    || quote.version !== 1 || quote.source !== expectedSource
    || !['api', 'flow', 'preview'].includes(expectedSource)
    || typeof quote.quotedAt !== 'string' || !Number.isFinite(Date.parse(quote.quotedAt))
    || new Date(quote.quotedAt).toISOString() !== quote.quotedAt
    || quote.currency !== 'VND' || quote.delivery !== 0 || quote.paymentStatus !== 'simulated'
    || quote.inventoryChecked !== false || typeof quote.valid !== 'boolean'
    || !Array.isArray(quote.items) || !Array.isArray(quote.lines)
    || quote.items.length !== requested.length || quote.lines.length !== requested.length) fail();
  if (!quote.items.every((item, index) => sameItem(item, requested[index]))) fail();
  const byKey = new Map(requested.map(item => [key(item), item]));
  const seen = new Set();
  for (const line of quote.lines) {
    if (!line || typeof line !== 'object' || Array.isArray(line)) fail();
    const id = key(line), item = byKey.get(id);
    if (!item || seen.has(id) || !sameItem(item, line)
      || typeof line.name !== 'string' || !line.name.trim()
      || typeof line.vehicleLabel !== 'string' || !line.vehicleLabel.trim()
      || !statuses.has(line.status) || typeof line.issue !== 'string'
      || (line.unitPrice !== null && !money(line.unitPrice))) fail();
    seen.add(id);
    if (line.unitPrice === null ? line.lineTotal !== null : line.lineTotal !== line.unitPrice * line.quantity) fail();
    if (line.status === 'compatible' && (!money(line.unitPrice) || line.issue !== '')) fail();
    if (line.status !== 'compatible' && !line.issue.trim()) fail();
  }
  const valid = quote.lines.every(line => line.status === 'compatible');
  const total = valid ? quote.lines.reduce((sum, line) => sum + line.lineTotal, 0) : null;
  if (quote.valid !== valid || quote.total !== total || quote.subtotal !== total
    || (valid && !Number.isSafeInteger(total))
    || typeof quote.fingerprint !== 'string' || quote.fingerprint !== cartQuoteFingerprint(quote)) fail();
  return quote;
}
