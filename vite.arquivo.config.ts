import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Build em um único arquivo HTML (código, estilos, fontes e dados embutidos),
 * para mandar por e-mail ou WhatsApp e abrir direto no navegador, sem servidor.
 * Uso: npm run build:arquivo  →  dist-arquivo/index.html
 */
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { outDir: 'dist-arquivo', copyPublicDir: false, assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 5000 },
});
