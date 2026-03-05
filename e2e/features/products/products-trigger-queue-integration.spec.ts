import { expect, test, type Page } from '@playwright/test';

type TriggerButtonFixture = {
  id: string;
  name: string;
  enabled: boolean;
  locations: Array<'product_row' | 'product_modal' | 'product_list' | 'note_modal' | 'note_list'>;
  mode: 'click' | 'toggle';
  display: 'icon' | 'icon_label';
  iconId: string | null;
  pathId?: string | null;
  sortIndex: number;
  createdAt: string;
  updatedAt: string;
};

type ProductFixture = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sku: string | null;
  baseProductId: string | null;
  defaultPriceGroupId: string | null;
  ean: string | null;
  gtin: string | null;
  asin: string | null;
  name: Record<string, string | null>;
  description: Record<string, string | null>;
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
  images: unknown[];
  catalogs: unknown[];
  parameters: Array<{ parameterId: string; value?: string | null }>;
  imageLinks: string[];
  imageBase64s: string[];
  noteIds: string[];
};

const E2E_ADMIN_EMAIL =
  process.env['PLAYWRIGHT_E2E_ADMIN_EMAIL'] ??
  process.env['E2E_ADMIN_EMAIL'] ??
  'admin@example.com';
const E2E_ADMIN_PASSWORD =
  process.env['PLAYWRIGHT_E2E_ADMIN_PASSWORD'] ??
  process.env['E2E_ADMIN_PASSWORD'] ??
  'admin123';

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

const createProductFixture = (
  id: string,
  sku: string,
  label: string,
  timestamp: string
): ProductFixture => ({
  id,
  createdAt: timestamp,
  updatedAt: timestamp,
  sku,
  baseProductId: null,
  defaultPriceGroupId: null,
  ean: null,
  gtin: null,
  asin: null,
  name: { en: label },
  description: { en: `${label} description` },
  supplierName: null,
  supplierLink: null,
  priceComment: null,
  stock: null,
  price: null,
  sizeLength: null,
  sizeWidth: null,
  weight: null,
  length: null,
  published: true,
  categoryId: null,
  catalogId: 'catalog-e2e',
  images: [],
  catalogs: [],
  parameters: [],
  imageLinks: [],
  imageBase64s: [],
  noteIds: [],
});

test.describe('Products trigger button queue integration', () => {
  const setupProductTriggerHarness = async (
    page: Page,
    options: { enqueueBody: Record<string, unknown> }
  ): Promise<{
    triggerButtonName: string;
    productSku: string;
    pathId: string;
    productId: string;
    triggerEventId: string;
    getProductsPagedRequestCount: () => number;
    getEnqueueRequestBody: () => Record<string, unknown> | null;
  }> => {
    const now = new Date().toISOString();
    const triggerEventId = 'manual';
    const pathId = 'path-e2e-product-trigger';
    const productId = 'product-e2e-trigger';
    const productSku = `E2E-TRIGGER-${Date.now()}`;
    const product = createProductFixture(productId, productSku, 'Trigger Product', now);

    const triggerButton: TriggerButtonFixture = {
      id: triggerEventId,
      name: 'Queue Description Path',
      enabled: true,
      locations: ['product_row'],
      mode: 'click',
      display: 'icon_label',
      iconId: null,
      pathId: null,
      sortIndex: 0,
      createdAt: now,
      updatedAt: now,
    };

    let productsPagedRequestCount = 0;
    let enqueueRequestBody: Record<string, unknown> | null = null;

    await page.route('**/api/user/preferences**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          productListNameLocale: 'name_en',
          productListCatalogFilter: 'all',
          productListCurrencyCode: 'USD',
          productListPageSize: 12,
          productListThumbnailSource: 'file',
          productListFiltersCollapsedByDefault: false,
          productListAdvancedFilterPresets: [],
          productListAppliedAdvancedFilter: '',
          productListAppliedAdvancedFilterPresetId: null,
          aiPathsActivePathId: null,
        }),
      });
    });

    await page.route('**/api/v2/products/entities/catalogs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify([
          {
            id: 'catalog-e2e',
            name: 'E2E Catalog',
            defaultPriceGroupId: 'pg-e2e',
            priceGroupIds: ['pg-e2e'],
            languageIds: ['EN'],
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
            id: 'pg-e2e',
            currencyId: 'cur-usd',
            currencyCode: 'USD',
            isDefault: true,
            sourceGroupId: null,
            priceMultiplier: 1,
            addToPrice: 0,
            type: 'base',
            currency: { id: 'cur-usd', code: 'USD', symbol: '$', name: 'US Dollar' },
          },
        ]),
      });
    });

    await page.route('**/api/v2/metadata/languages**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify([{ id: 'EN', code: 'EN', name: 'English' }]),
      });
    });

    await page.route('**/api/v2/metadata/currencies**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify([{ id: 'cur-usd', code: 'USD', symbol: '$', name: 'US Dollar' }]),
      });
    });

    await page.route('**/api/v2/products/paged**', async (route) => {
      productsPagedRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({ products: [product], total: 1 }),
      });
    });

    await page.route('**/api/ai-paths/trigger-buttons**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify([triggerButton]),
      });
    });

    await page.route('**/api/ai-paths/settings**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify([
          {
            key: 'ai_paths_index',
            value: JSON.stringify([
              { id: pathId, name: 'E2E Trigger Path', createdAt: now, updatedAt: now },
            ]),
          },
          {
            key: `ai_paths_config_${pathId}`,
            value: JSON.stringify({
              id: pathId,
              name: 'E2E Trigger Path',
              isActive: true,
              strictFlowMode: true,
              aiPathsValidation: { enabled: false },
              nodes: [
                {
                  id: 'node-trigger-e2e',
                  type: 'trigger',
                  title: 'Trigger',
                  description: 'E2E trigger node',
                  position: { x: 120, y: 120 },
                  inputs: [],
                  outputs: ['trigger'],
                  createdAt: now,
                  updatedAt: now,
                },
              ],
              edges: [],
              updatedAt: now,
            }),
          },
        ]),
      });
    });

    await page.route('**/api/ai-paths/runs/enqueue', async (route) => {
      enqueueRequestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify(options.enqueueBody),
      });
    });

    await page.route('**/api/ai-paths/runs?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({ runs: [], total: 0 }),
      });
    });

    await page.goto('/admin/products');
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();

    return {
      triggerButtonName: triggerButton.name,
      productSku,
      pathId,
      productId,
      triggerEventId,
      getProductsPagedRequestCount: () => productsPagedRequestCount,
      getEnqueueRequestBody: () => enqueueRequestBody,
    };
  };

  const assertTriggerRunQueued = async (
    page: Page,
    setup: {
      triggerButtonName: string;
      productSku: string;
      pathId: string;
      productId: string;
      triggerEventId: string;
      getProductsPagedRequestCount: () => number;
      getEnqueueRequestBody: () => Record<string, unknown> | null;
    }
  ): Promise<void> => {
    const productRow = page.locator('tr').filter({ hasText: setup.productSku }).first();
    await expect(productRow).toBeVisible({ timeout: 15_000 });

    const triggerButtonLocator = productRow.getByRole('button', { name: setup.triggerButtonName });
    await expect(triggerButtonLocator).toBeVisible({ timeout: 15_000 });

    const requestsBeforeTrigger = setup.getProductsPagedRequestCount();
    await triggerButtonLocator.click();

    await expect.poll(() => setup.getEnqueueRequestBody()).not.toBeNull();
    expect(setup.getEnqueueRequestBody()?.['entityType']).toBe('product');
    expect(setup.getEnqueueRequestBody()?.['entityId']).toBe(setup.productId);
    expect(setup.getEnqueueRequestBody()?.['triggerEvent']).toBe(setup.triggerEventId);
    expect(setup.getEnqueueRequestBody()?.['pathId']).toBe(setup.pathId);

    await expect(productRow.getByText('Queued')).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(() => setup.getProductsPagedRequestCount(), { timeout: 15_000 })
      .toBeGreaterThan(requestsBeforeTrigger);
  };

  const assertTriggerRunRejected = async (
    page: Page,
    setup: {
      triggerButtonName: string;
      productSku: string;
      pathId: string;
      productId: string;
      triggerEventId: string;
      getProductsPagedRequestCount: () => number;
      getEnqueueRequestBody: () => Record<string, unknown> | null;
    }
  ): Promise<void> => {
    const productRow = page.locator('tr').filter({ hasText: setup.productSku }).first();
    await expect(productRow).toBeVisible({ timeout: 15_000 });

    const triggerButtonLocator = productRow.getByRole('button', { name: setup.triggerButtonName });
    await expect(triggerButtonLocator).toBeVisible({ timeout: 15_000 });

    await triggerButtonLocator.click();

    await expect.poll(() => setup.getEnqueueRequestBody()).not.toBeNull();
    expect(setup.getEnqueueRequestBody()?.['entityType']).toBe('product');
    expect(setup.getEnqueueRequestBody()?.['entityId']).toBe(setup.productId);
    expect(setup.getEnqueueRequestBody()?.['triggerEvent']).toBe(setup.triggerEventId);
    expect(setup.getEnqueueRequestBody()?.['pathId']).toBe(setup.pathId);

    await expect(page.getByText(/invalid run identifier from API/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(productRow.getByText('Queued')).toHaveCount(0);
  };

  test('enqueues AI Path run from Product row trigger and updates queued badge + refresh', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          id: 'run-e2e-product-trigger',
          status: 'queued',
        },
      },
    });
    await assertTriggerRunQueued(page, setup);
  });

  test('handles legacy enqueue payloads exposing only run._id and still updates queue state', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          _id: 'run-e2e-product-trigger-legacy',
          status: 'queued',
        },
      },
    });
    await assertTriggerRunQueued(page, setup);
  });

  test('does not show queued badge when enqueue response is missing run identifier', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          status: 'queued',
        },
      },
    });
    await assertTriggerRunRejected(page, setup);
  });

  test('does not show queued badge when enqueue response exposes only wrapper id/pathId', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        id: 'path-e2e-product-trigger',
        pathId: 'path-e2e-product-trigger',
        run: {
          status: 'queued',
        },
      },
    });
    await assertTriggerRunRejected(page, setup);
  });

  test('handles legacy top-level runId payloads and still updates queue state', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        runId: 'run-e2e-product-trigger-top-level',
      },
    });
    await assertTriggerRunQueued(page, setup);
  });

  test('handles mixed enqueue payloads with runId outside run object', async ({ page }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          status: 'queued',
        },
        runId: 'run-e2e-product-trigger-mixed',
      },
    });
    await assertTriggerRunQueued(page, setup);
  });
});
