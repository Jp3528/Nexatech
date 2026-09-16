import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  publicDir: 'publico',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 3023, strictPort: true },
  build: { outDir: 'dist' },
});
