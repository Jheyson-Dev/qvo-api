import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: false,
  oxc: false,
  test: {
    globals: true,
    environment: 'node',
    root: './',
    include: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
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
