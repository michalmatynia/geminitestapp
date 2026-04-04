import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  checkBaseSkuExistsMock,
  getExportWarehouseIdMock,
  resolveBaseConnectionTokenMock,
  getPathRunRepositoryMock,
  captureExceptionMock,
  loadExportResourcesMock,
  prepareBaseExportMappingsAndProductMock,
  resolveListingForExportMock,
  verifySkuUniquenessMock,
  resolveWarehouseAndStockMappingsMock,
  executeBaseExportMock,
  isBaseImageErrorMock,
  productRepoUpdateProductMock,
} = vi.hoisted(() => ({
  checkBaseSkuExistsMock: vi.fn(),
  getExportWarehouseIdMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
  getPathRunRepositoryMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  loadExportResourcesMock: vi.fn(),
  prepareBaseExportMappingsAndProductMock: vi.fn(),
  resolveListingForExportMock: vi.fn(),
  verifySkuUniquenessMock: vi.fn(),
  resolveWarehouseAndStockMappingsMock: vi.fn(),
  executeBaseExportMock: vi.fn(),
  isBaseImageErrorMock: vi.fn(),
  productRepoUpdateProductMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  checkBaseSkuExists: (...args: unknown[]) => checkBaseSkuExistsMock(...args),
  getExportWarehouseId: (...args: unknown[]) => getExportWarehouseIdMock(...args),
  resolveBaseConnectionToken: (...args: unknown[]) => resolveBaseConnectionTokenMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: (...args: unknown[]) => getPathRunRepositoryMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

vi.mock('@/features/integrations/services/base-export-segments', () => ({
  loadExportResources: (...args: unknown[]) => loadExportResourcesMock(...args),
  prepareBaseExportMappingsAndProduct: (...args: unknown[]) =>
    prepareBaseExportMappingsAndProductMock(...args),
  resolveListingForExport: (...args: unknown[]) => resolveListingForExportMock(...args),
  verifySkuUniqueness: (...args: unknown[]) => verifySkuUniquenessMock(...args),
  resolveWarehouseAndStockMappings: (...args: unknown[]) =>
    resolveWarehouseAndStockMappingsMock(...args),
  executeBaseExport: (...args: unknown[]) => executeBaseExportMock(...args),
  isBaseImageError: (...args: unknown[]) => isBaseImageErrorMock(...args),
}));

import { processBaseExportJob } from './baseExportProcessor';

describe('processBaseExportJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkBaseSkuExistsMock.mockResolvedValue({ exists: false, productId: null });
    getExportWarehouseIdMock.mockResolvedValue('warehouse-1');
    resolveBaseConnectionTokenMock.mockReturnValue({ token: 'base-token' });
    getPathRunRepositoryMock.mockResolvedValue({
      updateRunIfStatus: vi.fn().mockResolvedValue({ id: 'run-1', status: 'running' }),
      createRunEvent: vi.fn().mockResolvedValue(undefined),
      updateRun: vi.fn().mockResolvedValue(undefined),
    });
    loadExportResourcesMock.mockResolvedValue({
      product: {
        id: 'product-1',
        sku: 'SKU-001',
        baseProductId: null,
        categoryId: null,
      },
      connection: {
        id: 'connection-base-1',
        integrationId: 'integration-base-1',
        baseApiToken: 'base-token',
      },
      integrations: [{ id: 'integration-base-1', slug: 'base-com' }],
      primaryListingRepo: {},
      productRepo: {
        updateProduct: (...args: unknown[]) => productRepoUpdateProductMock(...args),
      },
    });
    prepareBaseExportMappingsAndProductMock.mockResolvedValue({
      mappings: {},
      resolvedTemplateId: 'template-1',
      requestedTemplateId: 'template-1',
      exportProduct: {
        id: 'product-1',
        sku: 'SKU-001',
      },
      exportImagesAsBase64: false,
      imageBase64Mode: null,
      imageTransform: null,
      producerNameById: {},
      producerExternalIdByInternalId: {},
      tagNameById: {},
      tagExternalIdByInternalId: {},
    });
    resolveListingForExportMock.mockResolvedValue({
      listingRepo: {
        updateListingExternalId: vi.fn(),
        updateListingStatus: vi.fn(),
        appendExportHistory: vi.fn(),
      },
      listingId: null,
      listingExternalId: null,
      listingInventoryId: null,
    });
    verifySkuUniquenessMock.mockResolvedValue(undefined);
    resolveWarehouseAndStockMappingsMock.mockResolvedValue({
      warehouseId: 'warehouse-1',
      effectiveMappings: {},
      stockWarehouseAliases: null,
    });
    executeBaseExportMock.mockResolvedValue({
      result: { success: true, productId: 'base-123' },
      exportFields: null,
      finalWarehouseId: 'warehouse-1',
      finalMappings: {},
    });
    isBaseImageErrorMock.mockReturnValue(false);
    productRepoUpdateProductMock.mockResolvedValue(undefined);
  });

  it('marks the run running when the worker actually starts processing', async () => {
    await processBaseExportJob(
      {
        productId: 'product-1',
        connectionId: 'connection-base-1',
        inventoryId: 'inventory-main',
        templateId: 'template-1',
        imagesOnly: false,
        listingId: null,
        externalListingId: null,
        allowDuplicateSku: false,
        exportImagesAsBase64: null,
        imageBase64Mode: null,
        imageTransform: null,
        imageBaseUrl: 'https://localhost:3000',
        requestId: 'request-123',
        runId: 'run-1',
        userId: 'user-1',
      },
      'job-1'
    );

    const runRepository = await getPathRunRepositoryMock.mock.results[0]?.value;

    expect(runRepository.updateRunIfStatus).toHaveBeenCalledWith(
      'run-1',
      ['queued'],
      expect.objectContaining({
        status: 'running',
        startedAt: expect.any(String),
      })
    );
    expect(runRepository.createRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        level: 'info',
        message: 'Export to Base.com started.',
        metadata: expect.objectContaining({
          productId: 'product-1',
          connectionId: 'connection-base-1',
          inventoryId: 'inventory-main',
          requestId: 'request-123',
          jobId: 'job-1',
        }),
      })
    );
  });
});
