import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const json = async file => JSON.parse(await read(file));

test('private root workspace contains frontend and backend', async () => {
  const p = await json('package.json');
  assert.equal(p.name, 'dth-3d-commerce');
  assert.equal(p.private, true);
  assert.deepEqual(p.workspaces, ['frontend', 'backend']);
  for (const script of ['dev', 'dev:api', 'build', 'preview', 'seed', 'test', 'check']) assert.ok(p.scripts[script]);
});
test('frontend has its own manifest, HTML entry and React mount', async () => {
  assert.equal((await json('frontend/package.json')).scripts.dev, 'vite');
  assert.match(await read('frontend/index.html'), /src="\/src\/main\.jsx"/);
  assert.match(await read('frontend/src/main.jsx'), /BrowserRouter/);
});
test('frontend dependency set includes its imported runtime libraries', async () => {
  const p = await json('frontend/package.json');
  for (const name of ['react', 'react-dom', 'react-router-dom', 'three', '@react-three/fiber', '@react-three/drei']) assert.ok(p.dependencies[name]);
});
test('standalone router and navigation no longer require legacy pages', async () => {
  const app = await read('frontend/src/App.jsx');
  const store = await read('frontend/src/shop/StoreApp.jsx');
  assert.doesNotMatch(app, /\.\/pages\/|legacyRoutes/);
  assert.doesNotMatch(store, /to="\/(?:Home|story|welcome|gallery)/);
});
test('backend no longer imports or mounts the legacy router', async () => {
  for (const file of ['backend/server.mjs', 'backend/commerce/app.mjs']) {
    assert.doesNotMatch(await read(file), /legacyRoutes|routes\/api\.js/);
  }
  assert.equal((await json('backend/package.json')).scripts.start, 'node server.mjs');
});
test('backend database default and env example are independent of old database', async () => {
  assert.match(await read('backend/.env.example'), /27017\/dth_3d_commerce/);
  assert.match(await read('backend/commerce/config.mjs'), /27017\/dth_3d_commerce/);
  assert.doesNotMatch(await read('backend/commerce/seed.mjs'), /dth_scooter_team/);
});
test('cookie and browser storage do not reuse previous bundle keys', async () => {
  const security = await read('backend/commerce/security.mjs');
  assert.match(security, /dth_commerce_session/);
  assert.doesNotMatch(security, /dth_session=/);
  const store = await read('frontend/src/shop/useStore.jsx');
  assert.match(store, /dth\.commerce\.bag\.v1/);
  assert.doesNotMatch(store, /dth\.demo\.bag/);
});
test('gitignore excludes secrets and installed/build artifacts but preserves env examples', async () => {
  const text = await read('.gitignore');
  for (const line of ['node_modules/', 'frontend/dist/', '**/.env', '!**/.env.example']) assert.ok(text.includes(line));
});
test('legacy installer is not required by the independent package', async () => {
  await assert.rejects(access(new URL('apply.mjs', root)));
  await assert.rejects(access(new URL('overlay/', root)));
});
test('all local source imports and baseline files resolve', () => {
  const result = spawnSync(process.execPath, ['tools/check-project.mjs'], { cwd: fileURLToPath(root), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /local imports: OK/);
});
