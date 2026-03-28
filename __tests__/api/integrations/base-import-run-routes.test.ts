import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  BaseImportRunDetailResponse,
  BaseImportRunReportResponse,
  BaseImportStartResponse,
} from '@/shared/contracts/integrations';

const getBaseImportRunDetailOrThrowMock = vi.hoisted(() => vi.fn());
const resumeBaseImportRunMock = vi.hoisted(() => vi.fn());
const updateBaseImportRunQueueJobMock = vi.hoisted(() => vi.fn());
const cancelBaseImportRunMock = vi.hoisted(() => vi.fn());
const toStartResponseMock = vi.hoisted(() => vi.fn());
const enqueueBaseImportRunJobMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/services/imports/base-import-service', () => ({
  getBaseImportRunDetailOrThrow: getBaseImportRunDetailOrThrowMock,
  resumeBaseImportRun: resumeBaseImportRunMock,
  updateBaseImportRunQueueJob: updateBaseImportRunQueueJobMock,
  cancelBaseImportRun: cancelBaseImportRunMock,
  toStartResponse: toStartResponseMock,
}));

vi.mock('@/features/integrations/workers/baseImportQueue', () => ({
  enqueueBaseImportRunJob: enqueueBaseImportRunJobMock,
}));

import { POST as cancelPost } from '@/app/api/v2/integrations/imports/base/runs/[runId]/cancel/route';
import { GET as reportGet } from '@/app/api/v2/integrations/imports/base/runs/[runId]/report/route';
import { POST as resumePost } from '@/app/api/v2/integrations/imports/base/runs/[runId]/resume/route';
import { GET as runDetailGet } from '@/app/api/v2/integrations/imports/base/runs/[runId]/route';

const buildResumeRunRequest = (payload: Record<string, unknown>) =>
  new NextRequest('http://localhost/api/v2/integrations/imports/base/runs/run-resume-1/resume', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

const buildCancelRunRequest = () =>
  new NextRequest('http://localhost/api/v2/integrations/imports/base/runs/run-cancel-1/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });

describe('base import run routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toStartResponseMock.mockImplementation(
      (run: {
        id: string;
        status: string;
        queueJobId?: string | null;
        summaryMessage?: string | null;
      }) => ({
        runId: run.id,
        status: run.status,
        preflight: {
          ok: true,
          issues: [],
          checkedAt: '2026-02-16T12:00:00.000Z',
        },
        queueJobId: run.queueJobId ?? null,
        summaryMessage: run.summaryMessage ?? null,
      })
    );
  });

  it('parses run detail query with includeItems=false and forwards typed filters', async () => {
    getBaseImportRunDetailOrThrowMock.mockResolvedValue({
      run: {
        id: 'run-1',
        status: 'running',
      },
      items: [],
      pagination: {
        page: 2,
        pageSize: 100,
        totalItems: 0,
        totalPages: 1,
      },
    });

    const response = await runDetailGet(
      new NextRequest(
        'http://localhost/api/v2/integrations/imports/base/runs/run-1?statuses=pending,failed&page=2&pageSize=100&includeItems=false'
      ),
      { params: Promise.resolve({ runId: 'run-1' }) }
    );
    const payload = (await response.json()) as BaseImportRunDetailResponse;

    expect(response.status).toBe(200);
    expect(getBaseImportRunDetailOrThrowMock).toHaveBeenCalledWith('run-1', {
      statuses: ['pending', 'failed'],
      page: 2,
      pageSize: 100,
      includeItems: false,
    });
    expect(payload.pagination).toMatchObject({
      page: 2,
      pageSize: 100,
    });
  });

  it('resume route requeues only pending items after reset', async () => {
    resumeBaseImportRunMock.mockResolvedValue({
      id: 'run-resume-1',
      status: 'queued',
      queueJobId: null,
      summaryMessage: null,
    });
    enqueueBaseImportRunJobMock.mockResolvedValue('queue-resume-1');
    updateBaseImportRunQueueJobMock.mockResolvedValue({
      id: 'run-resume-1',
      status: 'queued',
      queueJobId: 'queue-resume-1',
      summaryMessage: 'Resume queued for 2 product(s).',
    });

    const response = await resumePost(
      buildResumeRunRequest({ statuses: ['failed', 'pending'] }),
      { params: Promise.resolve({ runId: 'run-resume-1' }) }
    );
    const payload = (await response.json()) as BaseImportRunStartResponse;

    expect(response.status).toBe(200);
    expect(resumeBaseImportRunMock).toHaveBeenCalledWith('run-resume-1', ['failed', 'pending']);
    expect(enqueueBaseImportRunJobMock).toHaveBeenCalledWith({
      runId: 'run-resume-1',
      reason: 'resume',
      statuses: ['pending'],
    });
    expect(updateBaseImportRunQueueJobMock).toHaveBeenCalledWith('run-resume-1', 'queue-resume-1');
    expect(payload).toMatchObject({
      runId: 'run-resume-1',
      status: 'queued',
      queueJobId: 'queue-resume-1',
    });
  });

  it('cancel route returns start-style response payload', async () => {
    cancelBaseImportRunMock.mockResolvedValue({
      id: 'run-cancel-1',
      status: 'running',
      queueJobId: 'queue-1',
      summaryMessage: 'Cancellation requested. Worker will stop shortly.',
    });

    const response = await cancelPost(
      buildCancelRunRequest(),
      { params: Promise.resolve({ runId: 'run-cancel-1' }) }
    );
    const payload = (await response.json()) as BaseImportRunStartResponse;

    expect(response.status).toBe(200);
    expect(cancelBaseImportRunMock).toHaveBeenCalledWith('run-cancel-1');
    expect(toStartResponseMock).toHaveBeenCalledTimes(1);
    expect(payload).toMatchObject({
      runId: 'run-cancel-1',
      status: 'running',
      queueJobId: 'queue-1',
    });
  });

  it('report route streams all pages into one payload', async () => {
    const run = {
      id: 'run-report-1',
      status: 'partial_success',
    };

    getBaseImportRunDetailOrThrowMock
      .mockResolvedValueOnce({
        run,
        items: [
          {
            itemId: '1001',
            status: 'imported',
            action: 'imported',
            attempt: 1,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 1000,
          totalItems: 2,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        run,
        items: [
          {
            itemId: '1002',
            status: 'failed',
            action: 'failed',
            attempt: 2,
            errorCode: 'NETWORK_ERROR',
          },
        ],
        pagination: {
          page: 2,
          pageSize: 1000,
          totalItems: 2,
          totalPages: 2,
        },
      });

    const response = await reportGet(
      new NextRequest(
        'http://localhost/api/v2/integrations/imports/base/runs/run-report-1/report?format=json'
      ),
      { params: Promise.resolve({ runId: 'run-report-1' }) }
    );
    const payload = (await response.json()) as BaseImportRunReportResponse;

    expect(response.status).toBe(200);
    expect(getBaseImportRunDetailOrThrowMock).toHaveBeenNthCalledWith(1, 'run-report-1', {
      page: 1,
      pageSize: 1000,
    });
    expect(getBaseImportRunDetailOrThrowMock).toHaveBeenNthCalledWith(2, 'run-report-1', {
      page: 2,
      pageSize: 1000,
    });
    expect(payload.run).toMatchObject({ id: 'run-report-1' });
    expect(payload.items).toHaveLength(2);
    expect(payload.pagination).toMatchObject({
      totalItems: 2,
      totalPages: 1,
    });
  });
});
