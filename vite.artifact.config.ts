import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { buildInfo } from './build-info';

// Build de arquivo único para publicar como página (Artifact).
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist-single' },
  plugins: [viteSingleFile()],
  define: { __BUILD__: JSON.stringify(buildInfo()) },
});
