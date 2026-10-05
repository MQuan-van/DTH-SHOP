const STORAGE_KEY = 'dth.checkout.intent.v1';
const ID = /^[a-zA-Z0-9-]{8,80}$/;

function safeParse(raw) {
  if (typeof raw !== 'string' || raw.length > 32000) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}

export function checkoutPayloadSignature(items, checkout, quoteFingerprint) {
  if (!Array.isArray(items) || typeof quoteFingerprint !== 'string' || !quoteFingerprint) throw new Error('Checkout requires a reviewed cart quote.');
  // A compact change detector is enough here; do not persist raw contact/address fields in sessionStorage.
  const raw = JSON.stringify({ items, checkout, quoteFingerprint });
  let first = 0x811c9dc5, second = 0x9e3779b9;
  for (let index = 0; index < raw.length; index += 1) {
    const code = raw.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 0x01000193);
    second ^= code + index;
    second = Math.imul(second, 0x85ebca6b);
  }
  return `v1-${(first >>> 0).toString(16).padStart(8, '0')}-${(second >>> 0).toString(16).padStart(8, '0')}-${raw.length.toString(36)}`;
}

export function resolveCheckoutIntent(signature, previous, storage, uuid = () => crypto.randomUUID()) {
  if (typeof signature !== 'string' || !signature || signature.length > 32000) throw new Error('Invalid checkout signature.');
  if (previous?.signature === signature && ID.test(previous.id || '')) return previous;
  let stored = null;
  try { stored = safeParse(storage?.getItem(STORAGE_KEY)); } catch { /* blocked storage */ }
  if (stored?.signature === signature && ID.test(stored.id || '')) return stored;
  const raw = String(uuid()).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 60);
  const id = `checkout-${raw}`.slice(0, 80);
  if (!ID.test(id)) throw new Error('Could not create a checkout request key.');
  const next = { signature, id };
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* component memory remains authoritative */ }
  return next;
}

export function finishCheckoutIntent(intent, storage) {
  if (!intent?.id) return;
  try {
    const stored = safeParse(storage?.getItem(STORAGE_KEY));
    if (stored?.id === intent.id) storage.removeItem(STORAGE_KEY);
  } catch { /* best effort */ }
}

export function clearCheckoutIntent(storage) {
  try { storage?.removeItem(STORAGE_KEY); } catch { /* best effort */ }
}
