import { expect, test, type Page } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';

type ProductFixture = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sku: string;
  baseProductId: string | null;
  defaultPriceGroupId: string | null;
  ean: string | null;
  gtin: string | null;
  asin: string | null;
  name: Record<string, string | null>;
  description: Record<string, string | null>;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  supplierName: string | null;
  supplierLink: string | null;
  priceComment: string | null;
  stock: number | null;
  price: number | null;
  sizeLength: number | null;
  sizeWidth: number | null;
  weight: number | null;
  length: number | null;
  published: boolean;
  categoryId: string | null;
  catalogId: string;
  category?: {
    id: string;
    catalogId: string;
    name: string;
    name_en: string;
    name_pl?: string | null;
    name_de?: string | null;
    color: string | null;
    parentId: string | null;
  };
  images: unknown[];
  catalogs: unknown[];
  tags?: unknown[];
  producers?: unknown[];
  parameters: Array<{ parameterId: string; value?: string | null }>;
  imageLinks: string[];
  imageBase64s: string[];
  noteIds: string[];
};

const createNestedCategoryProduct = (timestamp: string): ProductFixture => ({
  id: 'product-nested-category',
  createdAt: timestamp,
  updatedAt: timestamp,
  sku: `NESTED-CATEGORY-${Date.now()}`,
  baseProductId: null,
  defaultPriceGroupId: null,
  ean: null,
  gtin: null,
  asin: null,
  name: { en: 'Nested Category Product' },
  description: { en: 'Nested Category Product Description' },
  name_en: 'Nested Category Product',
  name_pl: null,
  name_de: null,
  description_en: 'Nested Category Product Description',
  description_pl: null,
  description_de: null,
  supplierName: null,
  supplierLink: null,
  priceComment: null,
  stock: 4,
  price: 19.99,
  sizeLength: null,
  sizeWidth: null,
  weight: null,
  length: null,
  published: true,
  categoryId: null,
  catalogId: '',
  category: {
    id: 'category-1',
    catalogId: 'catalog-1',
    name: 'Keychains',
    name_en: 'Keychains',
    name_pl: 'Breloki',
    name_de: 'Schluesselanhaenger',
    color: null,
    parentId: null,
  },
  images: [],
  catalogs: [],
  tags: [],
  producers: [],
  parameters: [],
  imageLinks: [],
  imageBase64s: [],
  noteIds: [],
});

const mockProductsAdminBootstrap = async (page: Page, timestamp: string) => {
  await page.route('**/api/user/preferences', async (route) => {
    const method = route.request().method();

    if (method === 'GET' || method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({}),
      });
      return;
    }

    await route.fallback();
  });

  await page.route(/\/api\/settings(?:\?.*scope=light.*)?$/, async (route) => {
    const request = route.request();
    if (request.method() !== 'GET' || !request.url().includes('scope=light')) {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/drafts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/ai-paths/trigger-buttons**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v2/products/entities/catalogs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([
        {
          id: 'catalog-1',
          name: 'Default Catalog',
          description: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          isDefault: true,
          languageIds: ['language-en'],
          defaultLanguageId: 'language-en',
          defaultPriceGroupId: 'price-group-1',
          priceGroupIds: ['price-group-1'],
        },
      ]),
    });
  });

  await page.route('**/api/v2/products/metadata/price-groups**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([
        {
          id: 'price-group-1',
          name: 'Default Price Group',
          description: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          groupId: 'default',
          currencyId: 'currency-pln',
          currencyCode: 'PLN',
          isDefault: true,
          type: 'default',
          basePriceField: 'price',
          sourceGroupId: null,
          priceMultiplier: 1,
          addToPrice: 0,
          currency: {
            id: 'currency-pln',
            name: 'Polish Zloty',
            description: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            code: 'PLN',
            symbol: 'zl',
          },
        },
      ]),
    });
  });

  await page.route('**/api/v2/metadata/languages**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([
        {
          id: 'language-en',
          name: 'English',
          description: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          code: 'EN',
          nativeName: 'English',
          isDefault: true,
          isActive: true,
        },
      ]),
    });
  });

  await page.route('**/api/v2/metadata/currencies**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([
        {
          id: 'currency-pln',
          name: 'Polish Zloty',
          description: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          code: 'PLN',
          symbol: 'zl',
          isDefault: true,
          isActive: true,
        },
      ]),
    });
  });

  await page.route('**/api/v2/products/producers**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });
};

const selectAllCatalogs = async (page: Page) => {
  const showFiltersButton = page.getByRole('button', { name: /show filters/i });
  if (await showFiltersButton.isVisible().catch(() => false)) {
    await showFiltersButton.click();
  }

  const catalogSelect = page.locator('[aria-label="Filter by catalog"]:visible').first();
  await expect(catalogSelect).toBeVisible({ timeout: 15_000 });
  await catalogSelect.click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await page.mouse.click(0, 0);
};

test.describe('Products list category labels', () => {
  test.setTimeout(120_000);

  test('shows the category label for products that only expose nested category data', async ({
    page,
  }) => {
    const now = new Date().toISOString();
    const product = createNestedCategoryProduct(now);
    await mockProductsAdminBootstrap(page, now);

    await page.route('**/api/v2/products/count**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({ count: 1 }),
      });
    });

    await page.route('**/api/v2/products/paged**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          products: [product],
          total: 1,
        }),
      });
    });

    await page.route('**/api/v2/products/categories/batch**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          'catalog-1': [
            {
              id: 'category-1',
              catalogId: 'catalog-1',
              name_en: 'Keychains',
            },
          ],
        }),
      });
    });

    await ensureAdminSession(page, '/admin/products', {
      initialNavigationTimeoutMs: 120_000,
      destinationNavigationTimeoutMs: 120_000,
      transitionTimeoutMs: 60_000,
    });
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();

    await selectAllCatalogs(page);

    const productRow = page.getByRole('row', { name: new RegExp(product.sku) }).first();
    const productNameCell = productRow.getByRole('cell').nth(2);

    await expect(page.getByText(product.sku).first()).toBeVisible({ timeout: 30_000 });
    await expect(productNameCell).toContainText(/Keychains|Breloki|Schluesselanhaenger/);
    await expect(productNameCell).not.toContainText('category-1');
  });
});
