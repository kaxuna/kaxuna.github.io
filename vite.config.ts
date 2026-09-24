import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Two pages: the game at / and the original portfolio at /classic/.
// base './' keeps asset URLs relative so it works on any GitHub Pages path.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        classic: resolve(import.meta.dirname, 'classic/index.html'),
      },
    },
  },
});
