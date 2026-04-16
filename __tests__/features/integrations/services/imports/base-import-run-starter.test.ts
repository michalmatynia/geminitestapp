import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  startBaseImportRun,
  startBaseImportRunResponse,
} from '@/features/integrations/services/imports/base-import-run-starter';
import type { StartBaseImportRunInput } from '@/features/integrations/services/imports/base-import-service';
import type { BaseImportRunRecord, BaseImportStartResponse } from '@/shared/contracts/integrations';

const prepareBaseImportRunMock = vi.hoisted(() => vi.fn());
const updateBaseImportRunQueueJobMock = vi.hoisted(() => vi.fn());
const toStartResponseMock = vi.hoisted(() => vi.fn());
const dispatchBaseImportRunJobMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/services/imports/base-import-service', () => ({
  prepareBaseImportRun: prepareBaseImportRunMock,
  updateBaseImportRunQueueJob: updateBaseImportRunQueueJobMock,
  toStartResponse: toStartResponseMock,
}));

vi.mock('@/features/integrations/workers/baseImportQueue', () => ({
  dispatchBaseImportRunJob: dispatchBaseImportRunJobMock,
}));

const input = {
  connectionId: 'connection-1',
  inventoryId: 'inventory-1',
  catalogId: 'catalog-1',
  templateId: 'template-1',
  limit: 10,
  imageMode: 'links',
  uniqueOnly: true,
  allowDuplicateSku: false,
  selectedIds: ['1001'],
  dryRun: false,
  mode: 'upsert_on_base_id',
  requestId: 'request-1',
} satisfies StartBaseImportRunInput;

const buildRun = (overrides: Partial<BaseImportRunRecord> = {}): BaseImportRunRecord => ({
  id: 'run-1',
  status: 'queued',
  params: {
    connectionId: input.connectionId,
    inventoryId: input.inventoryId,
    catalogId: input.catalogId,
    templateId: input.templateId,
    limit: input.limit,
    imageMode: input.imageMode,
    uniqueOnly: input.uniqueOnly,
    allowDuplicateSku: input.allowDuplicateSku,
    selectedIds: input.selectedIds,
    dryRun: input.dryRun,
    mode: input.mode,
    requestId: input.requestId,
  },
  idempotencyKey: 'idem-1',
  queueJobId: null,
  dispatchMode: null,
  preflight: {
    ok: true,
    issues: [],
    checkedAt: '2026-02-16T12:00:00.000Z',
  },
  stats: {
    total: 3,
    pending: 3,
    processing: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  },
  startedAt: null,
  finishedAt: null,
  createdAt: '2026-02-16T12:00:00.000Z',
  updatedAt: '2026-02-16T12:00:00.000Z',
  summaryMessage: null,
  ...overrides,
});

describe('base-import-run-starter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toStartResponseMock.mockImplementation(
      (run: BaseImportRunRecord): BaseImportStartResponse => ({
        runId: run.id,
        status: run.status,
        preflight: run.preflight,
        queueJobId: run.queueJobId ?? null,
        dispatchMode: run.dispatchMode ?? null,
        summaryMessage: run.summaryMessage ?? null,
      })
    );
  });

  it('dispatches queued runs with pending items and stores queue job id and dispatchMode', async () => {
    const preparedRun = buildRun({ id: 'run-queued', status: 'queued' });
    const queuedRun = buildRun({
      id: 'run-queued',
      status: 'queued',
      queueJobId: 'queue-42',
      dispatchMode: 'queued',
    });

    prepareBaseImportRunMock.mockResolvedValue(preparedRun);
    dispatchBaseImportRunJobMock.mockResolvedValue({ dispatchMode: 'queued', queueJobId: 'queue-42' });
    updateBaseImportRunQueueJobMock.mockResolvedValue(queuedRun);

    const result = await startBaseImportRun(input);

    expect(prepareBaseImportRunMock).toHaveBeenCalledWith(input);
    expect(dispatchBaseImportRunJobMock).toHaveBeenCalledWith({
      runId: 'run-queued',
      reason: 'start',
      statuses: ['pending'],
    });
    expect(updateBaseImportRunQueueJobMock).toHaveBeenCalledWith('run-queued', 'queue-42', 'queued');
    expect(result).toEqual(queuedRun);
  });

  it('dispatches inline when Redis is unavailable and records inline dispatchMode', async () => {
    const preparedRun = buildRun({ id: 'run-inline', status: 'queued' });
    const inlineRun = buildRun({
      id: 'run-inline',
      status: 'queued',
      queueJobId: 'inline-1234567890',
      dispatchMode: 'inline',
    });

    prepareBaseImportRunMock.mockResolvedValue(preparedRun);
    dispatchBaseImportRunJobMock.mockResolvedValue({ dispatchMode: 'inline', queueJobId: 'inline-1234567890' });
    updateBaseImportRunQueueJobMock.mockResolvedValue(inlineRun);

    const result = await startBaseImportRun(input);

    expect(dispatchBaseImportRunJobMock).toHaveBeenCalledWith({
      runId: 'run-inline',
      reason: 'start',
      statuses: ['pending'],
    });
    expect(updateBaseImportRunQueueJobMock).toHaveBeenCalledWith('run-inline', 'inline-1234567890', 'inline');
    expect(result).toEqual(inlineRun);
  });

  it('does not dispatch runs when there is nothing to process', async () => {
    const preparedRun = buildRun({
      id: 'run-empty',
      status: 'queued',
      stats: {
        total: 0,
        pending: 0,
        processing: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
    });

    prepareBaseImportRunMock.mockResolvedValue(preparedRun);

    const result = await startBaseImportRun(input);

    expect(dispatchBaseImportRunJobMock).not.toHaveBeenCalled();
    expect(updateBaseImportRunQueueJobMock).not.toHaveBeenCalled();
    expect(result).toEqual(preparedRun);
  });

  it('builds API response including dispatchMode from queued run', async () => {
    const preparedRun = buildRun({ id: 'run-for-response', status: 'queued' });
    const queuedRun = buildRun({
      id: 'run-for-response',
      status: 'queued',
      queueJobId: 'queue-99',
      dispatchMode: 'queued',
    });

    prepareBaseImportRunMock.mockResolvedValue(preparedRun);
    dispatchBaseImportRunJobMock.mockResolvedValue({ dispatchMode: 'queued', queueJobId: 'queue-99' });
    updateBaseImportRunQueueJobMock.mockResolvedValue(queuedRun);
    toStartResponseMock.mockReturnValue({
      runId: 'run-for-response',
      status: 'queued',
      preflight: queuedRun.preflight,
      queueJobId: 'queue-99',
      dispatchMode: 'queued',
      summaryMessage: null,
    });

    const response = await startBaseImportRunResponse(input);

    expect(toStartResponseMock).toHaveBeenCalledWith(queuedRun);
    expect(response).toEqual({
      runId: 'run-for-response',
      status: 'queued',
      preflight: queuedRun.preflight,
      queueJobId: 'queue-99',
      dispatchMode: 'queued',
      summaryMessage: null,
    });
  });

  it('builds API response with inline dispatchMode when Redis unavailable', async () => {
    const preparedRun = buildRun({ id: 'run-inline-response', status: 'queued' });
    const inlineRun = buildRun({
      id: 'run-inline-response',
      status: 'queued',
      queueJobId: 'inline-111',
      dispatchMode: 'inline',
    });

    prepareBaseImportRunMock.mockResolvedValue(preparedRun);
    dispatchBaseImportRunJobMock.mockResolvedValue({ dispatchMode: 'inline', queueJobId: 'inline-111' });
    updateBaseImportRunQueueJobMock.mockResolvedValue(inlineRun);
    toStartResponseMock.mockReturnValue({
      runId: 'run-inline-response',
      status: 'queued',
      preflight: inlineRun.preflight,
      queueJobId: 'inline-111',
      dispatchMode: 'inline',
      summaryMessage: null,
    });

    const response = await startBaseImportRunResponse(input);

    expect(toStartResponseMock).toHaveBeenCalledWith(inlineRun);
    expect(response.dispatchMode).toBe('inline');
  });
});
