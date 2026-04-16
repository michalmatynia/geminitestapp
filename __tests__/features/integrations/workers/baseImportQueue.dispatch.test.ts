import { beforeEach, describe, expect, it, vi } from 'vitest';

const processBaseImportRunMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const isRedisAvailableMock = vi.hoisted(() => vi.fn(() => true));

// Mock the ErrorSystem to avoid real logging
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: { logInfo: vi.fn().mockResolvedValue(undefined), captureException: vi.fn().mockResolvedValue(undefined) },
}));

// Mock processBaseImportRun so the queue processor never tries to actually run
vi.mock('@/features/integrations/server', () => ({
  processBaseImportRun: (...args: unknown[]) => processBaseImportRunMock(...args),
}));

const enqueueMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: () => ({
    enqueue: enqueueMock,
    startWorker: vi.fn(),
    stopWorker: vi.fn().mockResolvedValue(undefined),
    getHealthStatus: vi.fn(),
    processInline: vi.fn(),
    getQueue: vi.fn().mockReturnValue(null),
  }),
  isRedisAvailable: () => isRedisAvailableMock(),
  registerQueue: vi.fn(),
}));

// Also mock the registry which is imported by queue-factory
vi.mock('@/shared/lib/queue/registry', () => ({
  registerQueue: vi.fn(),
}));

import { dispatchBaseImportRunJob } from '@/features/integrations/workers/baseImportQueue';

describe('dispatchBaseImportRunJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRedisAvailableMock.mockReturnValue(true);
  });

  it('returns dispatchMode queued when enqueue returns a BullMQ job id', async () => {
    enqueueMock.mockResolvedValue('start__run-1__pending__55555');

    const result = await dispatchBaseImportRunJob({
      runId: 'run-1',
      reason: 'start',
      statuses: ['pending'],
    });

    expect(result.dispatchMode).toBe('queued');
    expect(result.queueJobId).toBe('start__run-1__pending__55555');
  });

  it('returns dispatchMode inline when enqueue returns an inline- prefixed id', async () => {
    isRedisAvailableMock.mockReturnValue(false);
    vi.spyOn(Date, 'now').mockReturnValue(1714000000000);

    const result = await dispatchBaseImportRunJob({
      runId: 'run-2',
      reason: 'resume',
      statuses: ['pending'],
    });

    expect(result.dispatchMode).toBe('inline');
    expect(result.queueJobId).toBe('inline-1714000000000');
    expect(enqueueMock).not.toHaveBeenCalled();
    expect(processBaseImportRunMock).toHaveBeenCalledWith('run-2', {
      jobId: 'inline-1714000000000',
      allowedStatuses: ['pending'],
    });
  });

  it('passes job data fields through to queue enqueue', async () => {
    enqueueMock.mockResolvedValue('job-xyz');

    await dispatchBaseImportRunJob({
      runId: 'run-3',
      reason: 'resume',
      statuses: ['failed', 'pending'],
    });

    // enqueue is called with the job data and a computed jobId option
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'run-3', reason: 'resume' }),
      expect.objectContaining({ jobId: expect.stringContaining('run-3') })
    );
  });

  it('falls back to inline background processing when queue enqueue fails', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1715000000000);
    enqueueMock.mockRejectedValue(new Error('redis enqueue failed'));

    const result = await dispatchBaseImportRunJob({
      runId: 'run-4',
      reason: 'start',
      statuses: ['pending'],
    });

    expect(result).toEqual({
      dispatchMode: 'inline',
      queueJobId: 'inline-1715000000000',
    });
    expect(processBaseImportRunMock).toHaveBeenCalledWith('run-4', {
      jobId: 'inline-1715000000000',
      allowedStatuses: ['pending'],
    });
  });
});
