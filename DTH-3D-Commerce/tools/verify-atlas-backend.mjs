/** Read-only check that the running DTH backend config uses Atlas. Never prints secrets. */
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DB_NAME, validateAtlasUri } from './atlas-catalog-sync.mjs';

async function main() {
  const [{ mongoUri }, { default: mongoose }] = await Promise.all([
    import('../backend/commerce/config.mjs'), import('mongoose'),
  ]);
  validateAtlasUri(mongoUri);
  const client = new mongoose.mongo.MongoClient(mongoUri, { serverSelectionTimeoutMS: 12000 });
  try {
    await client.connect();
    const database = client.db(DB_NAME);
    await database.command({ ping: 1 });
    const products = await database.collection('store_products').countDocuments({});
    const vehicles = await database.collection('store_vehicles').countDocuments({});
    const experience = await database.collection('store_experiences').countDocuments({});
    const ohlins = await database.collection('store_products').findOne({ id: 'ohlins' });
    console.log('CONFIG OK: backend/.env is using Atlas (not local MongoDB).');
    console.log(`Database ${DB_NAME}: ${products} products, ${vehicles} vehicles, ${experience} Studio experience records.`);
    if (!ohlins) {
      console.log('Ohlins TTX: no product record with id=ohlins. Verify the ID in Admin on PC.');
      return;
    }
    console.log(`Ohlins TTX: FOUND (active=${ohlins.active !== false})`);
    if (/^\/models\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.glb$/.test(ohlins.modelUrl || '')) {
      const filename = path.join(fileURLToPath(new URL('../frontend/public/', import.meta.url)), ohlins.modelUrl);
      try {
        const asset = await stat(filename);
        console.log(`GLB on this computer: ${asset.isFile() ? 'FOUND' : 'NOT A FILE'} (${asset.size} bytes).`);
      } catch { console.log('GLB on this computer: NOT FOUND. Pull code and git lfs pull for assets.'); }
    } else console.log('Ohlins modelUrl missing or not an expected local GLB path.');
  } finally { await client.close().catch(() => {}); }
}

main().catch(error => {
  // Error details might contain a URI; never include them in output.
  console.error(`Atlas verification stopped (${error.name || 'Error'}). Check .env, Atlas Database Access and Network Access.`);
  process.exitCode = 1;
});