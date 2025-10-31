import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';

// Load manifest.json and let CRXJS drive entries/bundles
const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'manifest.json'), 'utf8'));

export default defineConfig({
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, 'src/lib')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.js')
  },
  plugins: [
    react(),
    crx({ manifest }),
    // CRXJS generates dist/manifest.json and bundles entries from manifest sources
  ]
});


