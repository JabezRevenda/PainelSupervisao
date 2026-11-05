import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: o build funciona servido de qualquer subcaminho do CRM.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
