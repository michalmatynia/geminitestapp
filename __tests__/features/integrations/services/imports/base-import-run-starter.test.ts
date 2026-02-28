import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  startBaseImportRun,
  startBaseImportRunResponse,
} from '@/shared/lib/integrations/services/imports/base-import-run-starter';
import type { StartBaseImportRunInput } from '@/shared/lib/integrations/services/imports/base-import-service';
import type { BaseImportRunRecord, BaseImportStartResponse } from '@/shared/contracts/integrations';

const prepareBaseImportRunMock = vi.hoisted(() => vi.fn());
const updateBaseImportRunQueueJobMock = vi.hoisted(() => vi.fn());
const toStartResponseMock = vi.hoisted(() => vi.fn());
const enqueueBaseImportRunJobMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/integrations/services/imports/base-import-service', () => ({
  prepareBaseImportRun: prepareBaseImportRunMock,
  updateBaseImportRunQueueJob: updateBaseImportRunQueueJobMock,
  toStartResponse: toStartResponseMock,
}));

vi.mock('@/shared/lib/integrations/workers/baseImportQueue', () => ({
  enqueueBaseImportRunJob: enqueueBaseImportRunJobMock,
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
        summaryMessage: run.summaryMessage ?? null,
      })
    );
  });

  it('enqueues queued runs with pending items and stores queue job id', async () => {
    const preparedRun = buildRun({ id: 'run-queued', status: 'queued' });
    const queuedRun = buildRun({
      id: 'run-queued',
      status: 'queued',
      queueJobId: 'queue-42',
    });

    prepareBaseImportRunMock.mockResolvedValue(preparedRun);
    enqueueBaseImportRunJobMock.mockResolvedValue('queue-42');
    updateBaseImportRunQueueJobMock.mockResolvedValue(queuedRun);

    const result = await startBaseImportRun(input);

    expect(prepareBaseImportRunMock).toHaveBeenCalledWith(input);
    expect(enqueueBaseImportRunJobMock).toHaveBeenCalledWith({
      runId: 'run-queued',
      reason: 'start',
      statuses: ['pending'],
    });
    expect(updateBaseImportRunQueueJobMock).toHaveBeenCalledWith('run-queued', 'queue-42');
    expect(result).toEqual(queuedRun);
  });

  it('does not enqueue runs when there is nothing to process', async () => {
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

    expect(enqueueBaseImportRunJobMock).not.toHaveBeenCalled();
    expect(updateBaseImportRunQueueJobMock).not.toHaveBeenCalled();
    expect(result).toEqual(preparedRun);
  });

  it('builds API response from queued run result', async () => {
    const preparedRun = buildRun({ id: 'run-for-response', status: 'queued' });
    const queuedRun = buildRun({
      id: 'run-for-response',
      status: 'queued',
      queueJobId: 'queue-99',
    });

    prepareBaseImportRunMock.mockResolvedValue(preparedRun);
    enqueueBaseImportRunJobMock.mockResolvedValue('queue-99');
    updateBaseImportRunQueueJobMock.mockResolvedValue(queuedRun);
    toStartResponseMock.mockReturnValue({
      runId: 'run-for-response',
      status: 'queued',
      preflight: queuedRun.preflight,
      queueJobId: 'queue-99',
      summaryMessage: null,
    });

    const response = await startBaseImportRunResponse(input);

    expect(toStartResponseMock).toHaveBeenCalledWith(queuedRun);
    expect(response).toEqual({
      runId: 'run-for-response',
      status: 'queued',
      preflight: queuedRun.preflight,
      queueJobId: 'queue-99',
      summaryMessage: null,
    });
  });
});
