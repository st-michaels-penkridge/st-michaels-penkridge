import { defineConfig } from '@playwright/test';

const PORT = 4173;
const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: 0, // a flaky pass is not a pass
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome', // uses the installed Google Chrome, no extra download
  },
  projects: [
    { name: 'phone', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `node tests/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !CI,
  },
});
