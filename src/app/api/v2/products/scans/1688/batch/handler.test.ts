import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { queue1688BatchProductScansMock } = vi.hoisted(() => ({
  queue1688BatchProductScansMock: vi.fn(),
}));

vi.mock('@/features/products/server/product-scans-service', () => ({
  queue1688BatchProductScans: (...args: unknown[]) => queue1688BatchProductScansMock(...args),
}));

import { POST_handler, productScanBatchRequestSchema } from './handler';

describe('products/scans/1688/batch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the batch handler and request schema', () => {
    expect(typeof POST_handler).toBe('function');
    expect(typeof productScanBatchRequestSchema.safeParse).toBe('function');
  });

  it('queues 1688 scans with the authenticated user id', async () => {
    queue1688BatchProductScansMock.mockResolvedValue({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1688-1',
          runId: 'run-1688-1',
          status: 'queued',
          message: '1688 supplier reverse image scan queued.',
        },
      ],
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/v2/products/scans/1688/batch', {
        method: 'POST',
      }),
      {
        body: { productIds: ['product-1'] },
        userId: 'user-42',
      } as ApiHandlerContext
    );

    expect(queue1688BatchProductScansMock).toHaveBeenCalledWith({
      connectionId: null,
      productIds: ['product-1'],
      userId: 'user-42',
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
          scanId: 'scan-1688-1',
          runId: 'run-1688-1',
          status: 'queued',
          currentStatus: null,
          message: '1688 supplier reverse image scan queued.',
        },
      ],
    });
  });
});
