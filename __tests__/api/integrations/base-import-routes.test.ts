import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as importsBasePost } from '@/app/api/v2/integrations/imports/base/route';
import {
  GET as runsGet,
  POST as runsPost,
} from '@/app/api/v2/integrations/imports/base/runs/route';
import type {
  BaseImportRunsResponse,
  BaseImportStartResponse,
} from '@/shared/contracts/integrations';

const startBaseImportRunResponseMock = vi.hoisted(() => vi.fn());
const listIntegrationsMock = vi.hoisted(() => vi.fn());
const listBaseImportRunsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/services/imports/base-import-run-starter', () => ({
  startBaseImportRunResponse: startBaseImportRunResponseMock,
}));

vi.mock('@/features/integrations/services/imports/base-import-run-repository', () => ({
  listBaseImportRuns: listBaseImportRunsMock,
}));

vi.mock('@/features/integrations/services/integration-repository', () => ({
  getIntegrationRepository: vi.fn(async () => ({
    listIntegrations: listIntegrationsMock,
  })),
}));

const buildBaseImportRequestPayload = (
  overrides: Record<string, unknown>
): Record<string, unknown> => ({
  ...overrides,
});

const buildBaseImportsPostRequest = (url: string, payload: Record<string, unknown>) =>
  new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

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
    listBaseImportRunsMock.mockResolvedValue([
      {
        id: 'run-list-1',
        status: 'queued',
        params: {
          connectionId: 'connection-2',
          inventoryId: 'inventory-2',
          catalogId: 'catalog-2',
          imageMode: 'links',
          uniqueOnly: true,
          allowDuplicateSku: false,
        },
        stats: {
          total: 1,
          processed: 0,
          imported: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
        },
        createdAt: '2026-02-16T12:00:00.000Z',
        updatedAt: '2026-02-16T12:00:00.000Z',
      },
    ]);
  });

  it('rejects legacy action=import on root imports endpoint', async () => {
    const requestPayload = buildBaseImportRequestPayload({
      action: 'import',
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: 'catalog-1',
    });
    const response = await importsBasePost(buildBaseImportsPostRequest(
      'http://localhost/api/v2/integrations/imports/base',
      requestPayload
    ));

    expect(response.status).toBe(400);
    expect(startBaseImportRunResponseMock).not.toHaveBeenCalled();
  });

  it('requires explicit connectionId for inventories action', async () => {
    const requestPayload = buildBaseImportRequestPayload({
      action: 'inventories',
    });
    const response = await importsBasePost(buildBaseImportsPostRequest(
      'http://localhost/api/v2/integrations/imports/base',
      requestPayload
    ));

    expect(response.status).toBe(400);
    expect(startBaseImportRunResponseMock).not.toHaveBeenCalled();
  });

  it('runs endpoint delegates to the same run starter payload contract', async () => {
    const requestPayload = buildBaseImportRequestPayload({
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
    const response = await runsPost(buildBaseImportsPostRequest(
      'http://localhost/api/v2/integrations/imports/base/runs',
      requestPayload
    ));
    const payload = (await response.json()) as BaseImportStartResponse;

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

  it('requires explicit connectionId on runs endpoint', async () => {
    const requestPayload = buildBaseImportRequestPayload({
      inventoryId: 'inventory-2',
      catalogId: 'catalog-2',
      imageMode: 'links',
      uniqueOnly: true,
      allowDuplicateSku: false,
    });
    const response = await runsPost(buildBaseImportsPostRequest(
      'http://localhost/api/v2/integrations/imports/base/runs',
      requestPayload
    ));

    expect(response.status).toBe(400);
    expect(startBaseImportRunResponseMock).not.toHaveBeenCalled();
  });

  it('wraps run list responses in the centralized runs envelope', async () => {
    const response = await runsGet(
      new NextRequest('http://localhost/api/v2/integrations/imports/base/runs?limit=10', {
        method: 'GET',
      })
    );
    const payload = (await response.json()) as BaseImportRunsResponse;

    expect(response.status).toBe(200);
    expect(listBaseImportRunsMock).toHaveBeenCalledWith(10);
    expect(payload.runs).toHaveLength(1);
    expect(payload.runs[0]?.id).toBe('run-list-1');
  });
});
