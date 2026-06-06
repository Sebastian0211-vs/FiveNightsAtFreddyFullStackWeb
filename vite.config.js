import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// MainRoom is the only remaining standalone HTML page; everything
// else is now a React SPA route. This middleware rewrites the
// /mainroom clean URL to its HTML file and serves index.html for
// the SPA routes in dev.
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
        const url = req.url.split('?')[0];
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
    rollupOptions: {
      input: {
        main:     resolve(__dirname, 'index.html'),
        mainroom: resolve(__dirname, 'src/pages/MainRoom.html'),
      }
    }
  }
})
