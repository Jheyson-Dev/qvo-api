import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: false,
  oxc: false,
  resolve: {
    alias: {
      '#': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    root: './',
    include: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
