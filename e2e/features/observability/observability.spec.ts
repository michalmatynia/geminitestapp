import { test, expect } from '@playwright/test';

const E2E_ADMIN_EMAIL = process.env['PLAYWRIGHT_E2E_ADMIN_EMAIL'] ?? 'e2e.admin@example.com';
const E2E_ADMIN_PASSWORD = process.env['PLAYWRIGHT_E2E_ADMIN_PASSWORD'] ?? 'E2eAdmin!123';

const ensureSignedInForAdmin = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.waitForLoadState('domcontentloaded');
  const systemLogsHeading = page.getByRole('heading', { name: /System Logs/i });
  const signInHeading = page.getByRole('heading', { name: /Sign in/i });

  const hasSystemLogsHeading = await systemLogsHeading.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasSystemLogsHeading) return;

  await Promise.race([
    signInHeading.waitFor({ state: 'visible', timeout: 15000 }),
    systemLogsHeading.waitFor({ state: 'visible', timeout: 15000 }),
  ]).catch(() => {});

  const hasSystemLogsAfterWait = await systemLogsHeading.isVisible({ timeout: 1000 }).catch(() => false);
  if (hasSystemLogsAfterWait) return;

  await expect(signInHeading).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();

  await page.getByLabel('Email').fill(E2E_ADMIN_EMAIL);
  await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/admin'), { timeout: 20000 });
  await page.goto('/admin/system/logs');
  await expect(systemLogsHeading).toBeVisible({ timeout: 10000 });
};

test.describe('Observability and Monitoring', () => {
  test.beforeEach(async () => {
    // Restore ClientErrorReporter, if it was temporarily commented out    // This is a safety measure to ensure the application behaves as expected outside of this specific test.
    // In a real scenario, this would be part of a setup/teardown.
    // Given the previous steps, ClientErrorReporter is currently enabled.
  });

  test('should display system logs and allow refreshing', async ({ page }) => {
    await page.goto('/admin/system/logs');
    
    await expect(page.getByRole('heading', { name: /System Logs/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh', exact: true }).first()).toBeVisible();
    
    // Check if metrics cards appear
    await expect(page.getByText('Totals')).toBeVisible();
    await expect(page.getByText('By level')).toBeVisible();
  });

  test('should filter logs by level', async ({ page }) => {
    await page.goto('/admin/system/logs');
    
    // In real UI it's a Radix Select
    const levelTrigger = page.getByRole('combobox').first();
    await levelTrigger.click();
    await page.getByRole('option', { name: 'Errors' }).click();
    
    // Check if UI reflects change
    await expect(page.getByText(/Showing/i)).toBeVisible();
  });

  test('should capture and report client-side errors', async ({ page }) => {
    let capturedPayload: any = null;

    // Route the client-errors API call to capture its payload
    await page.route('**/api/client-errors', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        capturedPayload = request.postDataJSON();
        // Respond to prevent the actual API call from going through
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
        await page.evaluate(() => { (window as any).__e2e_error_captured__ = true; });
      } else {
        await route.continue();
      }
    });

    await page.goto('/admin');
    await page.waitForLoadState('networkidle'); // Ensure all scripts are loaded
    await page.waitForTimeout(1000); // Give it a bit of time to settle

    // Explicitly call logClientError from within the page context
    await page.evaluate(() => {
      // @ts-expect-error window._logClientError is injected by the application
      window._logClientError(new Error('E2E Test Client Error - direct call'), { context: { source: 'playwright-e2e' } });
    });

    // Wait for the route handler to capture the payload
    // @ts-expect-error - testing direct global check
    await page.waitForFunction(() => window.__e2e_error_captured__, { timeout: 5000 }).catch(() => {});
    
    // Assert against the captured payload
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.message).toBe('E2E Test Client Error - direct call');
    expect(capturedPayload.url).toContain('/admin');
    expect(capturedPayload.context.source).toBe('playwright-e2e');
  });

  test('should clear logs after confirmation', async ({ page }) => {
    let deleteCalls = 0;
    let cleared = false;

    await page.route(/\/api\/system\/logs\/metrics(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: {
            total: 1,
            levels: { info: 1, warn: 0, error: 0 },
            last24Hours: 1,
            last7Days: 1,
            topSources: [{ source: 'e2e', count: 1 }],
            topPaths: [{ path: '/admin/system/logs', count: 1 }],
            generatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route(/\/api\/system\/logs\/insights(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ insights: [] }),
      });
    });

    await page.route(/\/api\/system\/diagnostics\/mongo-indexes(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ collections: [], generatedAt: new Date().toISOString() }),
      });
    });

    await page.route(/\/api\/system\/logs(\?.*)?$/, async (route) => {
      const request = route.request();
      if (request.method() === 'DELETE') {
        deleteCalls += 1;
        cleared = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ deleted: 1 }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          cleared
            ? { logs: [], total: 0, page: 1, pageSize: 50 }
            : {
              logs: [
                {
                  id: 'log-e2e-1',
                  level: 'info',
                  message: 'E2E log entry',
                  source: 'e2e',
                  context: null,
                  stack: null,
                  path: '/admin/system/logs',
                  method: 'GET',
                  statusCode: 200,
                  requestId: 'req-e2e-1',
                  userId: null,
                  createdAt: new Date().toISOString(),
                },
              ],
              total: 1,
              page: 1,
              pageSize: 50,
            }
        ),
      });
    });

    await page.goto('/admin/system/logs');
    await ensureSignedInForAdmin(page);
    await expect(page.getByRole('heading', { name: /System Logs/i })).toBeVisible();

    const clearButton = page.getByRole('button', { name: 'Clear Logs', exact: true });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Clear All', exact: true }).click();

    await expect.poll(() => deleteCalls).toBe(1);
    await expect(page.getByText('System logs cleared (1).')).toBeVisible();
    await expect(page.getByText('No system logs found.')).toBeVisible();
  });
});
