import { defineConfig } from 'vite';

export default defineConfig({
  base: '/numbercraft/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
