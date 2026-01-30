import { test, expect, Dialog } from '@playwright/test';

test.describe('Products Management - Advanced', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/products');
    // Ensure "All catalogs" is selected to see all products
    const catalogSelect = page.getByLabel('Filter by catalog');
    await expect(catalogSelect).toBeVisible({ timeout: 15000 });
    await catalogSelect.click();
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });
    // Click somewhere to ensure dropdown is closed
    await page.mouse.click(0, 0);
  });

  async function createTestProduct(page: any, sku: string, name: string) {
    page.once('dialog', async (dialog: Dialog) => {
      await dialog.accept(sku);
    });
    
    await page.getByLabel('Create new product').click();
    await page.waitForTimeout(1000); // Wait for modal to fully settle
    
    const modal = page.locator('[role="dialog"]');
    
    // Select a catalog in 'Other' tab to enable name fields
    await modal.getByRole('tab', { name: 'Other' }).click();
    await page.waitForTimeout(1000);
    
    // Try to click catalog selector - it might already have a value or be "Select catalogs"
    const catalogTrigger = modal.locator('button:has-text("Select catalogs"), button:has-text("Default"), button:has-text("Main")').first();
    if (await catalogTrigger.isVisible()) {
        await catalogTrigger.click();
        await page.waitForTimeout(500);
        const catalogOptions = page.getByRole('menuitemcheckbox');
        if (await catalogOptions.count() > 0) {
            await catalogOptions.first().click();
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        }
    }

    // Go back to General to fill name
    await modal.getByRole('tab', { name: 'General' }).click();
    await page.waitForTimeout(500);

    // Fill name if visible
    const nameInput = modal.locator('input#name_en');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill(name);
    }
    
    await modal.getByRole('button', { name: 'Create', exact: true }).click({ force: true });
    await expect(page.getByText('Product created successfully.')).toBeVisible({ timeout: 15000 });
    // Dismiss toast
    await page.getByText('Product created successfully.').click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  test('should duplicate a product', async ({ page }) => {
    const originalSku = `ORIG${Date.now()}`;
    const duplicateSku = `DUP${Date.now()}`;
    const productName = `Product to Duplicate ${Date.now()}`;

    await createTestProduct(page, originalSku, productName);

    const skuSearchInput = page.getByPlaceholder('Search by SKU...');
    await skuSearchInput.fill(originalSku);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    const row = page.locator('tr').filter({ hasText: originalSku });
    await expect(row.first()).toBeVisible({ timeout: 15000 });
    await row.first().getByLabel('Open row actions').click();

    page.once('dialog', async (dialog: Dialog) => {
      await dialog.accept(duplicateSku);
    });

    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await expect(page).toHaveURL(/.*\/edit/, { timeout: 15000 });
    await expect(page.locator('input#sku')).toHaveValue(duplicateSku, { timeout: 10000 });
  });

  test('should delete a product', async ({ page }) => {
    const sku = `DEL${Date.now()}`;
    const productName = `Product to Delete ${Date.now()}`;

    await createTestProduct(page, sku, productName);

    const skuSearchInput = page.getByPlaceholder('Search by SKU...');
    await skuSearchInput.fill(sku);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    const row = page.locator('tr').filter({ hasText: sku });
    await expect(row.first()).toBeVisible({ timeout: 15000 });
    await row.first().getByLabel('Open row actions').click();

    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await page.getByRole('menuitem', { name: 'Remove' }).click();
    await expect(page.locator('tr').filter({ hasText: sku })).not.toBeVisible({ timeout: 15000 });
  });

  test('should edit a product and save changes', async ({ page }) => {
    const timestamp = Date.now();
    const sku = `EDIT${timestamp}`;
    const productName = `Original Name ${timestamp}`;
    const updatedName = `Updated Name ${timestamp}`;

    await createTestProduct(page, sku, productName);

    const skuSearchInput = page.getByPlaceholder('Search by SKU...');
    await skuSearchInput.fill(sku);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    const row = page.locator('tr').filter({ hasText: sku });
    await expect(row.first()).toBeVisible({ timeout: 15000 });
    await row.first().getByLabel('Open row actions').click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    await page.waitForTimeout(1000);
    const modal = page.locator('[role="dialog"]');
    const nameInput = modal.locator('input#name_en');
    if (await nameInput.isVisible({ timeout: 10000 }).catch(() => false)) {
        await nameInput.fill(updatedName);
    }
    
    const updatePromise = page.waitForResponse(response => response.url().includes('/api/products/') && response.request().method() === 'PUT');
    await modal.getByRole('button', { name: 'Update', exact: true }).click({ force: true });
    await updatePromise;
    
    await expect(page.getByText(/success|updated/i)).toBeVisible({ timeout: 15000 });
    await modal.getByRole('button', { name: 'Close' }).click({ force: true }).catch(() => {
        return page.getByLabel('Close').click({ force: true });
    });
    
    await skuSearchInput.fill('');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await skuSearchInput.fill(sku);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await expect(page.locator('tr').filter({ hasText: sku }).first()).toBeVisible({ timeout: 15000 });
  });

  test('should perform mass selection and show action bar', async ({ page }) => {
    const skuSearchInput = page.getByPlaceholder('Search by SKU...');
    await skuSearchInput.fill('');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    const rows = page.locator('tbody tr');
    if (await rows.count() < 2) {
      await createTestProduct(page, `MASS1${Date.now()}`, `Mass 1`);
      await createTestProduct(page, `MASS2${Date.now()}`, `Mass 2`);
      await page.reload();
      await page.waitForTimeout(2000);
    }

    const checkboxes = page.getByRole('checkbox', { name: /select row/i });
    await expect(checkboxes.first()).toBeVisible({ timeout: 15000 });
    
    await checkboxes.nth(0).click();
    await page.waitForTimeout(200);
    await checkboxes.nth(1).click();

    // Use a more relaxed match for Selection button since it has a badge
    await expect(page.getByRole('button', { name: /Selection/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Actions/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('should manage product parameters', async ({ page }) => {
    const sku = `PARAM${Date.now()}`;
    await createTestProduct(page, sku, `Param Test`);

    const skuSearchInput = page.getByPlaceholder('Search by SKU...');
    await skuSearchInput.fill(sku);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    const row = page.locator('tr').filter({ hasText: sku });
    await expect(row.first()).toBeVisible({ timeout: 15000 });
    await row.first().getByLabel('Open row actions').click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    await page.waitForTimeout(1000);
    const modal = page.locator('[role="dialog"]');
    await modal.getByRole('tab', { name: 'Parameters' }).click();
    
    await expect(page.getByText(/No parameters defined|Add Parameter/i).first()).toBeVisible({ timeout: 10000 });
  });
});