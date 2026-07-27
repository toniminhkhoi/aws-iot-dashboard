import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://18.141.166.190:8000', // <-- Trỏ về Backend Local
        changeOrigin: true,
        secure: false,
      },
    },
  },
});