import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Serves the root-level /assets/ folder so /assets/... paths work in both
// old vanilla pages (src/pages/*.html) and the new React components.
function serveRootAssets() {
  return {
    name: 'serve-root-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url.split('?')[0];
        if (url.startsWith('/assets/')) {
          const filePath = path.join(process.cwd(), url);
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
              '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
              '.gif': 'image/gif', '.svg': 'image/svg+xml',
              '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
              '.mp4': 'video/mp4', '.webm': 'video/webm',
              '.json': 'application/json',
              '.otf': 'font/otf', '.ttf': 'font/ttf',
              '.woff': 'font/woff', '.woff2': 'font/woff2',
            };
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveRootAssets()],
  root: '.',
  publicDir: 'public',
  server: { port: 5173 },
  build: {
    outDir: 'dist',
  },
});
