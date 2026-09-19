/** Domain rules shared by browser preview, API and tests. All money is integer VND. */
export class InputError extends Error {
  constructor(message, status = 400) { super(message); this.name = 'InputError'; this.status = status; }
}
export const CATEGORIES = ['suspension', 'wheels', 'exhausts', 'mirrors', 'brakes'];
export const formatMoney = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
export function fitment(product, vehicleId, vehicles) {
  if (!vehicleId) return { status: 'unselected', text: 'Select a demo vehicle' };
  if (!vehicles.some(v => v.id === vehicleId)) return { status: 'unknown', text: 'Vehicle not in demo dataset' };
  if (!Array.isArray(product.vehicleIds)) return { status: 'unknown', text: 'No compatibility data' };
  return product.vehicleIds.includes(vehicleId)
    ? { status: 'compatible', text: 'Matches demo vehicle' }
    : { status: 'incompatible', text: 'No match in demo dataset' };
}
export function filterProducts(products, { search = '', category = '', maxPrice = Infinity, vehicleId = '' } = {}, vehicles = []) {
  const query = String(search).trim().toLowerCase();
  return products.filter(p => p.active !== false
    && (!category || p.category === category)
    && p.price <= maxPrice
    && (!query || `${p.name} ${p.category} ${p.finish}`.toLowerCase().includes(query))
    && (!vehicleId || fitment(p, vehicleId, vehicles).status === 'compatible'));
}
export function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20) throw new InputError('Cart must contain between 1 and 20 lines.');
  const normalized = new Map();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new InputError('Invalid cart item.');
    if (typeof item.productId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(item.productId)) throw new InputError('Invalid product ID.');
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) throw new InputError('Quantity must be an integer from 1 to 10.');
    if (typeof item.vehicleId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(item.vehicleId)) throw new InputError('Choose a demo vehicle for every cart item.');
    const key = `${item.productId}:${item.vehicleId}`;
    const previous = normalized.get(key);
    const quantity = (previous?.quantity || 0) + item.quantity;
    if (quantity > 10) throw new InputError('Maximum quantity is 10 per product and vehicle.');
    normalized.set(key, { productId: item.productId, quantity, vehicleId: item.vehicleId });
  }
  return [...normalized.values()].sort((a, b) => `${a.productId}:${a.vehicleId}`.localeCompare(`${b.productId}:${b.vehicleId}`));
}
export function quoteOrder(items, products, vehicles) {
  const clean = normalizeItems(items);
  const lines = clean.map(item => {
    const product = products.find(p => p.id === item.productId && p.active !== false);
    if (!product) throw new InputError('A product is no longer available. Refresh your bag.', 409);
    if (!Number.isSafeInteger(product.price) || product.price < 0 || product.price > 1000000000) throw new InputError('Invalid catalog price.', 409);
    if (fitment(product, item.vehicleId, vehicles).status !== 'compatible') throw new InputError(`${product.name} does not match the selected demo vehicle.`, 409);
    return { ...item, name: product.name, unitPrice: product.price, lineTotal: product.price * item.quantity };
  });
  const total = lines.reduce((sum, item) => sum + item.lineTotal, 0);
  if (!Number.isSafeInteger(total)) throw new InputError('Order total is invalid.');
  return { lines, subtotal: total, total, currency: 'VND', delivery: 0, paymentStatus: 'simulated' };
}
export function validateRegistration(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError('Enter a valid email.');
  if (password.length < 12 || password.length > 128) throw new InputError('Use a password between 12 and 128 characters.');
  return { email, password };
}
export function validateProduct(body, vehicles) {
  const text = (key, max) => {
    if (typeof body?.[key] !== 'string' || !body[key].trim() || body[key].length > max) throw new InputError(`Invalid ${key}.`);
    return body[key].trim();
  };
  const id = text('id', 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new InputError('Use a lowercase, hyphenated product ID.');
  const category = text('category', 40);
  if (!CATEGORIES.includes(category)) throw new InputError('Unknown category.');
  if (!Number.isSafeInteger(body.price) || body.price < 1 || body.price > 1000000000) throw new InputError('Price must be a positive integer in VND.');
  const modelUrl = text('modelUrl', 200), imageUrl = text('imageUrl', 200);
  if (!/^\/models\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.glb$/.test(modelUrl)) throw new InputError('Use a local /models/...glb URL.');
  if (!/^\/previews\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(imageUrl)) throw new InputError('Use a local /previews/...png, jpg or webp URL.');
  if (!Array.isArray(body.vehicleIds) || !body.vehicleIds.length || body.vehicleIds.length > 30 || body.vehicleIds.some(id => typeof id !== 'string' || !vehicles.some(v => v.id === id))) throw new InputError('Select known demo vehicles.');
  return { id, slug: id, name: text('name', 100), category, price: body.price, finish: text('finish', 80), description: text('description', 2000), modelUrl, imageUrl, vehicleIds: [...new Set(body.vehicleIds)], currency: 'VND', active: body.active !== false, demoOnly: true, assetLicense: 'Administrator must record asset provenance', specs: { 'Asset purpose': 'Demonstration only' } };
}
