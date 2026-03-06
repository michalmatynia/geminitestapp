import { describe, expect, it, vi } from 'vitest';

import { recoverEnqueuedRunByRequestId } from '@/shared/lib/ai-paths/hooks/trigger-event-recovery';

describe('recoverEnqueuedRunByRequestId', () => {
  it('returns a recovered run after a transient lookup miss', async () => {
    const lookupRuns = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: {
          runs: [],
          total: 0,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          runs: [{ id: 'run-recovered-1', status: 'queued', pathId: 'path-recovery' }],
          total: 1,
        },
      });

    const result = await recoverEnqueuedRunByRequestId({
      pathId: 'path-recovery',
      requestId: 'trigger:path-recovery:req-1',
      lookupRuns,
      retryDelaysMs: [0, 0],
    });

    expect(result).toEqual({
      runId: 'run-recovered-1',
      runRecord: expect.objectContaining({
        id: 'run-recovered-1',
        status: 'queued',
        pathId: 'path-recovery',
      }),
    });
    expect(lookupRuns).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        pathId: 'path-recovery',
        requestId: 'trigger:path-recovery:req-1',
        limit: 1,
        includeTotal: false,
        fresh: true,
      })
    );
    expect(lookupRuns).toHaveBeenCalledTimes(2);
  });

  it('returns null when no matching run can be recovered', async () => {
    const lookupRuns = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        runs: [],
        total: 0,
      },
    });

    const result = await recoverEnqueuedRunByRequestId({
      pathId: 'path-missing',
      requestId: 'trigger:path-missing:req-1',
      lookupRuns,
      retryDelaysMs: [0, 0],
    });

    expect(result).toBeNull();
    expect(lookupRuns).toHaveBeenCalledTimes(2);
  });
});
