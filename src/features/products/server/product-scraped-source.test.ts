import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createConnection: vi.fn(),
  createListing: vi.fn(),
  decryptSecret: vi.fn(),
  getConnectionById: vi.fn(),
  getListingsByProductId: vi.fn(),
  getProductById: vi.fn(),
  listConnections: vi.fn(),
  startPlaywrightConnectionEngineTask: vi.fn(),
  updateListing: vi.fn(),
  upsertIntegration: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: () => ({
    createConnection: mocks.createConnection,
    getConnectionById: mocks.getConnectionById,
    listConnections: mocks.listConnections,
    upsertIntegration: mocks.upsertIntegration,
  }),
  getProductListingRepository: async () => ({
    createListing: mocks.createListing,
    getListingsByProductId: mocks.getListingsByProductId,
    updateListing: mocks.updateListing,
  }),
}));

vi.mock('@/features/playwright/server', () => ({
  startPlaywrightConnectionEngineTask: mocks.startPlaywrightConnectionEngineTask,
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductById: mocks.getProductById,
  },
}));

vi.mock('@/shared/lib/security/encryption', () => ({
  decryptSecret: mocks.decryptSecret,
}));

vi.mock('./product-scraped-source-purchase-script', () => ({
  SCRAPED_SOURCE_PURCHASE_SCRIPT: 'export default async () => ({ ok: true });',
}));

import { runScrapedSourcePurchase } from './product-scraped-source';

const product = {
  id: 'product-1',
  sku: 'BATTLESTOCK-13007',
  name: '40k eldar falcon',
  name_pl: '40k eldar falcon',
  name_en: null,
  importSource: 'scrape',
  supplierName: 'BattleStock',
  supplierLink: 'https://www.battle-stock.pl/pl/p/40k-eldar-falcon/13007',
};

const integration = {
  id: 'integration-scraped',
  name: 'Scraped Source',
  slug: 'scraped-source',
};

const connection = {
  id: 'connection-battlestock',
  integrationId: integration.id,
  name: 'BattleStock',
  username: 'buyer@example.com',
  password: 'encrypted-password',
};

const createdListing = {
  id: 'listing-scraped',
  productId: product.id,
  integrationId: integration.id,
  connectionId: connection.id,
  externalListingId: product.supplierLink,
  inventoryId: null,
  status: 'linked',
  listedAt: null,
  expiresAt: null,
  nextRelistAt: null,
  lastRelistedAt: null,
  lastStatusCheckAt: null,
  marketplaceData: null,
  failureReason: null,
  exportHistory: [],
  integration,
  connection: {
    id: connection.id,
    name: connection.name,
  },
};

describe('product scraped source purchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProductById.mockResolvedValue(product);
    mocks.upsertIntegration.mockResolvedValue(integration);
    mocks.listConnections.mockResolvedValue([connection]);
    mocks.getConnectionById.mockResolvedValue(connection);
    mocks.getListingsByProductId.mockResolvedValue([]);
    mocks.createListing.mockResolvedValue(createdListing);
    mocks.decryptSecret.mockReturnValue('plain-password');
    mocks.startPlaywrightConnectionEngineTask.mockResolvedValue({
      run: {
        runId: 'run-purchase-1',
        status: 'queued',
      },
      runtime: {},
      settings: {},
      browserPreference: 'auto',
    });
  });

  it('starts a headed Playwright purchase run for a scraped product source', async () => {
    const response = await runScrapedSourcePurchase(product.id);

    expect(mocks.startPlaywrightConnectionEngineTask).toHaveBeenCalledWith(
      expect.objectContaining({
        connection,
        browserBehaviorOwner: 'action',
        request: expect.objectContaining({
          actionName: 'Scraped Source Purchase',
          browserEngine: 'chromium',
          startUrl: product.supplierLink,
          preventNewPages: true,
          policyAllowedHosts: ['www.battle-stock.pl'],
          input: expect.objectContaining({
            productId: product.id,
            listingId: createdListing.id,
            sourceUrl: product.supplierLink,
            username: connection.username,
            password: 'plain-password',
            submitOrder: false,
          }),
        }),
      })
    );
    const taskInput = mocks.startPlaywrightConnectionEngineTask.mock.calls[0]?.[0] as {
      resolveEngineRequestConfig: (runtime: {
        settings: Record<string, unknown>;
        browserPreference: string;
      }) => { settings: Record<string, unknown>; browserPreference: string };
    };
    expect(
      taskInput.resolveEngineRequestConfig({
        settings: { headless: true },
        browserPreference: 'auto',
      }).settings
    ).toMatchObject({ headless: false });
    expect(mocks.updateListing).toHaveBeenCalledWith(
      createdListing.id,
      expect.objectContaining({
        status: 'purchase_queued',
        marketplaceData: expect.objectContaining({
          purchase: expect.objectContaining({
            mode: 'playwright_manual_review',
            runId: 'run-purchase-1',
            submitOrder: false,
          }),
        }),
      })
    );
    expect(response).toMatchObject({
      productId: product.id,
      listingId: createdListing.id,
      status: 'purchase_queued',
      runId: 'run-purchase-1',
      actionRunUrl: '/admin/playwright/action-runs?runId=run-purchase-1',
    });
  });
});
