/**
 * DTH Cloud Product Sync — one-time, guarded PC-local catalog copy to Atlas.
 * Does not touch users, sessions, orders, support, GLBs, or AI Asset Studio output.
 * Requires npm dependencies from this repository (`npm ci`).
 * Usage: node tools/atlas-catalog-sync.mjs --backup|--plan|--apply|--verify
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DB_NAME = 'dth_3d_commerce';
export const COLLECTIONS = Object.freeze(['store_vehicles', 'store_products', 'store_experiences']);
export const MAX_DOCUMENTS_PER_COLLECTION = 20000;
export const MAX_BACKUP_BYTES_PER_COLLECTION = 64 * 1024 * 1024;
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ATLAS_CONFIG = path.join(ROOT, 'backend', '.env.atlas.local');
const BACKUP_ROOT = path.join(ROOT, 'backups');
const LOCAL_DEFAULT = `mongodb://127.0.0.1:27017/${DB_NAME}`;

export function validateLocalUri(uri) {
  let url;
  try { url = new URL(uri); } catch { throw new Error('Local MongoDB URI format invalid.'); }
  if (url.protocol !== 'mongodb:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Source must be a local MongoDB instance; refusing to copy from a remote database.');
  }
  if (url.pathname !== `/${DB_NAME}`) throw new Error(`Source MongoDB URI must select /${DB_NAME}.`);
  return uri;
}

export function validateAtlasUri(uri) {
  let url;
  try { url = new URL(uri); } catch { throw new Error('Atlas URI format invalid; retrieve it from Atlas Connect > Drivers.'); }
  if (url.protocol !== 'mongodb+srv:' || !url.hostname.endsWith('.mongodb.net') || !url.username || !url.password) {
    throw new Error('Target must be an Atlas SRV URI with a database user and password.');
  }
  if (url.pathname !== `/${DB_NAME}`) throw new Error(`Atlas URI must specify /${DB_NAME} after the hostname.`);
  if (uri.includes('<') || uri.includes('>')) throw new Error('Atlas URI still has an unreplaced placeholder.');
  return uri;
}

export function fingerprintDocuments(documents, EJSON) {
  // EJSON preserves BSON types (_id/ObjectId, dates, numbers) across a copy.
  const stable = value => {
    if (Array.isArray(value)) return value.map(stable);
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
    }
    return value;
  };
  const rows = documents.map(doc => stable(EJSON.serialize(doc, { relaxed: false })));
  rows.sort((a, b) => JSON.stringify(a?._id ?? '').localeCompare(JSON.stringify(b?._id ?? '')));
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

export function migrationPlan(sourceCounts, targetCounts) {
  const source = Object.fromEntries(COLLECTIONS.map(k => [k, Number(sourceCounts[k] || 0)]));
  const target = Object.fromEntries(COLLECTIONS.map(k => [k, Number(targetCounts[k] || 0)]));
  const destinationEmpty = COLLECTIONS.every(k => target[k] === 0);
  const hasProducts = source.store_products > 0;
  return { source, target, destinationEmpty, canApply: destinationEmpty && hasProducts };
}

function usage() {
  console.log(`DTH Atlas Product Sync (only ${COLLECTIONS.join(', ')})\n` +
    '  --backup   Back up local catalog to backups/ as Extended JSON; no Atlas needed\n' +
    '  --plan     Inspect collection counts on PC local + Atlas without writing\n' +
    '  --apply    Back up source and copy once ONLY to an empty Atlas catalog\n' +
    '  --verify   Compare local vs Atlas collection counts and document hashes\n\n' +
    'Credentials go in backend/.env.atlas.local (MONGO_ATLAS_URI=...), NEVER in command arguments or Git.');
}

function displayCounts(title, counts) {
  console.log(title);
  for (const name of COLLECTIONS) console.log(`  ${name}: ${counts[name] || 0}`);
}

async function readCollections(db) {
  const result = {};
  for (const name of COLLECTIONS) {
    const rows = await db.collection(name).find({}).limit(MAX_DOCUMENTS_PER_COLLECTION + 1).toArray();
    if (rows.length > MAX_DOCUMENTS_PER_COLLECTION) throw new Error(`Collection ${name} exceeds the safe migration document cap.`);
    result[name] = rows;
  }
  return result;
}

function countRows(rows) { return Object.fromEntries(COLLECTIONS.map(k => [k, rows[k].length])); }

async function makeBackup(rows, EJSON) {
  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const folder = path.join(BACKUP_ROOT, `atlas-catalog-${id}`);
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const manifest = { db: DB_NAME, createdAt: new Date().toISOString(), collections: {} };
  for (const name of COLLECTIONS) {
    const serialized = JSON.stringify(EJSON.serialize(rows[name], { relaxed: false }), null, 2);
    const length = Buffer.byteLength(serialized);
    if (length > MAX_BACKUP_BYTES_PER_COLLECTION) throw new Error(`Backup for ${name} is too large; no cloud writes were made.`);
    await writeFile(path.join(folder, `${name}.ejson`), serialized, { flag: 'wx', mode: 0o600 });
    manifest.collections[name] = { count: rows[name].length, bytes: length,
      sha256: createHash('sha256').update(serialized).digest('hex') };
  }
  await writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(`Local backup saved at: ${folder}`);
  return folder;
}

export async function run(argv = process.argv.slice(2)) {
  if (argv.length !== 1 || !['--backup', '--plan', '--apply', '--verify', '--help'].includes(argv[0])) {
    usage(); process.exitCode = 2; return;
  }
  if (argv[0] === '--help') { usage(); return; }
  const { default: dotenv } = await import('dotenv');
  const config = dotenv.config({ path: ATLAS_CONFIG, override: false, quiet: true });
  const source = validateLocalUri(process.env.MONGO_LOCAL_URI || LOCAL_DEFAULT);
  if (argv[0] !== '--backup') {
    if (config.error && !process.env.MONGO_ATLAS_URI) throw new Error('Create backend/.env.atlas.local; no connection string found.');
    validateAtlasUri(process.env.MONGO_ATLAS_URI || '');
  }
  const { default: mongoose } = await import('mongoose');
  const { MongoClient, BSON } = mongoose.mongo;
  if (!BSON?.EJSON) throw new Error('MongoDB BSON EJSON is unavailable; check npm ci and installed mongoose version.');
  const EJSON = BSON.EJSON;
  let pc, atlas;
  try {
    pc = new MongoClient(source, { serverSelectionTimeoutMS: 8000 });
    await pc.connect();
    const localDb = pc.db(DB_NAME);
    const localRows = await readCollections(localDb);
    const localCounts = countRows(localRows);
    displayCounts('PC LOCAL:', localCounts);
    if (argv[0] === '--backup') { await makeBackup(localRows, EJSON); return; }
    atlas = new MongoClient(process.env.MONGO_ATLAS_URI, { serverSelectionTimeoutMS: 12000 });
    await atlas.connect();
    const cloudDb = atlas.db(DB_NAME);
    const cloudRows = await readCollections(cloudDb);
    const cloudCounts = countRows(cloudRows);
    displayCounts('ATLAS:', cloudCounts);
    const plan = migrationPlan(localCounts, cloudCounts);
    if (argv[0] === '--plan') {
      console.log(plan.canApply ? 'PLAN OK: Catalog source has products; target catalog collections are empty.'
        : 'PLAN BLOCKED: Source products are empty or Atlas already has catalog documents. No changes made.');
      return;
    }
    if (argv[0] === '--apply') {
      if (!plan.canApply) throw new Error('COPY BLOCKED: Atlas catalog must be empty and PC must contain products. No Atlas changes made.');
      await makeBackup(localRows, EJSON);
      for (const name of COLLECTIONS) {
        if (!localRows[name].length) continue;
        // No replace, delete, drop, upsert or conflicting key overwrite.
        await cloudDb.collection(name).insertMany(localRows[name], { ordered: true });
        console.log(`Copied ${name}: ${localRows[name].length} documents`);
      }
      console.log('COPY COMPLETE. Run --verify before changing either backend/.env.');
    }
    if (argv[0] === '--verify' || argv[0] === '--apply') {
      let passed = true;
      for (const name of COLLECTIONS) {
        const dest = await cloudDb.collection(name).find({}).toArray();
        const match = localRows[name].length === dest.length &&
          fingerprintDocuments(localRows[name], EJSON) === fingerprintDocuments(dest, EJSON);
        console.log(`${name}: ${match ? 'VERIFY OK' : 'MISMATCH'} (${localRows[name].length} docs)`);
        if (!match) passed = false;
      }
      if (!passed) throw new Error('VERIFY FAILED: Compare local backup and Atlas before switching backend.');
      console.log('VERIFY OK: Selected catalog collections match in content and count.');
    }
  } finally {
    if (atlas) await atlas.close().catch(() => {});
    if (pc) await pc.close().catch(() => {});
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch(err => {
    // Never print a URI, password, connection string, or full MongoDB driver error message.
    console.error(`Cloud catalog sync stopped (${err.name || 'Error'}).`);
    console.error('Check: local MongoDB service, Atlas Database Access, Network Access and backup/empty-target requirements.');
    if (/BLOCKED|Source|MongoDB URI|Atlas URI|placeholder|unavailable|Create backend|safe migration/i.test(err.message)) {
      console.error(err.message);
    }
    process.exitCode = 1;
  });
}