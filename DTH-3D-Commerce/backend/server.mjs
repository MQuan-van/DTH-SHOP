import { mongoUri } from './commerce/config.mjs';
import mongoose from 'mongoose';
import { makeApp } from './commerce/app.mjs';
import { Product, Vehicle, User, Session, Order } from './commerce/models.mjs';
try {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
  await Promise.all([Product, Vehicle, User, Session, Order].map(model => model.init()));
  const app = await makeApp();
  const port = Number(process.env.PORT || 5000), host = process.env.HOST || '127.0.0.1';
  const server = app.listen(port, host, () => console.log(`DTH demonstration API listening at http://${host}:${port}`));
  server.on('error', async error => {
    console.error(`HTTP server error (${error.code || error.name}). Check whether the port is already in use.`);
    await mongoose.disconnect(); process.exitCode = 1;
  });
  const shutdown = () => server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(`Startup failed (${error.name}). Check MongoDB, environment settings and whether the port is available.`);
  await mongoose.disconnect(); process.exitCode = 1;
}
