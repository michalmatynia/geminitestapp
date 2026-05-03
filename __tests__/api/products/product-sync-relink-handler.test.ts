import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { postHandler } from '@/app/api/v2/products/sync/relink/handler';
import type {
  ProductSyncRelinkPayload,
  ProductSyncRelinkResponse,
} from '@/shared/contracts/product-sync';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const enqueueProductSyncBackfillJobMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/jobs/server', () => ({
  enqueueProductSyncBackfillJob: enqueueProductSyncBackfillJobMock,
}));

describe('api/v2/products/sync/relink handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enqueueProductSyncBackfillJobMock.mockResolvedValue('job-123');
  });

  it('returns the centralized queued backfill response', async () => {
    const body: ProductSyncRelinkPayload = {
      connectionId: 'conn-1',
      inventoryId: 'inv-1',
      catalogId: null,
    };
    const context: ApiHandlerContext = {
      requestId: 'test-req-id',
      startTime: Date.now(),
      getElapsedMs: () => 0,
      body,
    };

    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/sync/relink', {
        method: 'POST',
      }),
      context
    );
    const payload = (await response.json()) as ProductSyncRelinkResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ status: 'queued', jobId: 'job-123' });
    expect(enqueueProductSyncBackfillJobMock).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      inventoryId: 'inv-1',
      catalogId: null,
      source: 'api-products-sync-relink',
    });
  });
});
