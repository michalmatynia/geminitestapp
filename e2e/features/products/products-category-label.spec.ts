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
  test.setTimeout(60_000);

  test('shows the category label for products that only expose nested category data', async ({
    page,
  }) => {
    const now = new Date().toISOString();
    const product = createNestedCategoryProduct(now);

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

    await ensureAdminSession(page, '/admin/products');
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();

    await selectAllCatalogs(page);

    const productRow = page.getByRole('row', { name: new RegExp(product.sku) }).first();
    const productNameCell = productRow.getByRole('cell').nth(2);

    await expect(page.getByText(product.sku).first()).toBeVisible();
    await expect(productNameCell).toContainText(/Keychains|Breloki|Schluesselanhaenger/);
    await expect(productNameCell).not.toContainText('category-1');
  });
});
