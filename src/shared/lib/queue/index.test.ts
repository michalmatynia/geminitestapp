/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRegisteredQueue: vi.fn(),
  processInline: vi.fn(),
}));

vi.mock('./registry', () => ({
  getRegisteredQueue: mocks.getRegisteredQueue,
}));

import { processSingleJob } from './index';

describe('shared queue index', () => {
  beforeEach(() => {
    mocks.processInline.mockReset();
    mocks.getRegisteredQueue.mockReset();
  });

  it('processes a single job through the registered queue', async () => {
    mocks.processInline.mockResolvedValueOnce({ ok: true, jobId: 'job-1' });
    mocks.getRegisteredQueue.mockReturnValueOnce({
      processInline: mocks.processInline,
    });

    await expect(processSingleJob('alerts', { id: 'job-1' })).resolves.toEqual({
      ok: true,
      jobId: 'job-1',
    });
    expect(mocks.getRegisteredQueue).toHaveBeenCalledWith('alerts');
    expect(mocks.processInline).toHaveBeenCalledWith({ id: 'job-1' });
  });

  it('throws when the queue is not registered', async () => {
    mocks.getRegisteredQueue.mockReturnValueOnce(undefined);

    await expect(processSingleJob('missing-queue', { id: 'job-2' })).rejects.toThrow(
      'Queue not found: missing-queue'
    );
  });
});
