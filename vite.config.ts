import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) {
            return 'phaser';
          }
          if (id.includes('node_modules/three')) {
            return 'three';
          }
        }
      }
    }
  }
});
