import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

function htmlRewrites() {
  const map = {
    '/mainroom': '/src/pages/MainRoom.html',
  };
  return {
    name: 'html-rewrites',
    configureServer(server) {
      const spaRoutes = [
        '/login', '/register', '/reset-password', '/play', '/test',
        '/menu', '/warning', '/leaderboard', '/unauthorized', '/customnight',
      ];
      server.middlewares.use((req, _res, next) => {
        const url = req.url.split('?')[0]; // strip query string
        if (map[url]) {
          req.url = map[url];
        } else if (spaRoutes.includes(url)) {
          req.url = '/index.html';
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), htmlRewrites()],
  build: {
    // Keep hashed bundle output under /bundle so it doesn't collide with the
    // raw game asset folder served at /assets in production (see DEPLOYMENT.md).
    assetsDir: 'bundle',
    rollupOptions: {
      input: {
        main:     resolve(__dirname, 'index.html'),
        mainroom: resolve(__dirname, 'src/pages/MainRoom.html'),
      }
    }
  }
})