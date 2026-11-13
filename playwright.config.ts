import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: [['list'], ['json', { outputFile: 'reference/compare/playwright-results.json' }]],
  use: { browserName: 'chromium', viewport: { width: 1364, height: 762 }, baseURL: 'http://127.0.0.1:5173' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
