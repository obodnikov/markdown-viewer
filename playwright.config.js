import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './scripts/tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: [
    {
      command: 'python3 serve-frontend.py --port 8000',
      port: 8000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: '. venv/bin/activate && cd backend && python app.py',
      // The backend refuses to start without a key; these tests make no real LLM calls
      env: { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || 'e2e-test-key', BACKEND_PORT: '5050' },
      port: 5050,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
