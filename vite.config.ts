import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { seo } from './tools/seo/plugin';
import { SITE_URL } from './tools/seo/site';

export default defineConfig({
  // GitHub Pages serves from /<repo>/; set BASE_PATH in CI, root locally
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), seo({ siteUrl: SITE_URL })],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  worker: { format: 'es' },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tools/normalize/**/*.test.ts', 'tools/seo/**/*.test.ts'],
  },
});
