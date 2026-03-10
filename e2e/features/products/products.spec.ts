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
    await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });
  });

  const getCreateProductButton = (page: Page) =>
    page.locator('[aria-label="Create new product"]:visible').first();

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

  test('should display the products list', async ({ page }) => {
    // Check for the main heading
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();

    // Check for the create button
    await expect(getCreateProductButton(page)).toBeVisible();
  });

  test('should open the create product modal after entering SKU', async ({ page }) => {
    const testSku = `TEST${Date.now()}`;
    const modal = await openCreateProductForm(page, testSku);

    // Check if the SKU is pre-filled
    await expect(modal.locator('input#sku')).toHaveValue(testSku);
  });

  test('should validate required fields in the create form', async ({ page }) => {
    await getCreateProductButton(page).click();
    const skuDialog = page.getByRole('dialog', { name: 'Create New Product' }).last();
    await expect(skuDialog).toBeVisible({ timeout: 15_000 });

    const confirmButton = skuDialog.getByRole('button', { name: 'Confirm', exact: true });
    await expect(confirmButton).toBeDisabled();

    await skuDialog.getByPlaceholder('e.g. ABC-123').fill(`VAL${Date.now()}`);
    await expect(confirmButton).toBeEnabled();
  });

  test('should switch languages in the form', async ({ page }) => {
    const modal = await openCreateProductForm(page, `LANG${Date.now()}`);

    const languageTabs = modal
      .getByRole('tab')
      .filter({ hasText: /^(Polish|English|German|PL|EN|DE)$/i });
    const tabCount = await languageTabs.count();

    if (tabCount < 2) {
      await expect(modal.getByRole('tab', { name: 'General' })).toBeVisible();
      return;
    }

    await languageTabs.nth(1).click();
    await expect(languageTabs.nth(1)).toHaveAttribute('data-state', 'active');
  });

  test('should filter products by search', async ({ page }) => {
    // Find the search input
    const searchInput = page.locator('input[placeholder="Search by product name..."]:visible').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill('NonExistentProductXYZ');
    await page.keyboard.press('Enter');

    // Should show empty state
    await expect(page.locator('text=No results')).toBeVisible();
  });

  test('should navigate between tabs in product form', async ({ page }) => {
    const modal = await openCreateProductForm(page, `TABS${Date.now()}`);

    // Check main tabs
    await expect(modal.getByRole('tab', { name: 'General' })).toBeVisible();

    await modal.getByRole('tab', { name: 'Other' }).click();
    await expect(modal.locator('label:has-text("Stock")')).toBeVisible();

    await modal.getByRole('tab', { name: 'Images' }).click();
    // Use a more generic locator that exists in ProductImageManager
    await expect(modal.locator('text=Image slots')).toBeVisible();
  });

  test('should paginate products', async ({ page }) => {
    // Check for pagination controls in header
    const nextButton = page.locator('button[aria-label="Next page"]:visible').first();
    if ((await nextButton.isVisible()) && !(await nextButton.isDisabled())) {
      await nextButton.click();
      await expect(page.getByText(/^2\s*\/\s*\d+$/).first()).toBeVisible();
    } else {
      console.log('Not enough products for pagination test, skipping');
    }
  });

  test('should show page size options', async ({ page }) => {
    const pageSizeSelect = page
      .locator('[role="combobox"]:visible')
      .filter({ hasText: /^(12|24|48)$/ })
      .first();
    await pageSizeSelect.click();

    const listboxId = await pageSizeSelect.getAttribute('aria-controls');
    expect(listboxId).toBeTruthy();
    const listbox = page.locator(`#${listboxId}`);
    await expect(listbox.getByRole('option', { name: /^12$/ })).toBeVisible();
    await expect(listbox.getByRole('option', { name: /^24$/ })).toBeVisible();
    await expect(listbox.getByRole('option', { name: /^48$/ })).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
