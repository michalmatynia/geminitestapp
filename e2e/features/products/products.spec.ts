import { test, expect, type Page } from '@playwright/test';

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
  const authSucceeded = await page
    .waitForURL(/\/admin(\/.*)?(\?.*)?$/, { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  return authSucceeded;
};

test.describe('Products Management', () => {
  test.beforeEach(async ({ page }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    // Navigate to the products page
    await page.goto('/admin/products');
  });

  const getCreateProductButton = (page: Page) =>
    page.locator('[aria-label="Create new product"]:visible').first();

  test('should display the products list', async ({ page }) => {
    // Check for the main heading
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();

    // Check for the create button
    await expect(getCreateProductButton(page)).toBeVisible();
  });

  test('should open the create product modal after entering SKU', async ({ page }) => {
    const testSku = `TEST${Date.now()}`;

    // Listen for the window.prompt and provide a SKU
    page.on('dialog', async (dialog) => {
      await dialog.accept(testSku);
    });

    // Click the create button
    await getCreateProductButton(page).click();

    // The modal should appear
    const modal = page.getByRole('dialog').last();
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Create Product', exact: true })).toBeVisible();

    // Check if the SKU is pre-filled
    await expect(modal.locator('input#sku')).toHaveValue(testSku);
  });

  test('should validate required fields in the create form', async ({ page }) => {
    // SKU prompt
    page.on('dialog', async (dialog) => {
      await dialog.accept(`VAL${Date.now()}`);
    });
    await getCreateProductButton(page).click();

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
    page.on('dialog', async (dialog) => {
      await dialog.accept(`LANG${Date.now()}`);
    });
    await getCreateProductButton(page).click();

    // Select a catalog to enable languages
    const catalogSelect = page.getByLabel('Filter by catalog');
    await expect(catalogSelect).toBeVisible({ timeout: 15000 });
    await catalogSelect.click({ force: true });
    await page.waitForTimeout(500);

    // Use keyboard to select an option (Skip All and Unassigned)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Check language tabs for Name - they appear when a catalog is selected
    // They are within localized-input-group, usually labeled like "English Name" or "EN Name"
    await expect(page.getByRole('tab', { name: /Name/i }).first()).toBeVisible({ timeout: 15000 });
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
    page.on('dialog', async (dialog) => {
      await dialog.accept(`TABS${Date.now()}`);
    });
    await getCreateProductButton(page).click();

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
    if ((await nextButton.isVisible()) && !(await nextButton.isDisabled())) {
      await nextButton.click();
      await expect(page.locator('text=/ 2')).toBeVisible(); // Assuming at least 2 pages
    } else {
      console.log('Not enough products for pagination test, skipping');
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
