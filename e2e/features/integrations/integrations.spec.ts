import { expect, test, type Page } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';

const TIMESTAMP = '2026-03-27T10:00:00.000Z';

const integrations = [
  {
    id: 'integration-tradera',
    name: 'Tradera',
    description: null,
    slug: 'tradera',
    credentials: {},
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  },
  {
    id: 'integration-allegro',
    name: 'Allegro',
    description: null,
    slug: 'allegro',
    credentials: {},
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  },
  {
    id: 'integration-baselinker',
    name: 'Baselinker',
    description: null,
    slug: 'baselinker',
    credentials: {},
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  },
];

const baselinkerConnections = [
  {
    id: 'conn-1',
    integrationId: 'integration-baselinker',
    name: 'Primary Base',
    description: null,
    username: 'primary@example.com',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    hasBaseApiToken: true,
    baseTokenUpdatedAt: TIMESTAMP,
    baseLastInventoryId: 'inventory-1',
  },
  {
    id: 'conn-2',
    integrationId: 'integration-baselinker',
    name: 'Secondary Base',
    description: null,
    username: 'secondary@example.com',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    hasBaseApiToken: true,
    baseTokenUpdatedAt: TIMESTAMP,
    baseLastInventoryId: 'inventory-2',
  },
];

const mockIntegrationsAdminApis = async (
  page: Page,
  options?: {
    onQuickImport?: (payload: Record<string, unknown>) => void;
    onPreview?: (payload: Record<string, unknown>) => void;
  }
): Promise<void> => {
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

  await page.route(/\/api\/settings(?:\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([{ key: 'base_sync_poll_interval_minutes', value: '10' }]),
    });
  });

  await page.route('**/api/v2/integrations/with-connections', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(
        integrations.map((integration) => ({
          ...integration,
          connections:
            integration.id === 'integration-baselinker'
              ? baselinkerConnections.map((connection) => ({
                  id: connection.id,
                  name: connection.name,
                  integrationId: connection.integrationId,
                }))
              : [],
        }))
      ),
    });
  });

  await page.route(/\/api\/v2\/integrations$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(integrations),
    });
  });

  await page.route('**/api/v2/integrations/integration-baselinker/connections', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(baselinkerConnections),
    });
  });

  await page.route('**/api/v2/integrations/exports/base/default-connection', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ connectionId: 'conn-1' }),
    });
  });

  await page.route('**/api/v2/products/orders-import/quick-import', async (route) => {
    const payload = (route.request().postDataJSON() as Record<string, unknown> | null) ?? {};
    options?.onQuickImport?.(payload);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        preview: {
          orders: [
            {
              baseOrderId: 'order-1',
              orderNumber: 'BL-1001',
              externalStatusId: 'new',
              externalStatusName: 'New',
              buyerName: 'Ada Lovelace',
              buyerEmail: 'ada@example.com',
              currency: 'PLN',
              totalGross: 149.99,
              deliveryMethod: 'Courier',
              paymentMethod: 'Card',
              source: 'Base.com',
              orderCreatedAt: TIMESTAMP,
              orderUpdatedAt: TIMESTAMP,
              lineItems: [
                {
                  sku: 'SKU-1',
                  name: 'Learning Blocks',
                  quantity: 1,
                  unitPriceGross: 149.99,
                  baseProductId: 'base-product-1',
                },
              ],
              fingerprint: 'fp-order-1',
              raw: {},
              importState: 'imported',
              lastImportedAt: TIMESTAMP,
            },
          ],
          stats: {
            total: 1,
            newCount: 0,
            importedCount: 1,
            changedCount: 0,
          },
        },
        importableCount: 1,
        skippedImportedCount: 0,
        importedCount: 1,
        createdCount: 1,
        updatedCount: 0,
        syncedAt: TIMESTAMP,
        results: [{ baseOrderId: 'order-1', result: 'created' }],
      }),
    });
  });

  await page.route(/\/api\/v2\/products\/orders-import\/statuses(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        statuses: [{ id: 'new', name: 'New' }],
      }),
    });
  });

  await page.route('**/api/v2/products/orders-import/preview', async (route) => {
    const payload = (route.request().postDataJSON() as Record<string, unknown> | null) ?? {};
    options?.onPreview?.(payload);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        orders: [
          {
            baseOrderId: 'order-2',
            orderNumber: 'BL-2001',
            externalStatusId: 'new',
            externalStatusName: 'New',
            buyerName: 'Grace Hopper',
            buyerEmail: 'grace@example.com',
            currency: 'PLN',
            totalGross: 89.5,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base.com',
            orderCreatedAt: TIMESTAMP,
            orderUpdatedAt: TIMESTAMP,
            lineItems: [
              {
                sku: 'SKU-2',
                name: 'Geometry cards',
                quantity: 1,
                unitPriceGross: 89.5,
                baseProductId: 'base-product-2',
              },
            ],
            fingerprint: 'fp-order-2',
            raw: {},
            importState: 'new',
            lastImportedAt: null,
          },
        ],
        stats: {
          total: 1,
          newCount: 1,
          importedCount: 0,
          changedCount: 0,
        },
      }),
    });
  });
};

test.describe('Integrations', () => {
  test('displays the integrations list and opens the Baselinker modal', async ({ page }) => {
    test.setTimeout(240_000);
    await mockIntegrationsAdminApis(page);
    await ensureAdminSession(page, '/admin/integrations', {
      destinationNavigationTimeoutMs: 120_000,
      transitionTimeoutMs: 30_000,
    });

    await expect(page.getByText('Tradera')).toBeVisible();
    await expect(page.getByText('Allegro')).toBeVisible();
    await expect(page.getByText('Baselinker')).toBeVisible();

    await page.getByRole('button', { name: 'Manage Baselinker settings' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Connections' })).toBeVisible();
    await expect(page.getByText('Primary Base')).toBeVisible();
    await expect(page.getByText('Secondary Base')).toBeVisible();
  });

  test('quick imports orders for the currently edited Baselinker connection', async ({ page }) => {
    test.setTimeout(240_000);
    let quickImportPayload: Record<string, unknown> | null = null;
    await mockIntegrationsAdminApis(page, {
      onQuickImport: (payload) => {
        quickImportPayload = payload;
      },
    });

    await ensureAdminSession(page, '/admin/integrations', {
      destinationNavigationTimeoutMs: 120_000,
      transitionTimeoutMs: 30_000,
    });

    await page.getByRole('button', { name: 'Manage Baselinker settings' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).nth(1).click();
    await expect(page.getByRole('dialog', { name: /Edit connection/i })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('tab', { name: 'Settings' }).click();
    await expect(page.getByText('inventory-2')).toBeVisible();

    await page.getByRole('button', { name: 'Import Latest Orders' }).click();

    await expect
      .poll(() => quickImportPayload, {
        timeout: 30_000,
      })
      .toEqual({
        connectionId: 'conn-2',
        limit: 50,
      });

    await expect(page.getByText('Latest order import')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open detailed importer' })).toBeVisible();
  });

  test('opens the detailed importer with the same connection and auto previews once', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    let previewPayload: Record<string, unknown> | null = null;
    await mockIntegrationsAdminApis(page, {
      onPreview: (payload) => {
        previewPayload = payload;
      },
    });

    await ensureAdminSession(page, '/admin/integrations', {
      destinationNavigationTimeoutMs: 120_000,
      transitionTimeoutMs: 30_000,
    });

    await page.getByRole('button', { name: 'Manage Baselinker settings' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).nth(1).click();
    await expect(page.getByRole('dialog', { name: /Edit connection/i })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('tab', { name: 'Settings' }).click();
    await expect(page.getByText('inventory-2')).toBeVisible();

    await page.getByRole('button', { name: 'Import Latest Orders' }).click();
    await expect(page.getByText('Latest order import')).toBeVisible();

    const detailedImporterLink = page.getByRole('link', { name: 'Open detailed importer' });
    const detailedImporterHref =
      (await detailedImporterLink.getAttribute('href')) ??
      '/admin/products/orders-import?connectionId=conn-2&autoPreview=1';
    await expect(detailedImporterLink).toHaveAttribute(
      'href',
      '/admin/products/orders-import?connectionId=conn-2&autoPreview=1'
    );

    await page.goto(detailedImporterHref);

    await expect(page).toHaveURL(
      /\/admin\/products\/orders-import\?connectionId=conn-2&autoPreview=1$/
    );
    await expect(page.getByRole('heading', { name: 'Orders Import' })).toBeVisible();
    await expect
      .poll(() => previewPayload, {
        timeout: 30_000,
      })
      .toEqual({
        connectionId: 'conn-2',
        limit: 50,
      });
    await expect(
      page.getByText('Loaded 1 orders. 1 new, 0 changed, 0 already imported.')
    ).toBeVisible();
  });
});
