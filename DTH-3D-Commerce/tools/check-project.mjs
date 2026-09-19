import { readFile, access, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const problems = [];
const required = [
  'package.json', 'frontend/package.json', 'backend/package.json',
  'frontend/index.html', 'frontend/src/main.jsx', 'frontend/src/App.jsx',
  'frontend/vite.config.mjs', 'backend/server.mjs', 'backend/commerce/config.mjs',
  'frontend/.env.example', 'backend/.env.example', 'shared/catalog.json', 'shared/domain.mjs'
];
for (const file of required) {
  try { await access(path.join(root, file)); }
  catch { problems.push(`Missing ${file}`); }
}
const [major, minor] = process.versions.node.split('.').map(Number);
if (!((major === 22 && minor >= 12) || major === 24)) problems.push('Use Node.js 22.12+ (22.x) or Node.js 24.x LTS.');

const packageData = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (packageData.name !== 'dth-3d-commerce') problems.push('Unexpected root package; open the standalone project folder.');
for (const script of ['dev', 'dev:api', 'seed', 'build', 'test']) {
  if (!packageData.scripts[script]) problems.push(`Missing root script: ${script}`);
}
async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await walk(full));
    else found.push(full);
  }
  return found;
}
for (const folder of ['frontend/src', 'backend', 'shared']) {
  const files = await walk(path.join(root, folder));
  for (const file of files.filter(p => /\.(jsx?|mjs)$/.test(p))) {
    const text = await readFile(file, 'utf8');
    const refs = [...text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g)].map(m => m[1]);
    for (const spec of refs.filter(s => s.startsWith('.'))) {
      const target = path.resolve(path.dirname(file), spec);
      const candidates = [target, target + '.js', target + '.jsx', target + '.mjs', path.join(target, 'index.js')];
      let exists = false;
      for (const candidate of candidates) { try { await access(candidate); exists = true; break; } catch {} }
      if (!exists) problems.push(`${path.relative(root, file)} cannot resolve ${spec}`);
    }
  }
}
if (problems.length) {
  console.error('Project check failed:\n' + problems.map(p => '- ' + p).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Project structure and local imports: OK');
  console.log('This check does NOT install dependencies, compile React, connect MongoDB or test a browser.');
  console.log('Next: npm install, npm test, npm run build, npm run dev');
}
