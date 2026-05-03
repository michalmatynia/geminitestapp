import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getProductScanByIdMock,
  queueAmazonBatchProductScansMock,
} = vi.hoisted(() => ({
  getProductScanByIdMock: vi.fn(),
  queueAmazonBatchProductScansMock: vi.fn(),
}));

vi.mock('@/features/products/server/product-scans-repository', () => ({
  getProductScanById: (...args: unknown[]) => getProductScanByIdMock(...args),
}));

vi.mock('@/features/products/server/product-scans-service', () => ({
  queueAmazonBatchProductScans: (...args: unknown[]) =>
    queueAmazonBatchProductScansMock(...args),
}));

import {
  postHandler,
  productScanAmazonExtractCandidateRequestSchema,
} from './handler';

describe('products/scans/amazon/extract-candidate handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the extraction handler and request schema', () => {
    expect(typeof postHandler).toBe('function');
    expect(typeof productScanAmazonExtractCandidateRequestSchema.safeParse).toBe('function');
  });

  it('queues a direct Amazon candidate extraction using the stored candidate order', async () => {
    getProductScanByIdMock.mockResolvedValue({
      id: 'scan-1',
      productId: 'product-1',
      provider: 'amazon',
      asin: null,
      amazonDetails: null,
      rawResult: {
        candidateSelectionRequired: true,
        selectorProfile: 'amazon',
        candidateUrls: [
          'https://www.amazon.com/dp/B0002',
          'https://www.amazon.com/dp/B0001',
          'https://www.amazon.com/dp/B0003',
        ],
        candidatePreviews: [
          {
            id: 'cand-2',
            matchedImageId: 'image-2',
            rank: 1,
            url: 'https://www.amazon.com/dp/B0002',
          },
          {
            id: 'cand-1',
            matchedImageId: 'image-1',
            rank: 2,
            url: 'https://www.amazon.com/dp/B0001',
          },
        ],
      },
    });
    queueAmazonBatchProductScansMock.mockResolvedValue({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-2',
          runId: 'run-2',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon candidate extraction queued.',
        },
      ],
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/scans/amazon/extract-candidate', {
        method: 'POST',
      }),
      {
        body: {
          productId: 'product-1',
          scanId: 'scan-1',
          candidateUrl: 'https://www.amazon.com/dp/B0001',
          candidateRank: 99,
          candidateId: 'image-body',
        },
        userId: 'user-42',
      } as ApiHandlerContext
    );

    expect(getProductScanByIdMock).toHaveBeenCalledWith('scan-1');
    expect(queueAmazonBatchProductScansMock).toHaveBeenCalledWith({
      productIds: ['product-1'],
      ownerUserId: 'user-42',
      requestInput: {
        runtimeKey: 'amazon_candidate_extraction',
        selectorProfile: 'amazon',
        triageOnlyOnAmazonCandidates: false,
        collectAmazonCandidatePreviews: false,
        probeOnlyOnAmazonMatch: false,
        skipAmazonProbe: false,
        directAmazonCandidateUrl: 'https://www.amazon.com/dp/B0001',
        directAmazonCandidateUrls: [
          'https://www.amazon.com/dp/B0001',
          'https://www.amazon.com/dp/B0002',
          'https://www.amazon.com/dp/B0003',
        ],
        directMatchedImageId: 'image-1',
        directAmazonCandidateRank: 2,
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      productId: 'product-1',
      scanId: 'scan-2',
      runId: 'run-2',
      status: 'queued',
      currentStatus: 'queued',
      message: 'Amazon candidate extraction queued.',
    });
  });

  it('returns 404 when the source scan is missing', async () => {
    getProductScanByIdMock.mockResolvedValue(null);

    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/scans/amazon/extract-candidate', {
        method: 'POST',
      }),
      {
        body: {
          productId: 'product-1',
          scanId: 'scan-missing',
          candidateUrl: 'https://www.amazon.com/dp/B0001',
        },
        userId: 'user-42',
      } as ApiHandlerContext
    );

    expect(queueAmazonBatchProductScansMock).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Source Amazon scan not found.',
    });
  });

  it('returns 409 when the source scan belongs to a different product', async () => {
    getProductScanByIdMock.mockResolvedValue({
      id: 'scan-1',
      productId: 'product-2',
      provider: 'amazon',
      asin: null,
      amazonDetails: null,
      rawResult: {
        candidateSelectionRequired: true,
        candidatePreviews: [{ url: 'https://www.amazon.com/dp/B0001' }],
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/scans/amazon/extract-candidate', {
        method: 'POST',
      }),
      {
        body: {
          productId: 'product-1',
          scanId: 'scan-1',
          candidateUrl: 'https://www.amazon.com/dp/B0001',
        },
        userId: 'user-42',
      } as ApiHandlerContext
    );

    expect(queueAmazonBatchProductScansMock).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Source Amazon scan does not belong to this product.',
    });
  });

  it('returns 409 when the source scan is not awaiting candidate selection', async () => {
    getProductScanByIdMock.mockResolvedValue({
      id: 'scan-1',
      productId: 'product-1',
      provider: 'amazon',
      asin: null,
      amazonDetails: null,
      rawResult: {
        candidatePreviews: [{ url: 'https://www.amazon.com/dp/B0001' }],
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/scans/amazon/extract-candidate', {
        method: 'POST',
      }),
      {
        body: {
          productId: 'product-1',
          scanId: 'scan-1',
          candidateUrl: 'https://www.amazon.com/dp/B0001',
        },
        userId: 'user-42',
      } as ApiHandlerContext
    );

    expect(queueAmazonBatchProductScansMock).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Source Amazon scan is not awaiting candidate selection.',
    });
  });

  it('returns 409 when the selected candidate URL is not on the source scan', async () => {
    getProductScanByIdMock.mockResolvedValue({
      id: 'scan-1',
      productId: 'product-1',
      provider: 'amazon',
      asin: null,
      amazonDetails: null,
      rawResult: {
        candidateSelectionRequired: true,
        candidatePreviews: [{ url: 'https://www.amazon.com/dp/B0002' }],
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/scans/amazon/extract-candidate', {
        method: 'POST',
      }),
      {
        body: {
          productId: 'product-1',
          scanId: 'scan-1',
          candidateUrl: 'https://www.amazon.com/dp/B0001',
        },
        userId: 'user-42',
      } as ApiHandlerContext
    );

    expect(queueAmazonBatchProductScansMock).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Selected Amazon candidate was not found on the source scan.',
    });
  });
});
