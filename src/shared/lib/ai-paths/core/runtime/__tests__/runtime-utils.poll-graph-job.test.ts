import { beforeEach, describe, expect, it, vi } from 'vitest';

const { pollMock } = vi.hoisted(() => ({
  pollMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/ai-paths/api')>(
    '@/shared/lib/ai-paths/api'
  );
  return {
    ...actual,
    aiJobsApi: {
      ...actual.aiJobsApi,
      poll: pollMock,
    },
  };
});

import { pollGraphJob } from '@/shared/lib/ai-paths/core/runtime/utils';
import { aiJobsApi } from '@/shared/lib/ai-paths/api';

describe('pollGraphJob', () => {
  beforeEach(() => {
    pollMock.mockReset();
  });

  it('retries transient 404 polling responses and then completes', async () => {
    pollMock
      .mockResolvedValueOnce({
        ok: false,
        error: 'Request failed with status 404',
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: 'completed',
          result: { result: 'ok-result' },
        },
      });

    const result = await pollGraphJob('job-404-transient', { intervalMs: 0, maxAttempts: 4 });

    expect(result).toBe('ok-result');
    expect(vi.mocked(aiJobsApi.poll)).toHaveBeenCalledTimes(2);
  });

  it('throws explicit not-found error when job remains 404 during poll grace window', async () => {
    pollMock.mockResolvedValue({
      ok: false,
      error: 'Request failed with status 404',
    });

    await expect(
      pollGraphJob('job-404-missing', { intervalMs: 0, maxAttempts: 3 })
    ).rejects.toThrow('AI job "job-404-missing" not found while polling');
    expect(vi.mocked(aiJobsApi.poll)).toHaveBeenCalledTimes(3);
  });

  it('includes job id in terminal connection errors', async () => {
    pollMock.mockResolvedValue({
      ok: false,
      error: 'Service unavailable',
    });

    await expect(
      pollGraphJob('job-connection-failure', { intervalMs: 0, maxAttempts: 2 })
    ).rejects.toThrow(
      'Connection error after 2 attempts while polling AI job "job-connection-failure"'
    );
    expect(vi.mocked(aiJobsApi.poll)).toHaveBeenCalledTimes(2);
  });

  it('does not retry terminal failed job statuses into connection errors', async () => {
    pollMock.mockResolvedValue({
      ok: true,
      data: {
        status: 'failed',
        error:
          'AI Paths Model has no model assigned in AI Brain. Failing AI Paths node "Opis i Tytuł" <node-model-ctx>, run run-ctx-1, requested node model: none.',
      },
    });

    await expect(pollGraphJob('job-terminal-failure', { intervalMs: 0, maxAttempts: 150 })).rejects.toThrow(
      'AI Paths Model has no model assigned in AI Brain. Failing AI Paths node "Opis i Tytuł" <node-model-ctx>, run run-ctx-1, requested node model: none.'
    );
    expect(vi.mocked(aiJobsApi.poll)).toHaveBeenCalledTimes(1);
  });

  it('treats cancelled job statuses as terminal failures', async () => {
    pollMock.mockResolvedValue({
      ok: true,
      data: {
        status: 'cancelled',
      },
    });

    await expect(
      pollGraphJob('job-cancelled', { intervalMs: 0, maxAttempts: 5 })
    ).rejects.toThrow('AI job was canceled.');
    expect(vi.mocked(aiJobsApi.poll)).toHaveBeenCalledTimes(1);
  });
});
