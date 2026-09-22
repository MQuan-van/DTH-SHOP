import express from 'express';
import { vehiclePreference, orderQuery, literalSearch } from '../../shared/account.mjs';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { InputError, normalizeItems, quoteOrder, validateProduct, validateRegistration } from '../../shared/domain.mjs';
import { Product, Vehicle, User, Session, Order } from './models.mjs';
import { cookieToken, digest, hashPassword, randomToken, rateLimiter, verifyPassword } from './security.mjs';
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const userView = user => ({ id: String(user._id), email: user.email, role: user.role, savedVehicleId: user.savedVehicleId || '', createdAt: user.createdAt });
const orderView = order => ({ id: order.id, lines: order.lines, total: order.total, subtotal: order.subtotal, delivery: order.delivery, currency: order.currency, paymentStatus: order.paymentStatus, status: order.status, demoOnly: true, createdAt: order.createdAt });
export async function makeApp() {
  const app = express();
  const production = process.env.NODE_ENV === 'production';
  const configuredOrigins = process.env.SHOP_ORIGINS || '';
  if (production && !configuredOrigins) throw new Error('Production requires explicit SHOP_ORIGINS.');
  const origins = new Set((configuredOrigins || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,http://localhost:5000,http://127.0.0.1:5000').split(',').map(x => x.trim()).filter(Boolean));
  if (production && process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); next(); });
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || origins.has(origin)), credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-CSRF-Token'] }));
  app.use('/api/shop', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!origins.has(req.headers.origin)) return res.status(403).json({ message: 'Untrusted or missing Origin header.' });
      if (!req.is('application/json')) return res.status(415).json({ message: 'State changes require application/json.' });
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  const router = express.Router();
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 };
  const dummyHash = await hashPassword(randomToken());
  async function sessionFor(req) {
    const token = cookieToken(req.headers.cookie);
    if (!token) return null;
    const session = await Session.findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } });
    if (!session) return null;
    const user = await User.findOne({ _id: session.userId, disabled: false });
    return user ? { user, session } : null;
  }
  async function createSession(req, res, user) {
    const old = cookieToken(req.headers.cookie);
    if (old) await Session.deleteOne({ tokenHash: digest(old) });
    const token = randomToken(), csrf = randomToken();
    await Session.create({ tokenHash: digest(token), csrf, userId: user._id, expiresAt: new Date(Date.now() + cookieOptions.maxAge) });
    res.cookie('dth_commerce_session', token, cookieOptions);
    return { user: userView(user), csrf };
  }
  const authenticated = asyncRoute(async (req, res, next) => {
    const result = await sessionFor(req);
    if (!result) return res.status(401).json({ message: 'Please sign in again.' });
    req.auth = result;
    if (!['GET', 'HEAD'].includes(req.method) && req.headers['x-csrf-token'] !== result.session.csrf) return res.status(403).json({ message: 'Invalid CSRF token. Refresh the page and try again.' });
    next();
  });
  const admin = (req, res, next) => req.auth.user.role === 'admin' ? next() : res.status(403).json({ message: 'Administrator access required.' });
  const authLimit = rateLimiter({ max: 12, windowMs: 15 * 60 * 1000, prefix: 'auth' });
  const writeLimit = rateLimiter({ max: 40, windowMs: 60 * 1000, prefix: 'write' });
  router.get('/health', (req, res) => res.json({ success: true, demoOnly: true, paymentMode: 'simulation' }));
  router.get('/products', asyncRoute(async (req, res) => res.json({ data: await Product.find({ active: true }).select('-_id -__v').sort({ name: 1 }).lean() })));
  router.get('/vehicles', asyncRoute(async (req, res) => res.json({ data: await Vehicle.find().select('-_id -__v').sort({ make: 1, model: 1, year: 1 }).lean() })));
  router.get('/auth/me', asyncRoute(async (req, res) => { const result = await sessionFor(req); res.json(result ? { user: userView(result.user), csrf: result.session.csrf } : { user: null, csrf: '' }); }));
  router.post('/auth/register', authLimit, asyncRoute(async (req, res) => {
    const { email, password } = validateRegistration(req.body);
    if (await User.exists({ email })) throw new InputError('Account cannot be created with these details.', 409);
    const user = await User.create({ email, passwordHash: await hashPassword(password), role: 'customer', disabled: false });
    res.status(201).json(await createSession(req, res, user));
  }));
  router.post('/auth/login', authLimit, asyncRoute(async (req, res) => {
    const { email, password } = validateRegistration(req.body);
    const user = await User.findOne({ email, disabled: false });
    const valid = await verifyPassword(password, user?.passwordHash || dummyHash);
    if (!user || !valid) throw new InputError('Email or password is incorrect.', 401);
    res.json(await createSession(req, res, user));
  }));
  router.post('/auth/logout', authenticated, asyncRoute(async (req, res) => {
    await Session.deleteOne({ _id: req.auth.session._id });
    const { maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie('dth_commerce_session', clearOptions).json({ success: true });
  }));
  router.delete('/auth/account', authenticated, authLimit, asyncRoute(async (req, res) => {
    if (!(await verifyPassword(req.body?.password, req.auth.user.passwordHash))) throw new InputError('Password is incorrect.', 401);
    // Disable first: a partial deletion cannot leave the account able to sign in.
    await User.updateOne({ _id: req.auth.user._id }, { $set: { disabled: true } });
    await Session.deleteMany({ userId: req.auth.user._id });
    await Order.deleteMany({ userId: req.auth.user._id });
    await User.deleteOne({ _id: req.auth.user._id });
    const { maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie('dth_commerce_session', clearOptions).json({ success: true });
  }));
  router.get(
    '/orders/:id',
    authenticated,
    asyncRoute(async (req, res) => {
      if (!/^[A-Z0-9-]{5,80}$/.test(req.params.id)) {
        throw new InputError('Order not found.', 404);
      }

      const order = await Order.findOne({
        id: req.params.id,
        userId: req.auth.user._id,
      }).lean();

      if (!order) {
        throw new InputError('Order not found.', 404);
      }

      res.json({
        data: orderView(order),
      });
    })
  );
  // Account routes share the existing authenticated middleware (cookie + CSRF + Origin).
  router.put('/account/vehicle', authenticated, writeLimit, asyncRoute(async (req, res) => {
    const savedVehicleId = vehiclePreference(req.body);
    if (savedVehicleId && !await Vehicle.exists({ id: savedVehicleId })) {
      throw new InputError('This vehicle is no longer in the catalog.', 409);
    }
    const user = await User.findOneAndUpdate(
      { _id: req.auth.user._id, disabled: false },
      { $set: { savedVehicleId } },
      { new: true, runValidators: true }
    );
    if (!user) throw new InputError('Please sign in again.', 401);
    res.json({ user: userView(user) });
  }));
  router.get('/account/orders', authenticated, asyncRoute(async (req, res) => {
    const { page, pageSize, search } = orderQuery(req.query);
    const query = { userId: req.auth.user._id };
    if (search) query.$or = [
      { id: { $regex: literalSearch(search), $options: 'i' } },
      { 'lines.name': { $regex: literalSearch(search), $options: 'i' } },
    ];
    const [total, orders] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    ]);
    res.json({ data: orders.map(orderView), total, page, pageSize });
  }));
  router.get('/account/orders/:id', authenticated, asyncRoute(async (req, res) => {
    if (!/^[A-Z0-9-]{5,80}$/.test(req.params.id)) throw new InputError('Order not found.', 404);
    const order = await Order.findOne({ id: req.params.id, userId: req.auth.user._id }).lean();
    if (!order) throw new InputError('Order not found.', 404);
    res.json({ data: orderView(order) });
  }));
  router.get('/orders', authenticated, asyncRoute(async (req, res) => { const orders = await Order.find({ userId: req.auth.user._id }).sort({ createdAt: -1 }).limit(100).lean(); res.json({ data: orders.map(orderView) }); }));
  router.post('/orders', authenticated, writeLimit, asyncRoute(async (req, res) => {
    if (req.body?.demoAcknowledged !== true) throw new InputError('Confirm the simulated nature of this order.');
    const idempotencyKey = req.body?.idempotencyKey;
    if (typeof idempotencyKey !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(idempotencyKey)) throw new InputError('Invalid idempotency key.');
    const items = normalizeItems(req.body.items), requestHash = digest(JSON.stringify(items));
    const query = { userId: req.auth.user._id, idempotencyKey };
    const previous = await Order.findOne(query).lean();
    if (previous) {
      if (previous.requestHash !== requestHash) throw new InputError('This order key has already been used for a different bag.', 409);
      return res.json({ data: orderView(previous) });
    }
    const products = await Product.find({ id: { $in: items.map(i => i.productId) } }).lean();
    const vehicles = await Vehicle.find({ id: { $in: items.map(i => i.vehicleId) } }).lean();
    const quote = quoteOrder(items, products, vehicles);
    // Chỉ dùng expectedTotal để phát hiện tổng tiền đã đổi.
    // Giá lưu vào đơn vẫn được server tính từ database.
    if (
      !Number.isSafeInteger(req.body.expectedTotal) ||
      req.body.expectedTotal < 0
    ) {
      throw new InputError(
        'Review the current total before confirming this demo order.'
      );
    }

    if (req.body.expectedTotal !== quote.total) {
      throw new InputError(
        'The catalog price changed. Refresh your bag and review the total again.',
        409
      );
    }
    // Demo orders do not reserve or decrement physical inventory.
    try {
      const order = await Order.create({ ...quote, ...query, requestHash, id: `DTH-${randomUUID().slice(0, 13).toUpperCase()}`, demoOnly: true, status: 'demo-confirmed' });
      res.status(201).json({ data: orderView(order) });
    } catch (error) {
      if (error.code !== 11000) throw error;
      const concurrent = await Order.findOne(query).lean();
      if (!concurrent || concurrent.requestHash !== requestHash) throw new InputError('Order conflict. Refresh and try again.', 409);
      res.json({ data: orderView(concurrent) });
    }
  }));
  router.get('/admin/products', authenticated, admin, asyncRoute(async (req, res) => res.json({ data: await Product.find().select('-_id -__v').sort({ name: 1 }).lean() })));
  router.put('/admin/products/:id', authenticated, admin, writeLimit, asyncRoute(async (req, res) => {
    const vehicles = await Vehicle.find().lean();
    const record = validateProduct(req.body, vehicles);
    if (record.id !== req.params.id) throw new InputError('Path and product ID must match.');
    const result = await Product.findOneAndUpdate({ id: record.id }, { $set: record }, { upsert: true, new: true, runValidators: true }).select('-_id -__v').lean();
    res.json({ data: result });
  }));
  app.use('/api/shop', router);
  app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));
  const dist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
  if (existsSync(`${dist}/index.html`)) { app.use(express.static(dist)); app.get('*', (req, res) => res.sendFile(`${dist}/index.html`)); }
  else app.get('/', (req, res) => res.json({ message: 'DTH demo API. Open the Vite frontend on port 5173.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof InputError) return res.status(error.status).json({ message: error.message });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' });
    if (error.code === 11000) return res.status(409).json({ message: 'A record with these details already exists.' });
    console.error('Store API error:', error.name); // Never log request bodies, passwords or tokens.
    res.status(500).json({ message: 'Server error. Please try again later.' });
  });
  return app;
}
