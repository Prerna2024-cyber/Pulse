import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxies /api to the Express backend (server/index.js, port 3000) so the
// frontend can call same-origin paths in dev without touching CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
