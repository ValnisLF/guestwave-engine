import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname),
      '@infra': resolve(__dirname, 'src/infrastructure'),
      '@features': resolve(__dirname, 'src/features'),
      'html-encoding-sniffer': resolve(__dirname, 'vitest-mocks/html-encoding-sniffer.ts'),
    },
  },
  test: {
    // Use node environment for pure logic tests; jsdom causes ESM/CJS conflicts with html-encoding-sniffer
    environment: 'node',
    globals: true,
    // Run tests in src/, tests/, and lib/ folders, not from node_modules dependencies
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
      'lib/**/*.{test,spec}.{ts,tsx}',
    ],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', '.next/'],
    },
  },

});