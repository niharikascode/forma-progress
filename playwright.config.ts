import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  globalSetup: "./tests/browser/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3011",
    headless: true,
    storageState: "test-results/.auth.json",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command:
      "npm run build && rm -f .data/browser-test.sqlite* && DATABASE_PATH=.data/browser-test.sqlite APP_PASSWORD=browser-test-legacy npx next start --port 3011",
    url: "http://localhost:3011",
    reuseExistingServer: false,
    timeout: 400000,
  },
});
