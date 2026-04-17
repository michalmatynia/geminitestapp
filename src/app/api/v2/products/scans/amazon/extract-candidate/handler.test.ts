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
  POST_handler,
  productScanAmazonExtractCandidateRequestSchema,
} from './handler';

describe('products/scans/amazon/extract-candidate handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the extraction handler and request schema', () => {
    expect(typeof POST_handler).toBe('function');
    expect(typeof productScanAmazonExtractCandidateRequestSchema.safeParse).toBe('function');
  });

  it('queues a direct Amazon candidate extraction using the stored candidate order', async () => {
    getProductScanByIdMock.mockResolvedValue({
      id: 'scan-1',
      rawResult: {
        selectorProfile: 'amazon',
        candidateUrls: [
          'https://www.amazon.com/dp/B0002',
          'https://www.amazon.com/dp/B0001',
          'https://www.amazon.com/dp/B0003',
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

    const response = await POST_handler(
      new NextRequest('http://localhost/api/v2/products/scans/amazon/extract-candidate', {
        method: 'POST',
      }),
      {
        body: {
          productId: 'product-1',
          scanId: 'scan-1',
          candidateUrl: 'https://www.amazon.com/dp/B0001',
          candidateRank: 2,
          candidateId: 'image-1',
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
});
