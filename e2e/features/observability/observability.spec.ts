import { test, expect } from '@playwright/test';

test.describe('Observability and Monitoring', () => {
  test.beforeEach(async ({}) => {
    // Restore ClientErrorReporter, if it was temporarily commented out
    // This is a safety measure to ensure the application behaves as expected outside of this specific test.
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
});