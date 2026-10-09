import { fitment, InputError, normalizeItems } from './domain.mjs';

const SOURCES = new Set(['api', 'flow', 'preview']);
const keyFor = line => `${line.productId}:${line.vehicleId}`;

function vehicleName(vehicle, fallback) {
  if (!vehicle) return fallback;
  const name = [vehicle.make, vehicle.model]
    .filter(value => typeof value === 'string' && value.trim())
    .join(' ');
  const year = typeof vehicle.year === 'number' || typeof vehicle.year === 'string'
    ? String(vehicle.year) : '';
  return [name, year].filter(Boolean).join(' · ') || fallback;
}

/**
 * A deterministic representation of the reviewed commercial facts, not an
 * authorization token. The server always reads the catalog again on checkout.
 * Time and adapter source do not change the facts the customer reviewed.
 */
export function cartQuoteFingerprint(quote) {
  if (!quote || !Array.isArray(quote.lines)) throw new InputError('Invalid cart quote.');
  const lines = [...quote.lines]
    .sort((a, b) => keyFor(a).localeCompare(keyFor(b)))
    .map(line => ({
      productId: line.productId,
      vehicleId: line.vehicleId,
      quantity: line.quantity,
      name: line.name,
      vehicleLabel: line.vehicleLabel,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      status: line.status,
    }));
  return JSON.stringify({
    version: 1,
    lines,
    valid: quote.valid,
    subtotal: quote.subtotal,
    total: quote.total,
    currency: quote.currency,
    delivery: quote.delivery,
    paymentStatus: quote.paymentStatus,
  });
}

/**
 * Revalidate each product/vehicle line against the supplied authoritative
 * catalog. Invalid business lines stay visible; malformed requests still fail
 * with 400 through normalizeItems. This catalog has no inventory quantities.
 */
export function quoteCart(items, products, vehicles, {
  source = 'api',
  now = () => new Date().toISOString(),
} = {}) {
  const clean = normalizeItems(items);
  if (!Array.isArray(products) || !Array.isArray(vehicles)) {
    throw new InputError('The current catalog could not be read.', 503);
  }
  if (!SOURCES.has(source)) throw new InputError('Invalid cart quote source.');
  const productsById = new Map(products.map(product => [product.id, product]));
  const vehiclesById = new Map(vehicles.map(vehicle => [vehicle.id, vehicle]));
  const lines = clean.map(item => {
    const product = productsById.get(item.productId);
    const vehicle = vehiclesById.get(item.vehicleId);
    const name = typeof product?.name === 'string' && product.name.trim()
      ? product.name : item.productId;
    const line = {
      ...item,
      name,
      vehicleLabel: vehicleName(vehicle, item.vehicleId),
      unitPrice: null,
      lineTotal: null,
      status: 'compatible',
      issue: '',
    };
    if (!product || product.active === false) {
      return { ...line, status: 'unavailable', issue: 'This part is no longer available. Remove it from your bag.' };
    }
    // Older catalog records inherit the schema's VND default. An explicit
    // different currency must never be relabelled or added to a VND total.
    if ((product.currency !== undefined && product.currency !== 'VND')
      || !Number.isSafeInteger(product.price) || product.price < 0 || product.price > 1_000_000_000) {
      return { ...line, status: 'price-unavailable', issue: 'A valid price in VND is unavailable. Review this part after the catalog is corrected.' };
    }
    line.unitPrice = product.price;
    line.lineTotal = product.price * item.quantity;
    const match = fitment(product, item.vehicleId, vehicles);
    if (match.status !== 'compatible') {
      line.status = match.status === 'incompatible' ? 'incompatible' : 'unknown';
      line.issue = !vehicle
        ? 'This vehicle is no longer in the catalog. Choose another vehicle for this line.'
        : line.status === 'unknown'
          ? 'Compatibility data is unavailable for this part. Choose a verified demo match.'
          : 'This part does not match the selected demo vehicle. Choose a matching vehicle or remove the part.';
    }
    return line;
  });
  const valid = lines.every(line => line.status === 'compatible');
  const total = valid ? lines.reduce((sum, line) => sum + line.lineTotal, 0) : null;
  if (valid && !Number.isSafeInteger(total)) throw new InputError('The cart total is invalid.', 409);
  const quote = {
    version: 1,
    source,
    quotedAt: now(),
    items: clean,
    lines,
    valid,
    subtotal: total,
    total,
    currency: 'VND',
    delivery: 0,
    paymentStatus: 'simulated',
    inventoryChecked: false,
  };
  return { ...quote, fingerprint: cartQuoteFingerprint(quote) };
}
