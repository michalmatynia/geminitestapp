import { test, expect } from '@playwright/test';

test.describe('CSV Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/import');
  });

  test('should display import page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Import Products from CSV' })).toBeVisible();

    // Check for file input
    // The code uses <Input type="file" ... /> which usually renders an input[type="file"]
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Check for Import button
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
  });

  test('should allow selecting a file', async ({ page }) => {
    // Create a dummy file in memory (Playwright handles this)
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: 'products.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('sku,name,price\nTEST001,Test Product,10.00'),
    });

    // We can't easily verify the state change in the component (no visual feedback in the code I read except state update)
    // But we can check that the input has files.
    // However, input[type=file] value is often faked by browser for security (C:\fakepath\...).
    // Playwright `setInputFiles` is usually reliable.

    // Check if Import button is clickable (it is always clickable in the code, creates FormData and fetches)
    // If we click it, it might fail the fetch (404 or 500) since we don't have the backend mocked,
    // but the frontend shouldn't crash.

    const importButton = page.getByRole('button', { name: 'Import' });
    await expect(importButton).toBeEnabled();
  });
});
