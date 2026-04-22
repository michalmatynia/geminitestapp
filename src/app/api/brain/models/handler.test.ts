import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listBrainModelsMock } = vi.hoisted(() => ({
  listBrainModelsMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server-model-catalog', () => ({
  listBrainModels: listBrainModelsMock,
}));

import { getHandler } from './handler';

describe('brain models handler', () => {
  beforeEach(() => {
    listBrainModelsMock.mockReset();
  });

  it('returns the Brain-backed model catalog payload', async () => {
    listBrainModelsMock.mockResolvedValue({
      models: ['gpt-4o-mini', 'llama3.2'],
      descriptors: {
        'gpt-4o-mini': {
          id: 'gpt-4o-mini',
          family: 'chat',
          modality: 'text',
          vendor: 'openai',
          supportsStreaming: true,
          supportsJsonMode: true,
        },
        'llama3.2': {
          id: 'llama3.2',
          family: 'chat',
          modality: 'text',
          vendor: 'ollama',
          supportsStreaming: true,
          supportsJsonMode: false,
        },
      },
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

    const response = await getHandler(
      new Request('http://localhost/api/brain/models') as Parameters<typeof getHandler>[0],
      {} as Parameters<typeof getHandler>[1]
    );

    const payload = (await response.json()) as {
      models: string[];
      warning?: { code?: string; message?: string };
      sources?: { configuredOllamaModels?: string[] };
    };

    expect(payload.models).toEqual(['gpt-4o-mini', 'llama3.2']);
    expect(payload.warning?.code).toBe('OLLAMA_UNAVAILABLE');
    expect(payload.sources?.configuredOllamaModels).toEqual(['llama3.2']);
    expect(listBrainModelsMock).toHaveBeenCalledWith({});
  });

  it('passes discovery filters through to the model catalog', async () => {
    listBrainModelsMock.mockResolvedValue({
      models: ['gpt-4o-mini'],
      descriptors: {},
    });

    await getHandler(
      new Request(
        'http://localhost/api/brain/models?family=chat&modality=text&streaming=true'
      ) as Parameters<typeof getHandler>[0],
      {} as Parameters<typeof getHandler>[1]
    );

    expect(listBrainModelsMock).toHaveBeenCalledWith({
      family: 'chat',
      modality: 'text',
      streaming: true,
    });
  });
});
