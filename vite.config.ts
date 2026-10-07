import { defineConfig } from 'vite';

export default defineConfig({
  base: '/qing-tuan/',
  build: {
    target: 'es2022',
    cssMinify: false,
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2500,
  },
});
