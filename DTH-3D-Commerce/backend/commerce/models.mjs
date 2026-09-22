import mongoose from 'mongoose';
const { Schema } = mongoose;
const Product = mongoose.model('StoreProduct', new Schema({
  id: { type: String, required: true, unique: true }, slug: { type: String, required: true }, name: { type: String, required: true },
  category: { type: String, required: true }, price: { type: Number, required: true }, currency: { type: String, default: 'VND' },
  description: String, finish: String, accent: String, modelUrl: String, imageUrl: String, vehicleIds: [String],
  specs: Schema.Types.Mixed, assetLicense: String, featured: Boolean, active: { type: Boolean, default: true }, demoOnly: { type: Boolean, default: true },
}, { timestamps: true, collection: 'store_products' }));
const Vehicle = mongoose.model('StoreVehicle', new Schema({
  id: { type: String, required: true, unique: true }, make: String, model: String, year: Number, demoOnly: { type: Boolean, default: true },
}, { collection: 'store_vehicles' }));
const User = mongoose.model('StoreUser', new Schema({
  savedVehicleId: { type: String, default: '' },
  email: { type: String, required: true, unique: true }, passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' }, disabled: { type: Boolean, default: false },
}, { timestamps: true, collection: 'store_users' }));
const Session = mongoose.model('StoreSession', new Schema({
  tokenHash: { type: String, required: true, unique: true }, userId: { type: Schema.Types.ObjectId, required: true },
  csrf: { type: String, required: true }, expiresAt: { type: Date, required: true, expires: 0 },
}, { collection: 'store_sessions' }));
const orderSchema = new Schema({
  id: { type: String, required: true, unique: true }, userId: { type: Schema.Types.ObjectId, required: true },
  idempotencyKey: { type: String, required: true }, requestHash: { type: String, required: true },
  lines: [{ productId: String, vehicleId: String, name: String, quantity: Number, unitPrice: Number, lineTotal: Number, _id: false }],
  subtotal: Number, delivery: Number, total: Number, currency: String, paymentStatus: String,
  status: { type: String, default: 'demo-confirmed' }, demoOnly: { type: Boolean, default: true },
}, { timestamps: true, collection: 'store_orders' });
orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
orderSchema.index({ userId: 1, createdAt: -1, _id: -1 });
const Order = mongoose.model('StoreOrder', orderSchema);
export { Product, Vehicle, User, Session, Order };
