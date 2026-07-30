import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://iot-backend-alb-396746752.ap-southeast-1.elb.amazonaws.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
