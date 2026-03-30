import { expect, type Locator, type Page } from '@playwright/test';

import { ensureAdminSession as ensureSharedAdminSession } from '../../support/admin-auth';
import {
  openAdminProductsPage as openSharedAdminProductsPage,
  openAdminQueuePage as openSharedAdminQueuePage,
} from '../../support/ai-paths-product-workflow-fixtures';

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
  images: unknown[];
  catalogs: unknown[];
  tags?: unknown[];
  producers?: unknown[];
  parameters: Array<{ parameterId: string; value?: string | null }>;
  imageLinks: string[];
  imageBase64s: string[];
  noteIds: string[];
};

export type ProductTriggerHarness = {
  triggerButtonName: string;
  productSku: string;
  pathId: string;
  productId: string;
  triggerEventId: string;
  getProductsPagedRequestCount: () => number;
  getEnqueueRequestBody: () => Record<string, unknown> | null;
  getSettingsWriteBodies: () => Array<Record<string, unknown>>;
  setTrackedRunDetail: (detail: Record<string, unknown> | null) => void;
};

export type ProductModalTriggerHarness = {
  modal: Locator;
  triggerButtonName: string;
  productName: string;
  productSku: string;
  pathId: string;
  productId: string;
  triggerEventId: string;
  getEnqueueRequestBody: () => Record<string, unknown> | null;
};

export const ensureAdminSession = async (
  page: Page,
  destination = '/admin'
): Promise<boolean> => {
  try {
    await ensureSharedAdminSession(page, destination);
    return true;
  } catch {
    return false;
  }
};

export const openAdminProductsPage = async (page: Page): Promise<void> => {
  await openSharedAdminProductsPage(page);
};

export const openAdminQueuePage = async (page: Page): Promise<boolean> => {
  try {
    await openSharedAdminQueuePage(page);
    return true;
  } catch {
    return false;
  }
};

export const openProductEditModal = async (
  page: Page,
  productSku: string,
  options?: { dismissTransientOverlays?: boolean }
): Promise<Locator> => {
  const productRow = page.locator('tr').filter({ hasText: productSku }).first();
  await expect(productRow).toBeVisible({ timeout: 15_000 });

  if (options?.dismissTransientOverlays) {
    await page.keyboard.press('Escape').catch(() => null);
  }

  await productRow.getByLabel('Open row actions').click({ force: true });
  await page.getByRole('menuitem', { name: 'Edit' }).click({ force: true });

  const modal = page.locator('[role="dialog"]').last();
  await expect(modal).toBeVisible({ timeout: 15_000 });
  return modal;
};

export const openProductEditModalFromName = async (
  page: Page,
  productSku: string,
  productName: string,
  options?: { dismissTransientOverlays?: boolean }
): Promise<Locator> => {
  const productRow = page.locator('tr').filter({ hasText: productSku }).first();
  await expect(productRow).toBeVisible({ timeout: 15_000 });

  if (options?.dismissTransientOverlays) {
    await page.keyboard.press('Escape').catch(() => null);
  }

  await productRow.getByRole('button', { name: productName, exact: true }).click();

  const modal = page.locator('[role="dialog"]').last();
  await expect(modal).toBeVisible({ timeout: 15_000 });
  return modal;
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
  name_en: label,
  name_pl: null,
  name_de: null,
  description_en: `${label} description`,
  description_pl: null,
  description_de: null,
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
  tags: [],
  producers: [],
  parameters: [],
  imageLinks: [],
  imageBase64s: [],
  noteIds: [],
});

export const createProductTriggerPathConfig = (args: {
  pathId: string;
  pathName: string;
  timestamp: string;
  triggerTitle?: string;
  triggerEventId?: string;
  triggerConfig?: Record<string, unknown>;
}): Record<string, unknown> => ({
  id: args.pathId,
  name: args.pathName,
  isActive: true,
  strictFlowMode: true,
  aiPathsValidation: { enabled: false },
  nodes: [
    {
      id: 'node-111111111111111111111111',
      instanceId: 'node-111111111111111111111111',
      nodeTypeId: 'nt-111111111111111111111111',
      type: 'trigger',
      title: args.triggerTitle ?? 'Trigger',
      description: 'E2E trigger node',
      position: { x: 120, y: 120 },
      inputs: [],
      outputs: ['trigger'],
      ...(args.triggerConfig
        ? {
            config: {
              trigger: {
                ...(args.triggerEventId ? { event: args.triggerEventId } : {}),
                ...args.triggerConfig,
              },
            },
          }
        : {}),
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    },
  ],
  edges: [],
  updatedAt: args.timestamp,
});

const routeSharedProductHarnessApis = async (page: Page, product: ProductFixture): Promise<void> => {
  const preferencesResponseBody = {
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
  };
  const catalogResponseBody = [
    {
      id: 'catalog-e2e',
      name: 'E2E Catalog',
      defaultPriceGroupId: 'pg-e2e',
      priceGroupIds: ['pg-e2e'],
      languageIds: ['EN'],
    },
  ];
  const priceGroupsResponseBody = [
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
  ];

  await page.route('**/api/user/preferences**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(preferencesResponseBody),
    });
  });

  await page.route('**/api/v2/products/entities/catalogs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(catalogResponseBody),
    });
  });

  await page.route('**/api/v2/products/metadata/price-groups**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(priceGroupsResponseBody),
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

  await page.route('**/api/v2/products/producers**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v2/products/categories/tree*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v2/products/tags*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v2/products/parameters*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v2/products/simple-parameters*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });

  await page.route(`**/api/v2/products/${product.id}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(product),
    });
  });
};

export const setupProductTriggerHarness = async (
  page: Page,
  options: {
    enqueueBody: Record<string, unknown>;
    enqueueDelayMs?: number;
    pathConfigOverride?: Record<string, unknown>;
    pathName?: string;
    productId?: string;
    productSku?: string;
    productLabel?: string;
    initialQueuedProductStoragePayload?: unknown;
    trackRunStatus?: boolean;
    initialTrackedRunDetail?: Record<string, unknown> | null;
  }
): Promise<ProductTriggerHarness> => {
  const now = new Date().toISOString();
  const triggerEventId = 'manual';
  const pathId = 'path-e2e-product-trigger';
  const productId = options.productId ?? 'product-e2e-trigger';
  const productSku = options.productSku ?? `E2E-TRIGGER-${Date.now()}`;
  const product = createProductFixture(
    productId,
    productSku,
    options.productLabel ?? 'Trigger Product',
    now
  );

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
  const settingsWriteBodies: Array<Record<string, unknown>> = [];
  let trackedRunDetail = options.initialTrackedRunDetail ?? null;
  const pathName = options.pathName ?? 'E2E Trigger Path';
  const pathConfig =
    options.pathConfigOverride ??
    createProductTriggerPathConfig({
      pathId,
      pathName,
      timestamp: now,
    });

  if (options.initialQueuedProductStoragePayload !== undefined) {
    await page.addInitScript(
      ({ payload }) => {
        window.localStorage.setItem('queued-product-ids', JSON.stringify(payload));
      },
      {
        payload: options.initialQueuedProductStoragePayload,
      }
    );
  }

  await routeSharedProductHarnessApis(page, product);

  await page.route('**/api/v2/products/paged*', async (route) => {
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
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      settingsWriteBodies.push(body);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify(body),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([
        {
          key: 'ai_paths_index',
          value: JSON.stringify([{ id: pathId, name: pathName, createdAt: now, updatedAt: now }]),
        },
        {
          key: `ai_paths_config_${pathId}`,
          value: JSON.stringify(pathConfig),
        },
      ]),
    });
  });

  await page.route('**/api/ai-paths/runs/enqueue', async (route) => {
    enqueueRequestBody = route.request().postDataJSON() as Record<string, unknown>;
    if ((options.enqueueDelayMs ?? 0) > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.enqueueDelayMs));
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(options.enqueueBody),
    });
  });

  if (options.trackRunStatus) {
    await page.route('**/api/ai-paths/runs/*', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (/\/api\/ai-paths\/runs\/[^/]+\/stream$/.test(pathname)) {
        await route.fulfill({
          status: 503,
          contentType: 'text/plain',
          headers: { 'Cache-Control': 'no-store' },
          body: 'stream unavailable in e2e queue harness',
        });
        return;
      }

      const runDetailMatch = pathname.match(/\/api\/ai-paths\/runs\/([^/]+)$/);
      if (!runDetailMatch) {
        await route.fallback();
        return;
      }

      const runId = decodeURIComponent(runDetailMatch[1] ?? '');
      if (!runId || runId === 'enqueue') {
        await route.fallback();
        return;
      }

      if (!trackedRunDetail) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          headers: { 'Cache-Control': 'no-store' },
          body: JSON.stringify({ error: 'Run not found' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          run: {
            id: runId,
            status: 'queued',
            entityId: productId,
            entityType: 'product',
            pathId,
            pathName,
            createdAt: now,
            updatedAt: now,
            ...trackedRunDetail,
          },
          nodes: [],
          events: [],
        }),
      });
    });
  }

  await page.route('**/api/ai-paths/runs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ runs: [], total: 0 }),
    });
  });

  await openAdminProductsPage(page);

  return {
    triggerButtonName: triggerButton.name,
    productSku,
    pathId,
    productId,
    triggerEventId,
    getProductsPagedRequestCount: () => productsPagedRequestCount,
    getEnqueueRequestBody: () => enqueueRequestBody,
    getSettingsWriteBodies: () => settingsWriteBodies,
    setTrackedRunDetail: (detail: Record<string, unknown> | null): void => {
      trackedRunDetail = detail;
    },
  };
};

export const setupProductModalTriggerHarness = async (
  page: Page,
  options: { enqueueBody: Record<string, unknown> }
): Promise<ProductModalTriggerHarness> => {
  const now = new Date().toISOString();
  const triggerEventId = 'trigger-e2e-product-modal';
  const pathId = 'path-e2e-product-modal';
  const productId = 'product-e2e-modal';
  const productSku = `E2E-MODAL-${Date.now()}`;
  const productName = 'Modal Trigger Product';
  const product = createProductFixture(productId, productSku, productName, now);

  const triggerButton: TriggerButtonFixture = {
    id: triggerEventId,
    name: 'Infer Params',
    enabled: true,
    locations: ['product_modal'],
    mode: 'click',
    display: 'icon_label',
    iconId: null,
    pathId: null,
    sortIndex: 0,
    createdAt: now,
    updatedAt: now,
  };

  let enqueueRequestBody: Record<string, unknown> | null = null;

  await routeSharedProductHarnessApis(page, product);

  await page.route('**/api/v2/products/paged*', async (route) => {
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
            { id: pathId, name: 'E2E Product Modal Trigger Path', createdAt: now, updatedAt: now },
          ]),
        },
        {
          key: `ai_paths_config_${pathId}`,
          value: JSON.stringify({
            id: pathId,
            name: 'E2E Product Modal Trigger Path',
            isActive: true,
            strictFlowMode: true,
            aiPathsValidation: { enabled: false },
            nodes: [
              {
                id: 'node-222222222222222222222222',
                instanceId: 'node-222222222222222222222222',
                nodeTypeId: 'nt-222222222222222222222222',
                type: 'trigger',
                title: 'Trigger: Infer Params',
                description: 'E2E modal trigger node',
                position: { x: 120, y: 120 },
                inputs: [],
                outputs: ['trigger', 'triggerName'],
                config: {
                  trigger: {
                    event: triggerEventId,
                  },
                },
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

  await page.route('**/api/ai-paths/runs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ runs: [], total: 0 }),
    });
  });

  await openAdminProductsPage(page);

  const modal = await openProductEditModal(page, productSku);
  await expect(modal.getByRole('button', { name: triggerButton.name })).toBeVisible({
    timeout: 15_000,
  });

  return {
    modal,
    triggerButtonName: triggerButton.name,
    productName,
    productSku,
    pathId,
    productId,
    triggerEventId,
    getEnqueueRequestBody: () => enqueueRequestBody,
  };
};

export const assertTriggerRunQueued = async (
  page: Page,
  setup: ProductTriggerHarness
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

  await expect(productRow.getByText('Queued').first()).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(() => setup.getProductsPagedRequestCount(), { timeout: 15_000 })
    .toBeGreaterThan(requestsBeforeTrigger);
};

export const assertQueuedRunVisibleInAllRuns = async (
  page: Page,
  runId: string
): Promise<boolean> => {
  const queueOpened = await openAdminQueuePage(page);
  if (!queueOpened) return false;

  await expect(page.getByRole('tab', { name: 'All Runs' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByText(runId)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('E2E Trigger Path')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Showing 1 of 1 runs')).toBeVisible({ timeout: 30_000 });
  return true;
};

export const assertTriggerRunRejected = async (
  page: Page,
  setup: ProductTriggerHarness
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
