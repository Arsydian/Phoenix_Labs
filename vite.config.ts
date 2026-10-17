import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite Configuration for Phoenix Labs Academy
 * Bundles the client SPA into dist/ for Cloudflare Workers Static Assets
 * Proxies API calls locally to Wrangler's workerd dev server on port 8787
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    }
  }
});
