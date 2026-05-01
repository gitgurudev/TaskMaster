import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import os from 'os';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir: path.join(os.tmpdir(), 'vite-taskmaster'),
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
