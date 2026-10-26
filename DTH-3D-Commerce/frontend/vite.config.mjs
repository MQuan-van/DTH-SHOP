// DTH21.1 ignore generated GLB/preview directories in the dev watcher only.
import { ignoreGeneratedAssets21 } from './devWatch21.mjs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
// The shared directory is inside this independent repository, outside frontend.
const proxy = { '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true } };
export default defineConfig({
  plugins: [ignoreGeneratedAssets21(), react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy, fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, proxy },
  build: { chunkSizeWarningLimit: 950 },
});
