import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['test/**/*.test.js'],
    environment: 'node',
    setupFiles: ['test/setup.js'],
    globals: true,
  },
});
