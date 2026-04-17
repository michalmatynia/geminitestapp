import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { queueAmazonBatchProductScansMock } = vi.hoisted(() => ({
  queueAmazonBatchProductScansMock: vi.fn(),
}));

vi.mock('@/features/products/server/product-scans-service', () => ({
  queueAmazonBatchProductScans: (...args: unknown[]) => queueAmazonBatchProductScansMock(...args),
}));

import { POST_handler, productScanBatchRequestSchema } from './handler';

describe('products/scans/amazon/batch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the batch handler and request schema', () => {
    expect(typeof POST_handler).toBe('function');
    expect(typeof productScanBatchRequestSchema.safeParse).toBe('function');
  });

  it('queues amazon scans with the authenticated user id', async () => {
    queueAmazonBatchProductScansMock.mockResolvedValue({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'queued',
          message: 'Amazon candidate search queued.',
        },
      ],
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/v2/products/scans/amazon/batch', {
        method: 'POST',
      }),
      {
        body: {
          productIds: ['product-1'],
          stepSequenceKey: 'amazon_reverse_image_scan',
          stepSequence: [{ key: 'validate', label: 'Validate trigger' }],
        },
        userId: 'user-42',
      } as ApiHandlerContext
    );

    expect(queueAmazonBatchProductScansMock).toHaveBeenCalledWith({
      productIds: ['product-1'],
      ownerUserId: 'user-42',
      requestInput: {
        stepSequenceKey: 'amazon_reverse_image_scan',
        stepSequence: [{ key: 'validate', label: 'Validate trigger' }],
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'queued',
          currentStatus: null,
          message: 'Amazon candidate search queued.',
        },
      ],
    });
  });
});
