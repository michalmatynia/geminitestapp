import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as legacyPost } from '@/app/api/integrations/imports/base/route';
import { POST as runsPost } from '@/app/api/integrations/imports/base/runs/route';

const startBaseImportRunResponseMock = vi.hoisted(() => vi.fn());
const listIntegrationsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/services/imports/base-import-run-starter', () => ({
  startBaseImportRunResponse: startBaseImportRunResponseMock,
}));

vi.mock('@/features/integrations/services/integration-repository', () => ({
  getIntegrationRepository: vi.fn(async () => ({
    listIntegrations: listIntegrationsMock,
  })),
}));

type BaseImportRunResponse = {
  runId: string;
  status: string;
  queueJobId: string;
  summaryMessage: string | null;
  preflight: {
    ok: boolean;
    issues: string[];
    checkedAt: string;
  };
};

describe('base import route unification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listIntegrationsMock.mockResolvedValue([
      {
        id: 'integration-base',
        slug: 'base-com',
      },
    ]);
    startBaseImportRunResponseMock.mockResolvedValue({
      runId: 'run-1',
      status: 'queued',
      queueJobId: 'queue-1',
      summaryMessage: null,
      preflight: {
        ok: true,
        issues: [],
        checkedAt: '2026-02-16T12:00:00.000Z',
      },
    });
  });

  it('legacy action=import delegates to run starter and returns no-store response', async () => {
    const response = await legacyPost(
      new NextRequest('http://localhost/api/integrations/imports/base', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          connectionId: 'connection-1',
          inventoryId: 'inventory-1',
          catalogId: 'catalog-1',
          templateId: 'template-1',
          limit: 50,
          imageMode: 'download',
          uniqueOnly: false,
          allowDuplicateSku: true,
          selectedIds: ['1001', '1002'],
          dryRun: true,
          mode: 'upsert_on_sku',
          requestId: 'request-legacy-1',
        }),
      })
    );
    const payload = (await response.json()) as BaseImportRunResponse;

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(startBaseImportRunResponseMock).toHaveBeenCalledTimes(1);
    expect(startBaseImportRunResponseMock).toHaveBeenCalledWith({
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: 'catalog-1',
      templateId: 'template-1',
      limit: 50,
      imageMode: 'download',
      uniqueOnly: false,
      allowDuplicateSku: true,
      selectedIds: ['1001', '1002'],
      dryRun: true,
      mode: 'upsert_on_sku',
      requestId: 'request-legacy-1',
    });
    expect(payload).toMatchObject({
      runId: 'run-1',
      status: 'queued',
      queueJobId: 'queue-1',
    });
  });

  it('runs endpoint delegates to the same run starter payload contract', async () => {
    const response = await runsPost(
      new NextRequest('http://localhost/api/integrations/imports/base/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          connectionId: 'connection-2',
          inventoryId: 'inventory-2',
          catalogId: 'catalog-2',
          templateId: 'template-2',
          limit: 25,
          imageMode: 'links',
          uniqueOnly: true,
          allowDuplicateSku: false,
          selectedIds: ['2001'],
          dryRun: false,
          mode: 'upsert_on_base_id',
          requestId: 'request-runs-1',
        }),
      })
    );
    const payload = (await response.json()) as BaseImportRunResponse;

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(startBaseImportRunResponseMock).toHaveBeenCalledTimes(1);
    expect(startBaseImportRunResponseMock).toHaveBeenCalledWith({
      connectionId: 'connection-2',
      inventoryId: 'inventory-2',
      catalogId: 'catalog-2',
      templateId: 'template-2',
      limit: 25,
      imageMode: 'links',
      uniqueOnly: true,
      allowDuplicateSku: false,
      selectedIds: ['2001'],
      dryRun: false,
      mode: 'upsert_on_base_id',
      requestId: 'request-runs-1',
    });
    expect(payload).toMatchObject({
      runId: 'run-1',
      status: 'queued',
    });
  });
});
