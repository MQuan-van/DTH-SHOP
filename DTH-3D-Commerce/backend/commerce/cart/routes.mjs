import { normalizeItems } from '../../../shared/domain.mjs';
import { quoteCart } from '../../../shared/cartQuote.mjs';
import { rateLimiter } from '../security.mjs';

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

/** Public read: creates no order, session, payment or inventory reservation. */
export function installCart(router, { Product, Vehicle, vehicleQuery = ids => ({ id: { $in: ids } }) }) {
  const quoteLimit = rateLimiter({ max: 60, windowMs: 60_000, prefix: 'cart-quote' });
  router.post('/cart/quote', quoteLimit, asyncRoute(async (req, res) => {
    // Validate before building either query: client objects never become Mongo
    // query operators, and malformed/oversized carts do not touch the database.
    const items = normalizeItems(req.body?.items);
    const productIds = [...new Set(items.map(item => item.productId))];
    const vehicleIds = [...new Set(items.map(item => item.vehicleId))];
    const [products, vehicles] = await Promise.all([
      Product.find({ id: { $in: productIds } }).select('id name price currency active vehicleIds -_id').lean(),
      Vehicle.find(vehicleQuery(vehicleIds)).select('id make model year -_id').lean(),
    ]);
    const quote = quoteCart(items, products, vehicles, { source: 'api' });
    res.set('Cache-Control', 'no-store').json({ data: quote });
  }));
}
