import { mongoUri } from './config.mjs';
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { Product, Vehicle, User, Session, Order } from './models.mjs';
import { hashPassword } from './security.mjs';
import { validateRegistration } from '../../shared/domain.mjs';
try {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
  await Promise.all([Product, Vehicle, User, Session, Order].map(model => model.init()));
  const catalog = JSON.parse(await readFile(new URL('../../shared/catalog.json', import.meta.url), 'utf8'));
  // Insert missing demo records only; do not replace edits, drop collections or touch other databases.
  for (const vehicle of catalog.vehicles) await Vehicle.updateOne({ id: vehicle.id }, { $setOnInsert: vehicle }, { upsert: true });
  for (const product of catalog.products) await Product.updateOne({ id: product.id }, { $setOnInsert: product }, { upsert: true });
  if (process.env.SHOP_ADMIN_EMAIL || process.env.SHOP_ADMIN_PASSWORD) {
    const { email, password } = validateRegistration({ email: process.env.SHOP_ADMIN_EMAIL, password: process.env.SHOP_ADMIN_PASSWORD });
    if (await User.exists({ email })) console.log('Admin email already exists; its role and password were not changed.');
    else { await User.create({ email, passwordHash: await hashPassword(password), role: 'admin' }); console.log('Created the explicitly configured demo administrator.'); }
  }
  console.log('Seed complete: 20 original illustrative products, 8 synthetic vehicle configurations. Existing records preserved.');
} catch (error) { console.error(`Seed failed: ${error.name}. Check MongoDB and admin settings.`); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
