import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Rewrites clean URLs to their actual HTML file paths in dev mode
function htmlRewrites() {
  const map = {
    '/menu':        '/src/pages/Menu.html',
    '/mainroom':    '/src/pages/MainRoom.html',
    '/warning':     '/src/pages/Warning.html',
    '/leaderboard': '/src/pages/Leaderboard.html',
  };
  return {
    name: 'html-rewrites',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (map[req.url]) req.url = map[req.url];
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
        main:        resolve(__dirname, 'index.html'),
        menu:        resolve(__dirname, 'src/pages/Menu.html'),
        mainroom:    resolve(__dirname, 'src/pages/MainRoom.html'),
        warning:     resolve(__dirname, 'src/pages/Warning.html'),
        leaderboard: resolve(__dirname, 'src/pages/Leaderboard.html'),
      }
    }
  }
})