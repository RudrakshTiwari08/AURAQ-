import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    root: './frontend',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'frontend/index.html'),
          signup: path.resolve(__dirname, 'frontend/signup.html'),
          login: path.resolve(__dirname, 'frontend/login.html'),
          setup: path.resolve(__dirname, 'frontend/setup.html'),
          dashboard: path.resolve(__dirname, 'frontend/dashboard.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
