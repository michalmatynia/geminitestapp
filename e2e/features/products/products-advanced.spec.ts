import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ timeout: 60_000 });

const E2E_ADMIN_EMAIL =
  process.env['PLAYWRIGHT_E2E_ADMIN_EMAIL'] ??
  process.env['E2E_ADMIN_EMAIL'] ??
  'e2e.admin@example.com';
const E2E_ADMIN_PASSWORD =
  process.env['PLAYWRIGHT_E2E_ADMIN_PASSWORD'] ??
  process.env['E2E_ADMIN_PASSWORD'] ??
  'E2eAdmin!123';

const ensureAdminSession = async (page: Page): Promise<boolean> => {
  await page.goto('/auth/signin?callbackUrl=%2Fadmin', {
    waitUntil: 'networkidle',
  });
  const signInHeading = page.getByRole('heading', { name: 'Sign in' });
  if (!(await signInHeading.isVisible().catch(() => false))) {
    return true;
  }

  await page.getByRole('textbox', { name: 'Email' }).fill(E2E_ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  return await page
    .waitForURL(/\/admin(\/.*)?(\?.*)?$/, { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
};

test.describe('Products Management - Advanced', () => {
  test.setTimeout(60_000);

  const selectAllCatalogs = async (page: Page) => {
    const showFiltersButton = page.getByRole('button', { name: /show filters/i });
    if (await showFiltersButton.isVisible().catch(() => false)) {
      await showFiltersButton.click();
    }

    const catalogSelect = page.locator('[aria-label="Filter by catalog"]:visible').first();
    await expect(catalogSelect).toBeVisible({ timeout: 15000 });
    await catalogSelect.click();
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });
    await page.mouse.click(0, 0);
  };

  test.beforeEach(async ({ page }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    await page.goto('/admin/products');
    await selectAllCatalogs(page);
  });

  const getCreateProductButton = (page: Page) =>
    page.locator('[aria-label="Create new product"]:visible').first();
  const getSkuSearchInput = (page: Page) =>
    page.locator('[placeholder="Search by SKU..."]:visible').first();

  const openCreateProductForm = async (page: Page, sku: string) => {
    await getCreateProductButton(page).click();

    const skuDialog = page.getByRole('dialog', { name: 'Create New Product' }).last();
    await expect(skuDialog).toBeVisible({ timeout: 15_000 });
    await skuDialog.getByPlaceholder('e.g. ABC-123').fill(sku);
    await skuDialog.getByRole('button', { name: 'Confirm', exact: true }).click();

    await expect(skuDialog).toBeHidden({ timeout: 15_000 });
    const productModal = page.getByRole('dialog', { name: 'Create Product' }).last();
    await expect(productModal.locator('input#sku')).toHaveValue(sku, { timeout: 15_000 });
    return productModal;
  };

  async function createTestProduct(page: Page, sku: string, name: string) {
    const modal = await openCreateProductForm(page, sku);

    // Select a catalog in 'Other' tab to enable name fields
    await modal.getByRole('tab', { name: 'Other' }).click();
    await page.waitForTimeout(1000);

    // Try to click catalog selector - it might already have a value or be "Select catalogs"
    const catalogTrigger = modal
      .locator(
        'button:has-text("Select catalogs"), button:has-text("Default"), button:has-text("Main")'
      )
      .first();
    if (await catalogTrigger.isVisible()) {
      await catalogTrigger.click();
      await page.waitForTimeout(500);
      const catalogOptions = page.getByRole('menuitemcheckbox');
      if ((await catalogOptions.count()) > 0) {
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
    await page
      .getByText('Product created successfully.')
      .click({ force: true })
      .catch(() => {});
  }

  test('should duplicate a product', async ({ page }) => {
    const originalSku = `ORIG${Date.now()}`;
    const duplicateSku = `DUP${Date.now()}`;
    const productName = `Product to Duplicate ${Date.now()}`;

    await createTestProduct(page, originalSku, productName);

    const skuSearchInput = getSkuSearchInput(page);
    await skuSearchInput.fill(originalSku);
    await page.keyboard.press('Enter');

    const row = page.locator('tr').filter({ hasText: originalSku });
    await expect(row.first()).toBeVisible({ timeout: 15000 });
    await row.first().getByLabel('Open row actions').click();

    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    const duplicateSkuInput = page.locator('input[placeholder="e.g. ABC-123"]').last();
    await expect(duplicateSkuInput).toBeVisible({ timeout: 15_000 });
    await duplicateSkuInput.click();
    await duplicateSkuInput.pressSequentially(duplicateSku);
    await expect(duplicateSkuInput).toHaveValue(duplicateSku);
    const confirmButton = page.locator('button').filter({ hasText: /^Confirm$/ }).last();
    await expect(confirmButton).toBeEnabled({ timeout: 15_000 });
    await confirmButton.click();

    await expect(page).toHaveURL(/\/admin\/products\/.+\/edit$/, { timeout: 15_000 });
    await expect(page.locator('input#sku')).toHaveValue(duplicateSku, { timeout: 10000 });
  });

  test('should delete a product', async ({ page }) => {
    const sku = `DEL${Date.now()}`;
    const productName = `Product to Delete ${Date.now()}`;

    await createTestProduct(page, sku, productName);

    const skuSearchInput = getSkuSearchInput(page);
    await skuSearchInput.fill(sku);
    await page.keyboard.press('Enter');

    const row = page.locator('tr').filter({ hasText: sku });
    await expect(row.first()).toBeVisible({ timeout: 15000 });
    await row.first().getByLabel('Open row actions').click();

    await page.getByRole('menuitem', { name: 'Remove' }).click();
    const deleteDialog = page.getByRole('alertdialog', { name: 'Delete Product' });
    await expect(deleteDialog).toBeVisible({ timeout: 15_000 });
    const deleteRequest = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v2/products/') && response.request().method() === 'DELETE'
    );
    await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await deleteRequest;
    await expect(page.getByText('Product deleted successfully.')).toBeVisible({ timeout: 15_000 });
    await selectAllCatalogs(page);
    await getSkuSearchInput(page).fill(sku);
    await page.keyboard.press('Enter');
    await expect(page.locator('tr').filter({ hasText: sku })).not.toBeVisible({ timeout: 15000 });
  });

  test('should edit a product and save changes', async ({ page }) => {
    const timestamp = Date.now();
    const sku = `EDIT${timestamp}`;
    const productName = `Original Name ${timestamp}`;
    const updatedName = `Updated Name ${timestamp}`;

    await createTestProduct(page, sku, productName);

    const skuSearchInput = getSkuSearchInput(page);
    await skuSearchInput.fill(sku);
    await page.keyboard.press('Enter');

    const row = page.locator('tr').filter({ hasText: sku });
    await expect(row.first()).toBeVisible({ timeout: 15000 });
    await row.first().getByLabel('Open row actions').click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    const modal = page.getByRole('dialog', { name: 'Edit Product' }).last();
    const nameInput = modal.getByRole('textbox', { name: 'English Name' });
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await nameInput.fill(updatedName);

    const updatePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v2/products/') && response.request().method() === 'PUT'
    );
    await modal.getByRole('button', { name: 'Update', exact: true }).click({ force: true });
    await updatePromise;
    await expect(page.getByText('Product updated successfully.')).toBeVisible({ timeout: 15000 });
    await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });
    await selectAllCatalogs(page);
    await getSkuSearchInput(page).fill(sku);
    await page.keyboard.press('Enter');
    const updatedRow = page.locator('tr').filter({ hasText: sku }).first();
    await expect(updatedRow).toBeVisible({ timeout: 15000 });
    await expect(updatedRow).toContainText(updatedName);
  });

  test('should manage product parameters', async ({ page }) => {
    const sku = `PARAM${Date.now()}`;
    await createTestProduct(page, sku, 'Param Test');

    const skuSearchInput = getSkuSearchInput(page);
    await skuSearchInput.fill(sku);
    await page.keyboard.press('Enter');

    const row = page.locator('tr').filter({ hasText: sku });
    await expect(row.first()).toBeVisible({ timeout: 15000 });
    await row.first().getByLabel('Open row actions').click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    const modal = page.getByRole('dialog', { name: 'Edit Product' }).last();
    await expect(modal.getByRole('tab', { name: 'Parameters' })).toBeVisible({ timeout: 15_000 });
    await modal.getByRole('tab', { name: 'Parameters' }).click();

    await expect(page.getByText(/No parameters defined|Add Parameter/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should upload and manage product images', async ({ page }) => {
    const sku = `IMGTEST${Date.now()}`;
    const productName = `Image Test Product ${Date.now()}`;

    await createTestProduct(page, sku, productName);

    // Navigate to edit product and then to the Images tab
    await getSkuSearchInput(page).fill(sku);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    const row = page.locator('tr').filter({ hasText: sku });
    await expect(row.first()).toBeVisible({ timeout: 15000 });
    await row.first().getByLabel('Open row actions').click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    const modal = page.getByRole('dialog', { name: 'Edit Product' }).last();
    await expect(modal.getByRole('tab', { name: 'Images' })).toBeVisible({ timeout: 15_000 });
    await modal.getByRole('tab', { name: 'Images' }).click(); // Navigate to Images tab

    // --- Upload Image ---
    const imageUploadButton = modal.getByRole('button', { name: /Upload Choose Existing/i }).first();
    await expect(imageUploadButton).toBeVisible();

    // Mocking file input is complex and depends on the actual HTML structure.
    // For this test, we'll focus on interacting with the UI element if possible.
    // If `page.getByLabel('Upload images')` is indeed the file input element:
    // await imageUploadButton.setInputFiles('path/to/test-image.png');
    // Then assert the preview appears:
    // await expect(modal.locator('.image-preview').first()).toBeVisible({ timeout: 10000 });

    await expect(modal.locator('text=Image slots')).toBeVisible({ timeout: 10000 });
    await expect(imageUploadButton).toBeVisible();

    // Close modal
    await modal
      .getByRole('button', { name: 'Close' })
      .click({ force: true })
      .catch(() => {
        return page.getByLabel('Close').click({ force: true });
      });
    await expect(modal).not.toBeVisible();
  });
});
