import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getConnectionByIdMock,
  getIntegrationByIdMock,
  updateConnectionMock,
  getByExternalIdMock,
  loadTraderaSystemSettingsMock,
  runPlaywrightListingScriptMock,
} = vi.hoisted(() => ({
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  getByExternalIdMock: vi.fn(),
  loadTraderaSystemSettingsMock: vi.fn(),
  runPlaywrightListingScriptMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: async () => ({
    getConnectionById: (...args: unknown[]) => getConnectionByIdMock(...args),
    getIntegrationById: (...args: unknown[]) => getIntegrationByIdMock(...args),
    updateConnection: (...args: unknown[]) => updateConnectionMock(...args),
  }),
  getExternalCategoryRepository: () => ({
    getByExternalId: (...args: unknown[]) => getByExternalIdMock(...args),
  }),
}));

vi.mock('@/features/integrations/services/tradera-system-settings', () => ({
  loadTraderaSystemSettings: (...args: unknown[]) => loadTraderaSystemSettingsMock(...args),
}));

vi.mock('../playwright-listing/runner', () => ({
  runPlaywrightListingScript: (...args: unknown[]) => runPlaywrightListingScriptMock(...args),
}));

import { fetchAndStoreTraderaParameterMapperCatalog } from './parameter-mapper-catalog';

describe('fetchAndStoreTraderaParameterMapperCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConnectionByIdMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-1',
      name: 'Tradera browser',
      traderaParameterMapperCatalogJson: JSON.stringify({
        version: 1,
        entries: [
          {
            id: '101:condition',
            externalCategoryId: '101',
            externalCategoryName: 'Pins',
            externalCategoryPath: 'Collectibles > Pins',
            fieldLabel: 'Condition',
            fieldKey: 'condition',
            optionLabels: ['Used'],
            source: 'playwright',
            fetchedAt: '2026-04-01T10:00:00.000Z',
            runId: 'run-old',
          },
          {
            id: '202:jewellerymaterial',
            externalCategoryId: '202',
            externalCategoryName: 'Rings',
            externalCategoryPath: 'Jewellery > Rings',
            fieldLabel: 'Jewellery Material',
            fieldKey: 'jewellerymaterial',
            optionLabels: ['Silver'],
            source: 'playwright',
            fetchedAt: '2026-04-01T10:00:00.000Z',
            runId: 'run-other',
          },
        ],
      }),
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      slug: 'tradera',
    });
    getByExternalIdMock.mockResolvedValue({
      id: 'external-category-101',
      connectionId: 'connection-1',
      externalId: '101',
      name: 'Pins',
      path: 'Collectibles > Pins',
    });
    loadTraderaSystemSettingsMock.mockResolvedValue({
      listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
    });
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-123',
      rawResult: {
        entries: [
          {
            fieldLabel: 'Listing format',
            fieldKey: 'listingformat',
            optionLabels: ['Buy now'],
          },
          {
            fieldLabel: 'Delivery',
            fieldKey: 'delivery',
            optionLabels: ['Shipping'],
          },
          {
            fieldLabel: 'Jewellery Material',
            fieldKey: 'jewellerymaterial',
            optionLabels: ['24K', '24K', '18K'],
          },
          {
            fieldLabel: '',
            fieldKey: 'ignored',
            optionLabels: ['Ignored'],
          },
          {
            fieldLabel: 'Jewellery Material',
            fieldKey: 'jewellerymaterial',
            optionLabels: ['24K'],
          },
        ],
      },
    });
    updateConnectionMock.mockResolvedValue(undefined);
  });

  it('fetches Tradera dropdown fields and replaces stored entries only for the selected category', async () => {
    const response = await fetchAndStoreTraderaParameterMapperCatalog({
      connectionId: 'connection-1',
      externalCategoryId: '101',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({
          id: 'connection-1',
        }),
        input: expect.objectContaining({
          startUrl: 'https://www.tradera.com/en/selling/new?categoryId=101',
          externalCategoryId: '101',
        }),
        timeoutMs: 90_000,
        disableStartUrlBootstrap: false,
      })
    );
    const script = runPlaywrightListingScriptMock.mock.calls[0]?.[0]?.script as string | undefined;
    expect(script).toContain("'listing format'");
    expect(script).toContain("'delivery'");

    expect(response).toEqual({
      connectionId: 'connection-1',
      externalCategoryId: '101',
      entries: [
        {
          id: '101:jewellerymaterial',
          externalCategoryId: '101',
          externalCategoryName: 'Pins',
          externalCategoryPath: 'Collectibles > Pins',
          fieldLabel: 'Jewellery Material',
          fieldKey: 'jewellerymaterial',
          optionLabels: ['24K', '18K'],
          source: 'playwright',
          fetchedAt: expect.any(String),
          runId: 'run-123',
        },
      ],
      message: 'Fetched 1 additional Tradera field for Collectibles > Pins.',
    });

    expect(updateConnectionMock).toHaveBeenCalledTimes(1);
    const updatePayload = updateConnectionMock.mock.calls[0]?.[1] as
      | { traderaParameterMapperCatalogJson?: string | null }
      | undefined;
    expect(updatePayload?.traderaParameterMapperCatalogJson).toEqual(expect.any(String));

    const stored = JSON.parse(updatePayload?.traderaParameterMapperCatalogJson ?? '{}') as {
      categoryFetches?: Array<Record<string, unknown>>;
      entries?: Array<Record<string, unknown>>;
    };
    expect(stored.entries).toEqual([
      expect.objectContaining({
        externalCategoryId: '101',
        fieldLabel: 'Jewellery Material',
        optionLabels: ['24K', '18K'],
      }),
      expect.objectContaining({
        externalCategoryId: '202',
        fieldLabel: 'Jewellery Material',
        optionLabels: ['Silver'],
      }),
    ]);
    expect(stored.categoryFetches).toEqual([
      expect.objectContaining({
        externalCategoryId: '101',
        fieldCount: 1,
        runId: 'run-123',
      }),
    ]);
  });

  it('rejects non-Tradera integrations', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      slug: 'allegro',
    });

    await expect(
      fetchAndStoreTraderaParameterMapperCatalog({
        connectionId: 'connection-1',
        externalCategoryId: '101',
      })
    ).rejects.toMatchObject({
      message: 'Tradera parameter mapper is only available for browser Tradera connections.',
      httpStatus: 400,
    });

    expect(runPlaywrightListingScriptMock).not.toHaveBeenCalled();
    expect(updateConnectionMock).not.toHaveBeenCalled();
  });

  it('stores category fetch metadata even when no additional fields are found', async () => {
    runPlaywrightListingScriptMock.mockResolvedValueOnce({
      runId: 'run-empty',
      rawResult: {
        entries: [],
      },
    });

    const response = await fetchAndStoreTraderaParameterMapperCatalog({
      connectionId: 'connection-1',
      externalCategoryId: '101',
    });

    expect(response.entries).toEqual([]);
    expect(response.message).toBe(
      'No additional Tradera dropdown fields were detected for Collectibles > Pins.'
    );

    const updatePayload = updateConnectionMock.mock.calls.at(-1)?.[1] as
      | { traderaParameterMapperCatalogJson?: string | null }
      | undefined;
    const stored = JSON.parse(updatePayload?.traderaParameterMapperCatalogJson ?? '{}') as {
      categoryFetches?: Array<Record<string, unknown>>;
      entries?: Array<Record<string, unknown>>;
    };

    expect(stored.entries).toEqual([
      expect.objectContaining({
        externalCategoryId: '202',
        fieldLabel: 'Jewellery Material',
      }),
    ]);
    expect(stored.categoryFetches).toEqual([
      expect.objectContaining({
        externalCategoryId: '101',
        fieldCount: 0,
        runId: 'run-empty',
      }),
    ]);
  });
});
