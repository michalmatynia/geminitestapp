import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  readPlaywrightEngineRunMock: vi.fn(),
  collectPlaywrightEngineRunFailureMessagesMock: vi.fn(),
  buildPlaywrightEngineRunFailureMetaMock: vi.fn(),
  resolvePlaywrightEngineRunOutputsMock: vi.fn(),
  startPlaywrightEngineTaskMock: vi.fn(),
  createCustomPlaywrightInstanceMock: vi.fn(),
  invalidateProductMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  updateProductMock: vi.fn(),
  findLatestActiveProductScanMock: vi.fn(),
  getProductScanByIdMock: vi.fn(),
  listProductScansMock: vi.fn(),
  updateProductScanMock: vi.fn(),
  upsertProductScanMock: vi.fn(),
}));

vi.mock('@/features/playwright/server', () => ({
  buildPlaywrightEngineRunFailureMeta: (...args: unknown[]) =>
    mocks.buildPlaywrightEngineRunFailureMetaMock(...args),
  collectPlaywrightEngineRunFailureMessages: (...args: unknown[]) =>
    mocks.collectPlaywrightEngineRunFailureMessagesMock(...args),
  createCustomPlaywrightInstance: (...args: unknown[]) =>
    mocks.createCustomPlaywrightInstanceMock(...args),
  readPlaywrightEngineRun: (...args: unknown[]) => mocks.readPlaywrightEngineRunMock(...args),
  resolvePlaywrightEngineRunOutputs: (...args: unknown[]) =>
    mocks.resolvePlaywrightEngineRunOutputsMock(...args),
  startPlaywrightEngineTask: (...args: unknown[]) => mocks.startPlaywrightEngineTaskMock(...args),
}));

vi.mock('@/features/products/performance/cached-service', () => ({
  CachedProductService: {
    invalidateProduct: (...args: unknown[]) => mocks.invalidateProductMock(...args),
  },
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductById: (...args: unknown[]) => mocks.getProductByIdMock(...args),
    updateProduct: (...args: unknown[]) => mocks.updateProductMock(...args),
  },
}));

vi.mock('./product-scans-repository', () => ({
  findLatestActiveProductScan: (...args: unknown[]) =>
    mocks.findLatestActiveProductScanMock(...args),
  getProductScanById: (...args: unknown[]) => mocks.getProductScanByIdMock(...args),
  listProductScans: (...args: unknown[]) => mocks.listProductScansMock(...args),
  updateProductScan: (...args: unknown[]) => mocks.updateProductScanMock(...args),
  upsertProductScan: (...args: unknown[]) => mocks.upsertProductScanMock(...args),
}));

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  queueAmazonBatchProductScans,
  synchronizeProductScan,
} from './product-scans-service';

const createScan = (overrides: Partial<ProductScanRecord> = {}): ProductScanRecord => ({
  id: 'scan-1',
  productId: 'product-1',
  provider: 'amazon',
  scanType: 'google_reverse_image',
  status: 'queued',
  productName: 'Product 1',
  engineRunId: 'run-1',
  imageCandidates: [
    {
      id: 'image-1',
      filepath: '/tmp/product-1.jpg',
      url: 'https://cdn.example.com/product-1.jpg',
      filename: 'product-1.jpg',
    },
  ],
  matchedImageId: null,
  asin: null,
  title: null,
  price: null,
  url: null,
  description: null,
  rawResult: null,
  error: null,
  asinUpdateStatus: 'pending',
  asinUpdateMessage: null,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  completedAt: null,
  createdAt: '2026-04-11T04:00:00.000Z',
  updatedAt: '2026-04-11T04:00:00.000Z',
  ...overrides,
});

describe('product-scans-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collectPlaywrightEngineRunFailureMessagesMock.mockReturnValue([
      'Amazon reverse image scan failed.',
    ]);
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({ reason: 'failed' });
    mocks.createCustomPlaywrightInstanceMock.mockReturnValue({
      family: 'scrape',
      label: 'Amazon reverse image ASIN scan',
    });
    mocks.updateProductScanMock.mockImplementation(
      async (id: string, updates: Partial<ProductScanRecord>) => ({
        ...createScan({ id }),
        ...updates,
        id,
      })
    );
    mocks.upsertProductScanMock.mockImplementation(async (scan: ProductScanRecord) => scan);
  });

  it('fills a missing ASIN from a completed Amazon scan result', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'b00test123',
        title: 'Amazon title',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Amazon description',
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
    });
    mocks.updateProductMock.mockResolvedValue({ id: 'product-1', asin: 'B00TEST123' });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      { asin: 'B00TEST123' },
      { userId: 'user-1' }
    );
    expect(mocks.invalidateProductMock).toHaveBeenCalledWith('product-1');
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'completed',
        asin: 'B00TEST123',
        asinUpdateStatus: 'updated',
        asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
        error: null,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'completed',
        asin: 'B00TEST123',
        asinUpdateStatus: 'updated',
      })
    );
  });

  it('marks conflicting ASIN results without overwriting the product', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'B00TEST999',
        title: 'Amazon title',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST999',
        description: 'Amazon description',
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST999',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: 'B00TEST123',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(mocks.invalidateProductMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'conflict',
        asin: 'B00TEST999',
        asinUpdateStatus: 'conflict',
        error: 'Detected ASIN B00TEST999 differs from existing ASIN B00TEST123.',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'conflict',
        asinUpdateStatus: 'conflict',
      })
    );
  });

  it('stores no_match results without attempting an ASIN update', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'no_match',
        asin: null,
        title: null,
        price: null,
        url: null,
        description: null,
        matchedImageId: null,
        message: 'Google reverse image search did not return a usable Amazon result.',
      },
      finalUrl: 'https://lens.google.com/',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.getProductByIdMock).not.toHaveBeenCalled();
    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'no_match',
        url: 'https://lens.google.com/',
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage:
          'Google reverse image search did not return a usable Amazon result.',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'no_match',
        asinUpdateStatus: 'not_needed',
      })
    );
  });

  it('stores failed engine runs with failure metadata', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'failed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: null,
    });
    mocks.collectPlaywrightEngineRunFailureMessagesMock.mockReturnValue([
      'Engine run failed before producing a result.',
    ]);
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({
      reason: 'Engine run failed before producing a result.',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'failed',
        error: 'Engine run failed before producing a result.',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'Engine run failed before producing a result.',
        rawResult: {
          reason: 'Engine run failed before producing a result.',
        },
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        asinUpdateStatus: 'failed',
      })
    );
  });

  it('fails active scans whose Playwright engine run can no longer be found', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue(null);

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'failed',
        error: 'Playwright engine run run-1 was not found.',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'Playwright engine run run-1 was not found.',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        asinUpdateStatus: 'failed',
      })
    );
  });

  it('marks the scan failed when updating the product ASIN throws', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'B00TEST123',
        title: 'Amazon title',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Amazon description',
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
    });
    mocks.updateProductMock.mockRejectedValue(new Error('database write failed'));

    const result = await synchronizeProductScan(scan);

    expect(mocks.invalidateProductMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'failed',
        asin: 'B00TEST123',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'database write failed',
        error: 'database write failed',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        asinUpdateStatus: 'failed',
      })
    );
  });

  it('returns already_running when an active scan is still running for the product', async () => {
    const activeScan = createScan({ status: 'queued' });

    mocks.findLatestActiveProductScanMock.mockResolvedValue(activeScan);
    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
    });
    mocks.updateProductScanMock.mockImplementation(
      async (id: string, updates: Partial<ProductScanRecord>) => ({
        ...activeScan,
        ...updates,
        id,
      })
    );

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.getProductByIdMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      queued: 0,
      alreadyRunning: 1,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'already_running',
          message: 'Amazon scan already in progress for this product.',
        },
      ],
    });
  });

  it('queues a new Amazon reverse-image scan with image candidates', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-1',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: [' product-1 ', 'product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 'user-1',
        instance: expect.objectContaining({
          family: 'scrape',
          label: 'Amazon reverse image ASIN scan',
        }),
        request: expect.objectContaining({
          browserEngine: 'chromium',
          timeoutMs: 180000,
          preventNewPages: true,
          input: expect.objectContaining({
            productId: 'product-1',
            productName: 'Product 1',
            existingAsin: null,
            imageCandidates: [
              expect.objectContaining({
                id: 'image-1',
                filepath: '/tmp/product-1.jpg',
                url: 'https://cdn.example.com/product-1.jpg',
              }),
            ],
          }),
        }),
      })
    );
    expect(result).toEqual({
      queued: 1,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-queued-1',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
  });

  it('returns a failed batch result when the product has no usable images', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [],
      imageLinks: [],
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      queued: 0,
      alreadyRunning: 0,
      failed: 1,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: null,
          status: 'failed',
          message: 'No product image available for Amazon reverse image scan.',
        },
      ],
    });
  });

  it('returns a failed batch result when enqueueing the Playwright run throws', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockRejectedValue(
      new Error('playwright engine unavailable')
    );

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result).toEqual({
      queued: 0,
      alreadyRunning: 0,
      failed: 1,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: null,
          status: 'failed',
          message: 'playwright engine unavailable',
        },
      ],
    });
  });

  it('re-enqueues a fresh scan when the previous active run record is missing', async () => {
    const activeScan = createScan({ status: 'queued' });

    mocks.findLatestActiveProductScanMock.mockResolvedValue(activeScan);
    mocks.readPlaywrightEngineRunMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-2',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'failed',
        error: 'Playwright engine run run-1 was not found.',
      })
    );
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      queued: 1,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-queued-2',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
  });

  it('queues a scan from imageLinks when no image file records exist', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [],
      imageLinks: ['https://cdn.example.com/link-only.jpg'],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-link-only',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            imageCandidates: [
              expect.objectContaining({
                filepath: null,
                url: 'https://cdn.example.com/link-only.jpg',
              }),
            ],
          }),
        }),
      })
    );
    expect(result).toEqual({
      queued: 1,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-queued-link-only',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
  });

  it('returns a per-product failure when one product lookup throws and still queues the rest', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockImplementation(async (productId: string) => {
      if (productId === 'product-1') {
        throw new Error('database temporarily unavailable');
      }

      return {
        id: productId,
        asin: null,
        name_en: 'Product 2',
        name_pl: null,
        name_de: null,
        sku: 'SKU-2',
        images: [
          {
            imageFileId: 'image-2',
            imageFile: {
              id: 'image-2',
              filepath: '/tmp/product-2.jpg',
              publicUrl: 'https://cdn.example.com/product-2.jpg',
              filename: 'product-2.jpg',
            },
          },
        ],
        imageLinks: [],
      };
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-3',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1', 'product-2'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      queued: 1,
      alreadyRunning: 0,
      failed: 1,
      results: [
        {
          productId: 'product-1',
          scanId: null,
          runId: null,
          status: 'failed',
          message: 'database temporarily unavailable',
        },
        {
          productId: 'product-2',
          scanId: expect.any(String),
          runId: 'run-queued-3',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
  });
});
