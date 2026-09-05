import { defineConfig } from 'vite';

// base './' makes the build work both on user pages (kaxuna.github.io) and repo pages (/repo/).
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
});
