import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listBrainModelsMock } = vi.hoisted(() => ({
  listBrainModelsMock: vi.fn(),
}));

vi.mock('@/features/ai/brain/server-model-catalog', () => ({
  listBrainModels: listBrainModelsMock,
}));

import { GET_handler } from './handler';

describe('brain models handler', () => {
  beforeEach(() => {
    listBrainModelsMock.mockReset();
  });

  it('returns the Brain-backed model catalog payload', async () => {
    listBrainModelsMock.mockResolvedValue({
      models: ['gpt-4o-mini', 'llama3.2'],
      warning: {
        code: 'OLLAMA_UNAVAILABLE',
        message: 'fallback only',
      },
      sources: {
        modelPresets: ['gpt-4o-mini'],
        paidModels: [],
        configuredOllamaModels: ['llama3.2'],
        liveOllamaModels: [],
      },
    });

    const response = await GET_handler(
      new Request('http://localhost/api/brain/models') as Parameters<typeof GET_handler>[0],
      {} as Parameters<typeof GET_handler>[1],
    );

    const payload = (await response.json()) as {
      models: string[];
      warning?: { code?: string; message?: string };
      sources?: { configuredOllamaModels?: string[] };
    };

    expect(payload.models).toEqual(['gpt-4o-mini', 'llama3.2']);
    expect(payload.warning?.code).toBe('OLLAMA_UNAVAILABLE');
    expect(payload.sources?.configuredOllamaModels).toEqual(['llama3.2']);
    expect(listBrainModelsMock).toHaveBeenCalledTimes(1);
  });
});
