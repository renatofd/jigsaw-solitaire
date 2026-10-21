import { defineConfig } from 'vite';
import { buildInfo } from './build-info';

export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  define: { __BUILD__: JSON.stringify(buildInfo()) },
});
