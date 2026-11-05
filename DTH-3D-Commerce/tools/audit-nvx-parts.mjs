/** Offline audit only. No service startup, database, network, asset writes or decoder installation. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditGLBFile } from './lib/glb-part-audit.mjs';
import { NVX_MODELS, NVX_STAGE } from '../frontend/src/shop/discovery174/nvx3d/nvx3d.config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const inside = filename => filename !== root && !path.relative(root, filename).startsWith('..') && !path.isAbsolute(path.relative(root, filename));
const slash = value => value.split(path.sep).join('/');
const options = process.argv.slice(2), extras = []; let output = null;
for (let i = 0; i < options.length; i++) {
  const key = options[i];
  if (key === '--help') {
    console.log('node tools/audit-nvx-parts.mjs [--asset "frontend/public/models/example.glb"] [--output "test-results/nvx-part-audit/report.json"]\nAudits local V2/V3 and the previously identified Ohlins TTX asset plus optional GLBs. Reads safe default publication pointers without starting the API. The optional JSON report is created exclusively, never overwritten. No GLB/database/network writes.');
    process.exit(0);
  }
  if (!['--asset', '--output'].includes(key) || !options[i + 1] || options[i + 1].startsWith('--')) throw Error(`Unknown or incomplete argument: ${key}`);
  const filename = path.resolve(root, options[++i]);
  if (!inside(filename)) throw Error('Use a repository-relative path inside this project.');
  if (key === '--asset') { if (!/\.glb$/i.test(filename)) throw Error('--asset requires a GLB path.'); extras.push(filename); }
  else {
    const reportRoot = path.resolve(root, 'test-results/nvx-part-audit');
    if (!filename.startsWith(reportRoot + path.sep) || path.extname(filename) !== '.json') throw Error('--output must be a new .json file below test-results/nvx-part-audit/.');
    output = filename;
  }
}
const targets = ['yamaha-nvx-v2', 'yamaha-nvx-v3'].map(id => ({ id, source: 'local NVX_MODELS configuration',
  path: `frontend/public/${NVX_MODELS[id].file}`, rotation: NVX_MODELS[id].rotation, normalization: 'vehicle-viewer' }));
targets.push({ id: 'ohlins-ttx-candidate', source: 'Previously identified local TTX file; identity/provenance is not certified by the filename.',
  path: 'frontend/public/models/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.glb', rotation: [0, 0, 0], normalization: 'vehicle-formula-for-comparison-only' });
const stateRelative = 'data/ai-assets/generated/.dth-ai-studio/state.json';
const publication = { source: stateRelative, status: 'not found', overridesVerified: false,
  note: 'Runtime publication overrides local NVX_MODELS. Environment-configured output folders and running API state are not read by this offline tool.' };
try {
  const filename = path.join(root, stateRelative), real = await fs.realpath(filename);
  if (!inside(real)) throw Error('Default publication state resolves outside the project; not read.');
  const stat = await fs.stat(real);
  if (stat.size > 8 * 1024 * 1024) throw Error('Default publication state exceeds the read budget.');
  const state = JSON.parse(await fs.readFile(filename, 'utf8'));
  publication.status = 'read safe pointer fields'; publication.pointers = [];
  for (const version of ['v1', 'v2', 'v3']) {
    const pointer = state.published?.[version]; if (!pointer) continue;
    const id = pointer.jobId, revision = pointer.revision;
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id) || typeof revision !== 'string' || !/^[a-f0-9-]{36}$/.test(revision)) throw Error('Invalid publication pointer identity.');
    const job = Array.isArray(state.jobs) ? state.jobs.find(j => j.id === id) : null;
    if (job?.localFilename !== `${id}.glb`) throw Error('Publication pointer has no matching local GLB job filename.');
    const relative = `data/ai-assets/generated/${id}.glb`;
    publication.pointers.push({ vehicleId: `yamaha-nvx-${version}`, revision, path: relative });
    targets.push({ id: `published-nvx-${version}`, source: 'Default local publication pointer; custom environment output folder unverified.', path: relative,
      rotation: NVX_MODELS[`yamaha-nvx-${version}`].rotation, normalization: 'vehicle-viewer', publicUrl: `api/shop/ai-assets/models/${version}.glb?rev=${revision}` });
  }
} catch (error) {
  if (error.code !== 'ENOENT') { publication.status = 'unreadable'; publication.message = error.message; }
}
extras.forEach((filename, i) => targets.push({ id: `additional-${i + 1}`, source: 'Explicit --asset argument', path: slash(path.relative(root, filename)), rotation: [0, 0, 0], normalization: 'vehicle-formula-for-comparison-only' }));
const report = { schemaVersion: 1, kind: 'NVX part architecture offline GLB evidence; no physical fitment or rendering certification',
  projectRelativeRoot: '.', configSource: 'frontend/src/shop/discovery174/nvx3d/nvx3d.config.mjs', normalizedVehicleSize: NVX_STAGE.normalizedSize, publication, assets: [] };
for (const target of targets) {
  const filename = path.resolve(root, target.path);
  let audit;
  try {
    const real = await fs.realpath(filename);
    if (!inside(real)) throw Error('Asset symlink resolves outside this project; not read.');
    audit = await auditGLBFile(real, { rotation: target.rotation, normalizedSize: NVX_STAGE.normalizedSize });
  } catch (error) {
    audit = error.code === 'ENOENT' ? await auditGLBFile(filename) : { status: 'error', code: 'path', message: error.message };
  }
  report.assets.push({ ...target, ...audit });
}
if (output) {
  let realDirectory = path.resolve(root);
  for (const piece of path.relative(root, path.dirname(output)).split(path.sep)) {
    const next = path.join(realDirectory, piece);
    try { await fs.mkdir(next); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    if ((await fs.lstat(next)).isSymbolicLink()) throw Error('Report folder cannot contain symlinks or junctions.');
    realDirectory = await fs.realpath(next);
    if (!inside(realDirectory)) throw Error('Report folder resolves outside the project.');
  }
  await fs.writeFile(path.join(realDirectory, path.basename(output)), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.error(`Created report: ${slash(path.relative(root, output))}`);
}
console.log(JSON.stringify(report, null, 2));
if (report.assets.some(asset => asset.status !== 'audited') || publication.status === 'unreadable') process.exitCode = 1;
