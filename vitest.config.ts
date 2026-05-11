import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // `virtual:pwa-register/react` is supplied by vite-plugin-pwa at build
      // time; in tests we substitute a tiny stub so App can render without
      // touching the service worker machinery.
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/stubs/pwa-register-react.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
});
