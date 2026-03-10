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

import { pollGraphJob } from '@/features/ai/ai-paths/components/AiPathsSettingsUtils';
import { aiJobsApi } from '@/shared/lib/ai-paths/api';

describe('AiPathsSettingsUtils.pollGraphJob', () => {
  beforeEach(() => {
    pollMock.mockReset();
  });

  it('throws terminal failed job errors directly', async () => {
    pollMock.mockResolvedValue({
      ok: true,
      data: {
        status: 'failed',
        error:
          'AI Paths Model has no model assigned in AI Brain. Failing AI Paths node "Opis i Tytuł" <node-model-ctx>, run run-ctx-1, requested node model: none.',
      },
    });

    await expect(pollGraphJob('job-terminal-failure', { intervalMs: 0, maxAttempts: 5 })).rejects.toThrow(
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

    await expect(pollGraphJob('job-cancelled', { intervalMs: 0, maxAttempts: 5 })).rejects.toThrow(
      'AI job was canceled.'
    );
    expect(vi.mocked(aiJobsApi.poll)).toHaveBeenCalledTimes(1);
  });
});
