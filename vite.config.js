import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from .env file (server-side only — NOT exposed to browser)
  const env = loadEnv(mode, process.cwd(), '');

  const aviationstackApiKey = env.AVIATIONSTACK_API_KEY || '';
  const aviationstackBaseUrl = env.AVIATIONSTACK_BASE_URL || 'https://api.aviationstack.com/v1';

  return {
    plugins: [react()],
    server: {
      proxy: {
        // All requests to /api/aviationstack are forwarded to Aviationstack server-side.
        // The API key is appended here (server-side only, never sent to the browser).
        '/api/aviationstack': {
          target: aviationstackBaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/aviationstack/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // proxyReq.path has already been rewritten by rewrite()
              // Append access_key query param without overwriting the rewritten path
              const [pathname, search] = (proxyReq.path || '').split('?');
              const searchParams = new URLSearchParams(search || '');
              if (aviationstackApiKey) {
                searchParams.set('access_key', aviationstackApiKey);
              }
              proxyReq.path = `${pathname}?${searchParams.toString()}`;
            });
          },
        },
        // Backend API proxies (User Auth, Admin, and User services)
        '/auth': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/api/auth': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/api/admin': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/api/users': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
