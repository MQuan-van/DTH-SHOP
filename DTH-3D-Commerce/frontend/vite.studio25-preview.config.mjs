import { mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import base from './vite.config.mjs';
export default mergeConfig(base, { build: {
  outDir: '../test-results/studio25-preview/build', copyPublicDir: false,
  rollupOptions: { input: fileURLToPath(new URL('./studio-spatial-preview.html', import.meta.url)) },
} });
