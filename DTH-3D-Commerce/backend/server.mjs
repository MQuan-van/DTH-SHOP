import { mongoUri } from './commerce/config.mjs';
import mongoose from 'mongoose';
import { makeApp } from './commerce/app.mjs';
import { Product, Vehicle, User, Session, Order } from './commerce/models.mjs';
import { startupFailure } from './commerce/startup.mjs';
let stage = 'MongoDB connection';
try {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
  stage = 'collection/index initialization';
  await Promise.all([Product, Vehicle, User, Session, Order].map(model => model.init()));
  stage = 'application initialization';
  const app = await makeApp();
  const port = Number(process.env.PORT || 5000), host = process.env.HOST || '127.0.0.1';
  stage = 'HTTP listen';
  const server = app.listen(port, host, () => console.log(`DTH demonstration API listening at http://${host}:${port}`));
  server.on('error', async error => {
    console.error(startupFailure(error, 'HTTP listen'));
    app.locals.supportHub?.close(); await mongoose.disconnect(); process.exitCode = 1;
  });
  let stopping=false;
  const shutdown = () => {
    if(stopping)return;stopping=true;
    app.locals.supportHub?.close();
    const timeout=setTimeout(()=>{server.closeAllConnections();void mongoose.disconnect().finally(()=>process.exit(0));},5000);timeout.unref();
    server.close(async () => {clearTimeout(timeout);await mongoose.disconnect();process.exit(0);});
  };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(startupFailure(error, stage));
  await mongoose.disconnect(); process.exitCode = 1;
}
