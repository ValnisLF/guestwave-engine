import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'html-encoding-sniffer': resolve(__dirname, './vitest-mocks/html-encoding-sniffer.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', '.next/'],
    },
    deps: {
      inline: ['@testing-library/react','html-encoding-sniffer','@exodus/bytes'],
    },
    threads: false,
  },
});