/** Local operator tool. Default is READ-ONLY. Do not run while the API/seed/admin editor is writing. */
import { mongoUri } from '../config.mjs';
import mongoose from 'mongoose';
import { readFile, writeFile, mkdir, rename, readdir, open, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { buildNVXMigrationPlan } from './plan.mjs';
import { NVX_IDS, NVX_DEMO_RECIPES } from '../../../shared/nvx.mjs';

const appRoot = fileURLToPath(new URL('../../../', import.meta.url));
const argv = new Set(process.argv.slice(2));
const allowed = new Set(['--check', '--apply', '--confirm-demo-fitment', '--undo-latest']);
let lock, lockPath;
const serial = value => JSON.parse(JSON.stringify(value));
const stable = value => value && typeof value === 'object'
  ? Array.isArray(value) ? value.map(stable) : Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
const equal = (a, b) => JSON.stringify(stable(serial(a))) === JSON.stringify(stable(serial(b)));
async function saveJournal(file, value) {
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 });
  await rename(temp, file);
}
function fieldsMatch(document, fields) {
  return !!document && Object.entries(fields).every(([key, value]) =>
    value.exists ? Object.hasOwn(document, key) && equal(document[key], value.value) : !Object.hasOwn(document, key));
}
function fieldsUpdate(fields) {
  const $set = {}, $unset = {};
  for (const [key, spec] of Object.entries(fields)) {
    if (spec.exists) $set[key] = key === 'updatedAt' && spec.value ? new Date(spec.value) : spec.value;
    else $unset[key] = '';
  }
  return { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) };
}
function fieldsFilter(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, spec]) => [key, spec.exists
    ? key === 'updatedAt' && spec.value ? new Date(spec.value) : spec.value : { $exists: false }]));
}
async function latestJournal(folder) {
  const candidates = [];
  for (const entry of await readdir(folder, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory()) continue;
    const file = path.join(folder, entry.name, 'backup.json');
    try { const value = JSON.parse(await readFile(file, 'utf8')); if (value.tool === 'dth-nvx-step15-data' && value.status !== 'restored') candidates.push({ file, value }); } catch {}
  }
  candidates.sort((a, b) => b.value.createdAt.localeCompare(a.value.createdAt));
  if (!candidates.length) throw new Error('No active NVX data backup found. Nothing changed.');
  return candidates[0];
}
async function restore(db, file, journal, dbKey) {
  if (journal.databaseKey !== dbKey || journal.appRoot !== appRoot) throw new Error('Backup belongs to a different app/database. Nothing changed.');
  const steps = [];
  for (const operation of journal.operations) {
    if (!['store_products', 'store_vehicles'].includes(operation.collection)) throw new Error('Invalid backup collection.');
    const current = await db.collection(operation.collection).findOne({ id: operation.id });
    if (operation.kind === 'insert') {
      if (!current) continue;
      if (!equal(current, operation.after)) throw new Error(`Restore conflict: ${operation.id} changed after migration. Nothing restored.`);
      if (operation.collection === 'store_vehicles') {
        const reversibleProducts = journal.operations.filter(op => op.collection === 'store_products').map(op => op.id);
        const [user, order, customProduct] = await Promise.all([
          db.collection('store_users').findOne({ savedVehicleId: operation.id }, { projection: { _id: 1 } }),
          db.collection('store_orders').findOne({ 'lines.vehicleId': operation.id }, { projection: { _id: 1 } }),
          db.collection('store_products').findOne({ vehicleIds: operation.id, id: { $nin: reversibleProducts } }, { projection: { _id: 1 } }),
        ]);
        if (user || order || customProduct) throw new Error(`Restore stopped: ${operation.id} has been used by an account/order or a product outside this migration. Preserve that data and review manually.`);
      } else {
        if (await db.collection('store_orders').findOne({ 'lines.productId': operation.id }, { projection: { _id: 1 } }))
          throw new Error(`Restore stopped: new product ${operation.id} is referenced by an order.`);
      }
      steps.push({ operation, current });
    } else if (operation.kind === 'fitment') {
      if (fieldsMatch(current, operation.before)) continue;
      if (!fieldsMatch(current, operation.after)) throw new Error(`Restore conflict: ${operation.id} was edited. Nothing restored.`);
      steps.push({ operation, current });
    } else throw new Error('Invalid backup operation.');
  }
  // Preflight completed before any restore writes; conditional writes protect against concurrent edits.
  for (const { operation: op, current } of steps.reverse()) {
    const collection = db.collection(op.collection);
    if (op.kind === 'insert') {
      const result = await collection.deleteOne({ ...current });
      if (result.deletedCount !== 1) throw new Error(`Concurrent edit on ${op.id}; restore stopped.`);
    } else {
      const result = await collection.updateOne({ id: op.id, ...fieldsFilter(op.after) }, fieldsUpdate(op.before));
      if (result.matchedCount !== 1) throw new Error(`Concurrent edit on ${op.id}; restore stopped.`);
    }
  }
  journal.status = 'restored'; await saveJournal(file, journal);
  console.log(`DATA RESTORED: ${steps.length} operations. No user/order records were changed.`);
}
try {
  if ([...argv].some(arg => !allowed.has(arg))) throw new Error('Use --check, --apply --confirm-demo-fitment, or --undo-latest.');
  if (['--check', '--apply', '--undo-latest'].filter(flag => argv.has(flag)).length > 1) throw new Error('Choose exactly one operation.');
  if (argv.has('--apply') && !argv.has('--confirm-demo-fitment')) throw new Error('Apply requires --confirm-demo-fitment (synthetic data, not manufacturer compatibility).');
  if (process.env.NODE_ENV === 'production') throw new Error('This local demo migration refuses NODE_ENV=production.');
  const gitDir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: appRoot, encoding: 'utf8' }).trim();
  const folder = path.join(gitDir, 'dth-nvx-step15-data-backups');
  if (argv.has('--apply') || argv.has('--undo-latest')) {
    await mkdir(folder, { recursive: true }); lockPath = path.join(folder, 'migration.lock');
    lock = await open(lockPath, 'wx', 0o600); await lock.writeFile(String(process.pid));
  }
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000, autoCreate: false, autoIndex: false });
  const db = mongoose.connection.db;
  if (db.databaseName !== 'dth_3d_commerce' && !/^dth_.*_test$/.test(db.databaseName))
    throw new Error('Database name must be dth_3d_commerce or a dedicated dth_*_test database. No writes performed.');
  const dbKey = createHash('sha256').update(mongoUri).digest('hex'); // Never store/log URI credentials.
  if (argv.has('--undo-latest')) {
    const backup = await latestJournal(folder); await restore(db, backup.file, backup.value, dbKey);
  } else {
    const base = JSON.parse(await readFile(new URL('../../../shared/catalog.json', import.meta.url), 'utf8'));
    const productIds = NVX_DEMO_RECIPES.map(r => r.productId);
    const [products, vehicles] = await Promise.all([
      db.collection('store_products').find({ id: { $in: productIds } }).toArray(),
      db.collection('store_vehicles').find({ id: { $in: NVX_IDS } }).toArray(),
    ]);
    const plan = buildNVXMigrationPlan(base, products, vehicles);
    console.log(`DATABASE: ${db.databaseName}\nNVX VERSIONS: V1, V2, V3 (no year)`);
    console.log(`PLAN: ${plan.operations.filter(o => o.kind === 'insert').length} inserts; ${plan.operations.filter(o => o.kind === 'fitment').length} fitment updates.`);
    for (const note of plan.skipped) console.log(`PRESERVED: ${note}`);
    console.log(plan.note);
    if (plan.conflicts.length) throw new Error(plan.conflicts.join('\n'));
    if (!argv.has('--apply')) console.log('DATA CHECK OK. Read-only: no database or backup files changed.');
    else if (!plan.operations.length) console.log('ALREADY READY. Nothing to apply.');
    else {
      const when = new Date();
      const operations = plan.operations.map(op => op.kind === 'insert' ? {
        collection: op.collection, kind: op.kind, id: op.id,
        after: serial({ ...op.document, _id: new mongoose.Types.ObjectId(),
          ...(op.collection === 'store_products' ? { createdAt: when, updatedAt: when } : {}) }),
      } : { collection: op.collection, kind: op.kind, id: op.id,
        before: { vehicleIds: { exists: true, value: op.previousVehicleIds }, updatedAt: { exists: op.hadUpdatedAt, value: op.previousUpdatedAt } },
        after: { vehicleIds: { exists: true, value: op.nextVehicleIds }, updatedAt: { exists: true, value: when.toISOString() } },
      });
      const journal = { tool: 'dth-nvx-step15-data', version: 1, appRoot, databaseKey: dbKey,
        createdAt: when.toISOString(), status: 'applying', operations };
      const location = path.join(folder, `${when.toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`);
      await mkdir(location, { recursive: true }); const file = path.join(location, 'backup.json');
      await saveJournal(file, journal); console.log(`DATA BACKUP: ${file}`);
      await db.collection('store_vehicles').createIndex({ id: 1 }, { unique: true });
      await db.collection('store_products').createIndex({ id: 1 }, { unique: true });
      for (const op of operations) {
        const collection = db.collection(op.collection);
        if (op.kind === 'insert') {
          const document = { ...op.after, _id: new mongoose.Types.ObjectId(op.after._id) };
          for (const key of ['createdAt', 'updatedAt']) if (document[key]) document[key] = new Date(document[key]);
          await collection.insertOne(document);
        } else {
          const result = await collection.updateOne({ id: op.id, ...fieldsFilter(op.before) }, fieldsUpdate(op.after));
          if (result.matchedCount !== 1) throw new Error(`Concurrent edit: ${op.id}. Stopped; data backup is available. Do not force.`);
        }
      }
      journal.status = 'complete'; await saveJournal(file, journal);
      console.log(`DATA APPLIED: ${operations.length} operations. Restart API and frontend.\nUndo (only before using the new data): node backend/commerce/nvx/migrate.mjs --undo-latest`);
    }
  }
} catch (error) {
  console.error(`NVX DATA STOP: ${error.message}\nDo not reset/drop the database. An interrupted apply can be reviewed with --check or the guarded --undo-latest.`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  if (lock) { await lock.close(); await unlink(lockPath).catch(() => {}); }
}
