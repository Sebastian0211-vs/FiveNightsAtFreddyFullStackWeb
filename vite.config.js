import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Serve the project root so /Assets/... paths resolve correctly
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
  },
});
