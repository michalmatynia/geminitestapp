import { defineConfig, type ReporterDescription } from '@playwright/test';

const baseURL = process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:3000';
const useExistingServerOnly = process.env['PLAYWRIGHT_USE_EXISTING_SERVER'] === 'true';
const chromiumExecutablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
const outputDir = process.env['PLAYWRIGHT_OUTPUT_DIR'] || 'test-results';
const htmlReportDir = process.env['PLAYWRIGHT_HTML_REPORT_DIR'];
const junitOutputFile = process.env['PLAYWRIGHT_JUNIT_OUTPUT_FILE'];
const nextDistDir = process.env['NEXT_DIST_DIR'];

const resolvedBaseUrl = (() => {
  try {
    return new URL(baseURL);
  } catch {
    return new URL('http://localhost:3000');
  }
})();

const reporters: ReporterDescription[] = [];
if (htmlReportDir || junitOutputFile) {
  reporters.push(['list']);
  if (htmlReportDir) {
    reporters.push([
      'html',
      {
        open: 'never',
        outputFolder: htmlReportDir,
      },
    ]);
  }
  if (junitOutputFile) {
    reporters.push([
      'junit',
      {
        outputFile: junitOutputFile,
      },
    ]);
  }
}

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  outputDir,
  ...(reporters.length > 0
    ? {
        reporter: reporters,
      }
    : {}),
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
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
          command: process.env['PLAYWRIGHT_WEB_SERVER_COMMAND'] || 'npm run dev',
          env: {
            ...process.env,
            HOST: process.env['HOST'] || resolvedBaseUrl.hostname,
            PORT:
              process.env['PORT'] ||
              resolvedBaseUrl.port ||
              (resolvedBaseUrl.protocol === 'https:' ? '443' : '80'),
            ...(nextDistDir
              ? {
                  NEXT_DIST_DIR: nextDistDir,
                }
              : {}),
          },
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
