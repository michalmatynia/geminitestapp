import { defineConfig } from "@playwright/test";

const baseURL = process.env['PLAYWRIGHT_BASE_URL'] || "http://localhost:3000";
const useExistingServerOnly = process.env['PLAYWRIGHT_USE_EXISTING_SERVER'] === 'true';
const chromiumExecutablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(chromiumExecutablePath
      ? {
          launchOptions: {
            executablePath: chromiumExecutablePath,
          },
        }
      : {}),
  },
  ...(useExistingServerOnly
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
