import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHandler as getProfilesHandler } from '@/app/api/v2/products/sync/profiles/handler';
import {
  deleteHandler as deleteProfileHandler,
} from '@/app/api/v2/products/sync/profiles/[id]/handler';
import { getHandler as getRunsHandler } from '@/app/api/v2/products/sync/runs/handler';
import type {
  ProductSyncDeleteResponse,
  ProductSyncProfile,
  ProductSyncProfilesResponse,
  ProductSyncRunRecord,
  ProductSyncRunsResponse,
} from '@/shared/contracts/product-sync';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const listProductSyncProfilesMock = vi.hoisted(() => vi.fn());
const listProductSyncRunsMock = vi.hoisted(() => vi.fn());
const deleteProductSyncProfileMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/product-sync/services/product-sync-repository', () => ({
  listProductSyncProfiles: listProductSyncProfilesMock,
  listProductSyncRuns: listProductSyncRunsMock,
  deleteProductSyncProfile: deleteProductSyncProfileMock,
  getProductSyncProfile: vi.fn(),
  updateProductSyncProfile: vi.fn(),
  createProductSyncProfile: vi.fn(),
}));

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

const sampleProfile: ProductSyncProfile = {
  id: 'profile-1',
  name: 'Base Product Sync',
  enabled: true,
  connectionId: 'conn-1',
  inventoryId: 'inv-1',
  catalogId: null,
  scheduleIntervalMinutes: 30,
  batchSize: 100,
  conflictPolicy: 'skip',
  fieldRules: [],
  lastRunAt: null,
  createdAt: '2026-03-10T12:00:00.000Z',
  updatedAt: '2026-03-10T12:00:00.000Z',
};

const sampleRun: ProductSyncRunRecord = {
  id: 'run-1',
  profileId: 'profile-1',
  profileName: 'Base Product Sync',
  trigger: 'manual',
  status: 'queued',
  queueJobId: 'job-1',
  startedAt: null,
  finishedAt: null,
  summaryMessage: null,
  errorMessage: null,
  stats: {
    total: 0,
    processed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    localUpdated: 0,
    baseUpdated: 0,
  },
  createdAt: '2026-03-10T12:00:00.000Z',
  updatedAt: '2026-03-10T12:00:00.000Z',
};

describe('product sync settings handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProductSyncProfilesMock.mockResolvedValue([sampleProfile]);
    listProductSyncRunsMock.mockResolvedValue([sampleRun]);
    deleteProductSyncProfileMock.mockResolvedValue(true);
  });

  it('returns the centralized profiles response wrapper', async () => {
    const response = await getProfilesHandler(
      new NextRequest('http://localhost/api/v2/products/sync/profiles', { method: 'GET' }),
      mockContext
    );
    const payload = (await response.json()) as ProductSyncProfilesResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ profiles: [sampleProfile] });
  });

  it('returns the centralized runs response wrapper', async () => {
    const response = await getRunsHandler(
      new NextRequest('http://localhost/api/v2/products/sync/runs?profileId=profile-1&limit=25', {
        method: 'GET',
      }),
      { ...mockContext, query: { profileId: 'profile-1', limit: 25 } }
    );
    const payload = (await response.json()) as ProductSyncRunsResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ runs: [sampleRun] });
    expect(listProductSyncRunsMock).toHaveBeenCalledWith({ profileId: 'profile-1', limit: 25 });
  });

  it('returns the centralized delete response wrapper', async () => {
    const response = await deleteProfileHandler(
      new NextRequest('http://localhost/api/v2/products/sync/profiles/profile-1', {
        method: 'DELETE',
      }),
      mockContext,
      { id: 'profile-1' }
    );
    const payload = (await response.json()) as ProductSyncDeleteResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(deleteProductSyncProfileMock).toHaveBeenCalledWith('profile-1');
  });
});
