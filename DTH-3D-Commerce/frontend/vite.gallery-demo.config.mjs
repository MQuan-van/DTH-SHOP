import { mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import base from './vite.config.mjs';

// Separate preview artifact. The main app's entry, routes and build stay intact.
export default mergeConfig(base, {
  build: {
    outDir: '../test-results/gallery-demo/build',
    copyPublicDir: false,
    rollupOptions: { input: fileURLToPath(new URL('./studio-gallery-demo.html', import.meta.url)) },
  },
});
