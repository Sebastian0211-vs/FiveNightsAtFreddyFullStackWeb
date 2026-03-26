import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main:     resolve(__dirname, 'index.html'),
        menu:     resolve(__dirname, 'src/pages/Menu.html'),
        mainroom: resolve(__dirname, 'src/pages/MainRoom.html'),
        warning:  resolve(__dirname, 'src/pages/Warning.html'),
      }
    }
  }
})