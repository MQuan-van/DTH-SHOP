/** Repeatable UI regression checks. No database integrations, migration, seed or API startup. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const suites = [
  'domain', 'security', 'standalone', 'account', 'account-one-22a', 'flow', 'login181',
  'cart-drawer', 'full-cart', 'cart-review', 'checkout', 'admin-calm19b', 'admin-kinetic19c',
  'admin-ops18', 'admin-pro18b', 'premium-admin-21-3a', 'support', 'atlas-catalog-sync',
  'spatial-commerce-23', 'studio-suspension-uploads-only', 'studio23-suspension-route',
  'studio-atelier-22h', 'studio-precision-22h2', 'story-reborn-22s', 'story-shell',
  'story-surface', 'story-atmosphere', 'hotspots-23-3', 'refinement-23-2', 'nvx-build-3d',
  'nvx-step15', 'garage16', 'shop17', 'shop-motion', 'shop-discovery', 'shop-fitment',
  'discovery174', 'product-decision', 'product-profile', 'product-study',
  'product-recommendations', 'presentation-21-2', 'story-shop-21-4', 'vertical-story-21-5',
  'gallery-demo24', 'studio-gallery24', 'rim-tire24', 'nvx-part-audit', 'nvx-mounting234',
].map(name => `tests/${name}.test.mjs`);

const steps = [
  [process.execPath, ['tools/check-project.mjs']],
  [process.execPath, ['--test', ...suites]],
  process.platform === 'win32'
    ? ['cmd.exe', ['/d', '/s', '/c', 'npm.cmd run build --workspace frontend']]
    : ['npm', ['run', 'build', '--workspace', 'frontend']],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) {
    console.error('Premium 24 verification stopped. Inspect the failed check above.');
    process.exit(result.status || 1);
  }
}
console.log('Premium 24: source regressions and production build passed. Browser, real API, GLB identity and FPS require separate evidence.');
