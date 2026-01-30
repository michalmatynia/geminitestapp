import { test, expect } from '@playwright/test';

test.describe('Observability and Monitoring', () => {
  test('should display system logs and allow refreshing', async ({ page }) => {
    await page.goto('/admin/system/logs');
    
    await expect(page.getByRole('heading', { name: /System Logs/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();
    
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
    // Disable sendBeacon to force fetch fallback
    await page.addInitScript(() => {
      // @ts-ignore
      delete window.navigator.sendBeacon;
    });

    await page.goto('/admin');
    await page.waitForTimeout(1000); // Give it a bit of time to settle
    
    // Set up a listener for the reporting API call
    const reportPromise = page.waitForRequest(request => 
      request.url().includes('/api/client-errors') && request.method() === 'POST'
    );

    // Trigger a console error / exception
    await page.evaluate(() => {
      const error = new Error('E2E Test Client Error');
      // Manually trigger the error event
      window.dispatchEvent(new ErrorEvent('error', { 
          error, 
          message: error.message,
          filename: 'test.js',
          lineno: 10
      }));
    });

    const request = await reportPromise;
    const rawData = request.postData();
    console.log('Raw post data:', rawData);
    
    expect(rawData).not.toBeNull();
    const postData = JSON.parse(rawData || '{}');
    
    expect(postData.message).toBe('E2E Test Client Error');
    expect(postData.url).toContain('/admin');
  });
});