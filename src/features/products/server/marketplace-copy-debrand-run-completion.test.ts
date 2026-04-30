import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  emitProductCacheInvalidationMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarningMock: vi.fn(),
  updateProductMock: vi.fn(),
}));

vi.mock('@/shared/events/products', () => ({
  emitProductCacheInvalidation: (...args: unknown[]) =>
    mocks.emitProductCacheInvalidationMock(...args),
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductById: (...args: unknown[]) => mocks.getProductByIdMock(...args),
    updateProduct: (...args: unknown[]) => mocks.updateProductMock(...args),
  },
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
    logInfo: (...args: unknown[]) => mocks.logInfoMock(...args),
    logWarning: (...args: unknown[]) => mocks.logWarningMock(...args),
  },
}));

import { persistMarketplaceCopyDebrandBatchRunResult } from './marketplace-copy-debrand-run-completion';

const buildBatchMeta = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({
  source: 'product_marketplace_copy_debrand_batch',
  serverMetadata: {
    source: 'marketplace-copy-debrand-batch',
    integrationId: 'integration-allegro',
    rowIndex: 0,
  },
  ...patch,
});

describe('persistMarketplaceCopyDebrandBatchRunResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logInfoMock.mockResolvedValue(undefined);
    mocks.logWarningMock.mockResolvedValue(undefined);
    mocks.captureExceptionMock.mockResolvedValue(undefined);
    mocks.updateProductMock.mockResolvedValue({ id: 'product-1' });
  });

  it('persists generated copy to the matching marketplace row by integration id', async () => {
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      marketplaceContentOverrides: [
        {
          integrationIds: ['integration-other'],
          title: 'Other title',
          description: 'Other description',
        },
        {
          integrationIds: ['integration-allegro'],
          title: 'Old title',
          description: 'Old description',
        },
      ],
    });

    const outcome = await persistMarketplaceCopyDebrandBatchRunResult({
      run: {
        id: 'run-1',
        entityId: 'product-1',
        userId: 'user-1',
        triggerContext: null,
      },
      runMeta: buildBatchMeta(),
      runtimeState: { nodeOutputs: {} },
      accOutputs: {
        'node-model': {
          debrandedTitle: 'Neutral marketplace title',
          debrandedDescription: 'Neutral marketplace description',
        },
      },
    });

    expect(outcome).toEqual({
      applied: true,
      reason: 'applied',
      productId: 'product-1',
      rowIndex: 1,
    });
    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      {
        marketplaceContentOverrides: [
          {
            integrationIds: ['integration-other'],
            title: 'Other title',
            description: 'Other description',
          },
          {
            integrationIds: ['integration-allegro'],
            title: 'Neutral marketplace title',
            description: 'Neutral marketplace description',
          },
        ],
      },
      { userId: 'user-1' }
    );
    expect(mocks.emitProductCacheInvalidationMock).toHaveBeenCalledTimes(1);
  });

  it('persists generated copy for single-row Redis runtime debrand runs', async () => {
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      marketplaceContentOverrides: [
        {
          integrationIds: ['integration-allegro'],
          title: null,
          description: null,
        },
      ],
    });

    const outcome = await persistMarketplaceCopyDebrandBatchRunResult({
      run: {
        id: 'run-row-1',
        entityId: 'product-1',
        userId: null,
        triggerContext: null,
      },
      runMeta: {
        source: 'product_marketplace_copy_debrand_row',
        serverMetadata: {
          source: 'marketplace-copy-debrand-row',
          integrationId: 'integration-allegro',
          rowIndex: 0,
        },
      },
      runtimeState: { nodeOutputs: {} },
      accOutputs: {
        'node-model': {
          debrandedTitle: 'Row runtime title',
          debrandedDescription: 'Row runtime description',
        },
      },
    });

    expect(outcome).toEqual({
      applied: true,
      reason: 'applied',
      productId: 'product-1',
      rowIndex: 0,
    });
    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      {
        marketplaceContentOverrides: [
          {
            integrationIds: ['integration-allegro'],
            title: 'Row runtime title',
            description: 'Row runtime description',
          },
        ],
      },
      undefined
    );
  });

  it('ignores trigger source context when extracting row runtime debrand output', async () => {
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      marketplaceContentOverrides: [
        {
          integrationIds: ['integration-tradera'],
          title: 'Chapter Insignia | 5 cm | Metal | Gaming Pin | Sci-Fi Theme',
          description: null,
        },
      ],
    });

    const outcome = await persistMarketplaceCopyDebrandBatchRunResult({
      run: {
        id: 'run-row-1',
        entityId: 'product-1',
        userId: null,
        triggerContext: null,
      },
      runMeta: {
        source: 'product_marketplace_copy_debrand_row',
        serverMetadata: {
          source: 'marketplace-copy-debrand-row',
          integrationId: 'integration-tradera',
          rowIndex: 0,
        },
      },
      runtimeState: {
        history: {
          'node-parser': [{ nodeId: 'node-parser', nodeType: 'parser', nodeTitle: 'JSON Parser' }],
          'node-regex': [{ nodeId: 'node-regex', nodeType: 'regex', nodeTitle: 'Regex JSON Extract' }],
          'node-trigger': [
            { nodeId: 'node-trigger', nodeType: 'trigger', nodeTitle: 'Trigger: Debrand' },
          ],
        },
      },
      accOutputs: {
        'node-parser': {
          bundle: {
            sourceEnglishTitle: 'Ultramarines | 5 cm | Metal | Gaming Pin | Warhammer 40k',
            sourceEnglishDescription: 'Original branded product description',
          },
        },
        'node-regex': {
          value: {
            debrandedTitle: 'Chapter Insignia | 5 cm | Metal | Gaming Pin | Sci-Fi Theme',
            debrandedDescription: 'Neutral generated marketplace description',
          },
        },
        'node-trigger': {
          entityJson: {
            marketplaceContentOverrides: [
              {
                integrationIds: ['integration-tradera'],
                title: 'Chapter Insignia | 5 cm | Metal | Gaming Pin | Sci-Fi Theme',
                description: '',
              },
            ],
          },
        },
      },
    });

    expect(outcome).toEqual({
      applied: true,
      reason: 'applied',
      productId: 'product-1',
      rowIndex: 0,
    });
    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      {
        marketplaceContentOverrides: [
          {
            integrationIds: ['integration-tradera'],
            title: 'Chapter Insignia | 5 cm | Metal | Gaming Pin | Sci-Fi Theme',
            description: 'Neutral generated marketplace description',
          },
        ],
      },
      undefined
    );
  });

  it('does not persist shipping automation notes as generated marketplace descriptions', async () => {
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      marketplaceContentOverrides: [
        {
          integrationIds: ['integration-tradera'],
          title: 'Old title',
          description: 'Auto-assigned keychain shipping for Tradera listings.',
        },
      ],
    });

    const outcome = await persistMarketplaceCopyDebrandBatchRunResult({
      run: {
        id: 'run-row-1',
        entityId: 'product-1',
        userId: null,
        triggerContext: null,
      },
      runMeta: {
        source: 'product_marketplace_copy_debrand_row',
        serverMetadata: {
          source: 'marketplace-copy-debrand-row',
          integrationId: 'integration-tradera',
          rowIndex: 0,
        },
      },
      runtimeState: { nodeOutputs: {} },
      accOutputs: {
        'node-model': {
          debrandedTitle: 'Neutral keychain title',
          debrandedDescription: 'Auto-assigned keychain shipping for Tradera listings.',
        },
      },
    });

    expect(outcome).toEqual({
      applied: true,
      reason: 'applied',
      productId: 'product-1',
      rowIndex: 0,
    });
    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      {
        marketplaceContentOverrides: [
          {
            integrationIds: ['integration-tradera'],
            title: 'Neutral keychain title',
            description: null,
          },
        ],
      },
      undefined
    );
  });

  it('appends a missing target row using trigger context integration ids', async () => {
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      marketplaceContentOverrides: [],
    });

    const outcome = await persistMarketplaceCopyDebrandBatchRunResult({
      run: {
        id: 'run-1',
        entityId: 'product-1',
        userId: null,
        triggerContext: {
          extras: {
            marketplaceCopyDebrandInput: {
              targetRow: {
                index: 0,
                integrationIds: ['integration-allegro'],
              },
            },
          },
        },
      },
      runMeta: buildBatchMeta({
        serverMetadata: { source: 'marketplace-copy-debrand-batch' },
      }),
      runtimeState: {
        nodeOutputs: {
          'node-output': {
            result: {
              title: 'Fallback neutral title',
              description: 'Fallback neutral description',
            },
          },
        },
      },
      accOutputs: {},
    });

    expect(outcome).toEqual({
      applied: true,
      reason: 'applied',
      productId: 'product-1',
      rowIndex: 0,
    });
    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      {
        marketplaceContentOverrides: [
          {
            integrationIds: ['integration-allegro'],
            title: 'Fallback neutral title',
            description: 'Fallback neutral description',
          },
        ],
      },
      undefined
    );
  });

  it('does not touch products for unrelated completed runs', async () => {
    const outcome = await persistMarketplaceCopyDebrandBatchRunResult({
      run: {
        id: 'run-1',
        entityId: 'product-1',
        userId: null,
        triggerContext: null,
      },
      runMeta: { source: 'other' },
      runtimeState: { nodeOutputs: {} },
      accOutputs: {},
    });

    expect(outcome).toEqual({
      applied: false,
      reason: 'not_marketplace_copy_debrand_batch',
    });
    expect(mocks.getProductByIdMock).not.toHaveBeenCalled();
    expect(mocks.updateProductMock).not.toHaveBeenCalled();
  });

  it('does not update a product when the completed run has no generated copy', async () => {
    const outcome = await persistMarketplaceCopyDebrandBatchRunResult({
      run: {
        id: 'run-1',
        entityId: 'product-1',
        userId: null,
        triggerContext: null,
      },
      runMeta: buildBatchMeta(),
      runtimeState: { nodeOutputs: {} },
      accOutputs: {
        'node-model': {
          status: 'completed',
        },
      },
    });

    expect(outcome).toEqual({
      applied: false,
      reason: 'missing_generated_copy',
      productId: 'product-1',
    });
    expect(mocks.getProductByIdMock).not.toHaveBeenCalled();
    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(mocks.logWarningMock).toHaveBeenCalledWith(
      'Marketplace copy debrand batch run did not produce copy',
      expect.objectContaining({
        productId: 'product-1',
        runId: 'run-1',
      })
    );
  });
});
