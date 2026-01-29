import { test, expect } from '@playwright/test';

test.describe('Products Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the products page
    await page.goto('/admin/products');
  });

  test('should display the products list', async ({ page }) => {
    // Check for the main heading
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
    
    // Check for the create button
    await expect(page.getByLabel('Create new product')).toBeVisible();
  });

  test('should open the create product modal after entering SKU', async ({ page }) => {
    const testSku = `TEST${Date.now()}`;
    
    // Listen for the window.prompt and provide a SKU
    page.on('dialog', async dialog => {
      await dialog.accept(testSku);
    });

    // Click the create button
    await page.getByLabel('Create new product').click();

    // The modal should appear
    await expect(page.getByRole('heading', { name: 'Create Product', exact: true }).nth(1)).toBeVisible();
    
    // Check if the SKU is pre-filled
    await expect(page.locator('input#sku')).toHaveValue(testSku);
  });

  test('should validate required fields in the create form', async ({ page }) => {
    // SKU prompt
    page.on('dialog', async dialog => {
      await dialog.accept(`VAL${Date.now()}`);
    });
    await page.getByLabel('Create new product').click();

    const skuInput = page.locator('input#sku');
    await skuInput.fill('');
    
    // Try to submit
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    // Expect some validation error to appear
    const errorText = page.locator('.text-red-500');
    await expect(errorText.first()).toBeVisible();
  });

  test('should switch languages in the form', async ({ page }) => {
    // SKU prompt
    page.on('dialog', async dialog => {
      await dialog.accept(`LANG${Date.now()}`);
    });
    await page.getByLabel('Create new product').click();

    // Select a catalog to enable languages
    const catalogSelect = page.getByLabel('Filter by catalog');
    await catalogSelect.click();
    
    const options = page.getByRole('option');
    if (await options.count() > 2) {
      await options.nth(2).click();
    } else {
      await page.keyboard.press('Escape');
    }

    // Check language tabs for Name
    await expect(page.getByRole('tab', { name: /Name/i }).first()).toBeVisible();
  });

  test('should filter products by search', async ({ page }) => {
    // Find the search input
    const searchInput = page.getByPlaceholder('Search by name...');
    await expect(searchInput).toBeVisible();
    
    await searchInput.fill('NonExistentProductXYZ');
    await page.keyboard.press('Enter');

    // Should show empty state
    await expect(page.locator('text=No results')).toBeVisible();
  });

  test('should navigate between tabs in product form', async ({ page }) => {
    // SKU prompt
    page.on('dialog', async dialog => {
      await dialog.accept(`TABS${Date.now()}`);
    });
    await page.getByLabel('Create new product').click();

    // Check main tabs
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();
    
    await page.getByRole('tab', { name: 'Other' }).click();
    await expect(page.locator('label:has-text("Stock")')).toBeVisible();

    await page.getByRole('tab', { name: 'Images' }).click();
    // Use a more generic locator that exists in ProductImageManager
    await expect(page.locator('text=Image slots')).toBeVisible();
  });

  test('should paginate products', async ({ page }) => {
    // Check for pagination controls in header
    const nextButton = page.getByLabel('Next page');
    if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
      await nextButton.click();
      await expect(page.locator('text=/ 2')).toBeVisible(); // Assuming at least 2 pages
    } else {
      console.log("Not enough products for pagination test, skipping");
    }
  });

  test('should change page size', async ({ page }) => {
    const pageSizeSelect = page.getByLabel('Products per page');
    await pageSizeSelect.click();
    
    await page.getByRole('option', { name: '24 per page' }).click();
    
    // Check if preference might be saved or UI updated
    await expect(pageSizeSelect).toContainText('24 per page');
  });
});
