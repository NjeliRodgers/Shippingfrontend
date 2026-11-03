import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // In development, /api calls are proxied to the backend so no CORS setup is needed.
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:5000';
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: { '/api': { target: proxyTarget, changeOrigin: true, xfwd: true } },
    },
    preview: {
      port: 5173,
      proxy: { '/api': { target: proxyTarget, changeOrigin: true, xfwd: true } },
    },
  };
});
