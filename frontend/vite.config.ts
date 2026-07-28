import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://47.129.13.52:8000', // <-- Trỏ về Backend Local
        changeOrigin: true,
        secure: false,
      },
    },
  },
});