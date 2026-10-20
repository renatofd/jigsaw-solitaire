import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build de arquivo único para publicar como página (Artifact).
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist-single' },
  plugins: [viteSingleFile()],
});
