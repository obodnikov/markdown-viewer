import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'tests/**',
        'node_modules/**',
        'venv/**',
        'backend/**',
        '**/*.config.js'
      ],
      include: ['scripts/**/*.js'],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    },
    setupFiles: ['./scripts/tests/setup.js'],
    include: ['scripts/tests/**/*.test.js'],
    testTimeout: 10000
  }
});
