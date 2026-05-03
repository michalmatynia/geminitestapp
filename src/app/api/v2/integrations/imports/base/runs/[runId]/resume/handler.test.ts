import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  initializeQueuesMock,
  resumeBaseImportRunMock,
  toStartResponseMock,
  updateBaseImportRunQueueJobMock,
  dispatchBaseImportRunJobMock,
} = vi.hoisted(() => ({
  initializeQueuesMock: vi.fn(),
  resumeBaseImportRunMock: vi.fn(),
  toStartResponseMock: vi.fn(),
  updateBaseImportRunQueueJobMock: vi.fn(),
  dispatchBaseImportRunJobMock: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  initializeQueues: initializeQueuesMock,
}));

vi.mock('@/features/integrations/server', () => ({
  resumeBaseImportRun: resumeBaseImportRunMock,
  toStartResponse: toStartResponseMock,
  updateBaseImportRunQueueJob: updateBaseImportRunQueueJobMock,
  dispatchBaseImportRunJob: dispatchBaseImportRunJobMock,
}));

import { postHandler } from './handler';

describe('base import run resume handler module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the supported handlers', () => {
    expect(typeof postHandler).toBe('function');
  });

  it('initializes queues before resuming an import run', async () => {
    resumeBaseImportRunMock.mockResolvedValue({ id: 'run-1' });
    dispatchBaseImportRunJobMock.mockResolvedValue({
      dispatchMode: 'queued',
      queueJobId: 'job-1',
    });
    updateBaseImportRunQueueJobMock.mockResolvedValue({
      id: 'run-1',
      status: 'queued',
      queueJobId: 'job-1',
      dispatchMode: 'queued',
    });
    toStartResponseMock.mockReturnValue({
      runId: 'run-1',
      status: 'queued',
      queueJobId: 'job-1',
      dispatchMode: 'queued',
      summaryMessage: 'Queued',
    });

    const response = await postHandler(
      {
        json: async () => ({}),
      } as never,
      {} as never,
      { runId: 'run-1' }
    );

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(resumeBaseImportRunMock).toHaveBeenCalledWith('run-1', ['failed', 'pending']);
    expect(dispatchBaseImportRunJobMock).toHaveBeenCalledWith({
      runId: 'run-1',
      reason: 'resume',
      statuses: ['pending'],
    });
    expect(response.status).toBe(200);
  });
});
