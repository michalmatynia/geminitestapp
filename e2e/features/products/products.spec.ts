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

  test('should render parameter values in the product list row summary', async ({ page }) => {
    await page.route('**/api/v2/products/paged*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          products: [
            {
              id: 'product-1',
              sku: 'KEYCHA1212',
              baseProductId: null,
              defaultPriceGroupId: null,
              ean: null,
              gtin: null,
              asin: null,
              name: { en: 'Keychain', pl: null, de: null },
              description: { en: '', pl: null, de: null },
              name_en: 'Keychain',
              name_pl: null,
              name_de: null,
              description_en: null,
              description_pl: null,
              description_de: null,
              supplierName: null,
              supplierLink: null,
              priceComment: null,
              stock: 1,
              price: 10,
              sizeLength: null,
              sizeWidth: null,
              weight: null,
              length: null,
              published: false,
              categoryId: 'category-1',
              category: {
                id: 'category-1',
                catalogId: 'catalog-1',
                name_en: 'Keychains',
              },
              catalogId: 'catalog-1',
              tags: [],
              producers: [],
              images: [],
              catalogs: [],
              parameters: [
                {
                  parameterId: 'size',
                  value: '13 cm',
                },
                {
                  parameterId: 'material',
                  value: '',
                  valuesByLanguage: {
                    en: 'Faux Leather',
                  },
                },
              ],
              imageLinks: [],
              imageBase64s: [],
              noteIds: [],
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          total: 1,
        }),
      });
    });

    await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('button', { name: 'Keychain | 13 cm | Faux Leather' })
    ).toBeVisible();
  });

  test('should render Polish product names with English parameter fallback in the product list row summary', async ({
    page,
  }) => {
    await page.route('**/api/user/preferences', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          productListNameLocale: 'name_pl',
        }),
      });
    });

    await page.route('**/api/v2/products/paged*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          products: [
            {
              id: 'product-1',
              sku: 'KEYCHA1212',
              baseProductId: null,
              defaultPriceGroupId: null,
              ean: null,
              gtin: null,
              asin: null,
              name: { en: 'Keychain', pl: 'Brelok', de: null },
              description: { en: '', pl: null, de: null },
              name_en: 'Keychain',
              name_pl: 'Brelok',
              name_de: null,
              description_en: null,
              description_pl: null,
              description_de: null,
              supplierName: null,
              supplierLink: null,
              priceComment: null,
              stock: 1,
              price: 10,
              sizeLength: null,
              sizeWidth: null,
              weight: null,
              length: null,
              published: false,
              categoryId: 'category-1',
              category: {
                id: 'category-1',
                catalogId: 'catalog-1',
                name_en: 'Keychains',
                name_pl: 'Breloki',
              },
              catalogId: 'catalog-1',
              tags: [],
              producers: [],
              images: [],
              catalogs: [],
              parameters: [
                {
                  parameterId: 'size',
                  value: '',
                  valuesByLanguage: {
                    pl: '13 cm',
                  },
                },
                {
                  parameterId: 'material',
                  value: '',
                  valuesByLanguage: {
                    en: 'Faux Leather',
                  },
                },
              ],
              imageLinks: [],
              imageBase64s: [],
              noteIds: [],
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          total: 1,
        }),
      });
    });

    await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('button', { name: 'Brelok | 13 cm | Faux Leather' })).toBeVisible();
  });

  test('should not render the English title when the Polish locale is selected but the Polish title is missing', async ({
    page,
  }) => {
    await page.route('**/api/user/preferences', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          productListNameLocale: 'name_pl',
        }),
      });
    });

    await page.route('**/api/v2/products/paged*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          products: [
            {
              id: 'product-2',
              sku: 'KEYCHA1313',
              baseProductId: null,
              defaultPriceGroupId: null,
              ean: null,
              gtin: null,
              asin: null,
              name: { en: 'Keychain', pl: null, de: null },
              description: { en: '', pl: null, de: null },
              name_en: 'Keychain',
              name_pl: null,
              name_de: null,
              description_en: null,
              description_pl: null,
              description_de: null,
              supplierName: null,
              supplierLink: null,
              priceComment: null,
              stock: 1,
              price: 10,
              sizeLength: null,
              sizeWidth: null,
              weight: null,
              length: null,
              published: false,
              categoryId: 'category-1',
              category: {
                id: 'category-1',
                catalogId: 'catalog-1',
                name_en: 'Keychains',
                name_pl: 'Breloki',
              },
              catalogId: 'catalog-1',
              tags: [],
              producers: [],
              images: [],
              catalogs: [],
              parameters: [
                {
                  parameterId: 'size',
                  value: '',
                  valuesByLanguage: {
                    en: '13 cm',
                  },
                },
                {
                  parameterId: 'material',
                  value: '',
                  valuesByLanguage: {
                    en: 'Faux Leather',
                  },
                },
              ],
              imageLinks: [],
              imageBase64s: [],
              noteIds: [],
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          total: 1,
        }),
      });
    });

    await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });

    const productButton = page.getByRole('button', { name: 'Open product' });

    await expect(productButton).toBeVisible();
    await expect(productButton).toHaveText('—');
    await expect(page.getByText('Keychain | 13 cm | Faux Leather')).not.toBeVisible();
  });

  test('should preserve the parameter summary after a full products page reload', async ({ page }) => {
    await page.route('**/api/user/preferences', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          productListNameLocale: 'name_en',
        }),
      });
    });

    await page.route('**/api/v2/products/paged*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          products: [
            {
              id: 'product-3',
              sku: 'KEYCHA1414',
              baseProductId: null,
              defaultPriceGroupId: null,
              ean: null,
              gtin: null,
              asin: null,
              name: { en: 'Keychain', pl: null, de: null },
              description: { en: '', pl: null, de: null },
              name_en: 'Keychain',
              name_pl: null,
              name_de: null,
              description_en: null,
              description_pl: null,
              description_de: null,
              supplierName: null,
              supplierLink: null,
              priceComment: null,
              stock: 1,
              price: 10,
              sizeLength: null,
              sizeWidth: null,
              weight: null,
              length: null,
              published: false,
              categoryId: 'category-1',
              category: {
                id: 'category-1',
                catalogId: 'catalog-1',
                name_en: 'Keychains',
              },
              catalogId: 'catalog-1',
              tags: [],
              producers: [],
              images: [],
              catalogs: [],
              parameters: [
                {
                  parameterId: 'size',
                  value: '13 cm',
                },
                {
                  parameterId: 'material',
                  value: '',
                  valuesByLanguage: {
                    en: 'Faux Leather',
                  },
                },
              ],
              imageLinks: [],
              imageBase64s: [],
              noteIds: [],
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          total: 1,
        }),
      });
    });

    await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('button', { name: 'Keychain | 13 cm | Faux Leather' })
    ).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('button', { name: 'Keychain | 13 cm | Faux Leather' })
    ).toBeVisible();
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
