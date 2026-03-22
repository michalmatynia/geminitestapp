import { beforeEach, describe, expect, it, vi } from 'vitest';

const embeddingsCreate = vi.fn();
const openAiConstructor = vi.fn(function OpenAIClient() {
  return {
    embeddings: {
      create: embeddingsCreate,
    },
  };
});

const resolveBrainProviderCredentialMock = vi.fn();
const inferBrainRuntimeVendorMock = vi.fn();
const normalizeBrainRuntimeModelIdMock = vi.fn();
const captureExceptionMock = vi.fn();

vi.mock('openai', () => ({
  default: openAiConstructor,
}));

vi.mock('@/shared/lib/ai-brain/provider-credentials', () => ({
  resolveBrainProviderCredential: resolveBrainProviderCredentialMock,
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  inferBrainRuntimeVendor: inferBrainRuntimeVendorMock,
  normalizeBrainRuntimeModelId: normalizeBrainRuntimeModelIdMock,
}));

vi.mock('@/shared/lib/ai-brain/ollama-config', () => ({
  resolveOllamaBaseUrl: () => 'http://ollama.test',
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

describe('server-embeddings-client', () => {
  beforeEach(() => {
    vi.resetModules();
    embeddingsCreate.mockReset();
    openAiConstructor.mockClear();
    resolveBrainProviderCredentialMock.mockReset();
    inferBrainRuntimeVendorMock.mockReset();
    normalizeBrainRuntimeModelIdMock.mockReset();
    captureExceptionMock.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('rejects missing model ids and text before choosing a provider', async () => {
    const { generateBrainEmbedding } = await import('@/shared/lib/ai-brain/server-embeddings-client');

    await expect(
      generateBrainEmbedding({
        modelId: '   ',
        text: 'hello',
      })
    ).rejects.toThrow('Embedding model is required.');

    await expect(
      generateBrainEmbedding({
        modelId: 'text-embedding-3-small',
        text: '   ',
      })
    ).rejects.toThrow('Embedding text is required.');
  });

  it('uses the OpenAI client for openai embeddings and returns the first embedding vector', async () => {
    inferBrainRuntimeVendorMock.mockReturnValue('openai');
    normalizeBrainRuntimeModelIdMock.mockReturnValue('text-embedding-3-small');
    resolveBrainProviderCredentialMock.mockResolvedValue('sk-openai');
    embeddingsCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    });

    const { generateBrainEmbedding } = await import('@/shared/lib/ai-brain/server-embeddings-client');

    await expect(
      generateBrainEmbedding({
        modelId: ' text-embedding-3-small ',
        text: '  describe this  ',
      })
    ).resolves.toEqual([0.1, 0.2, 0.3]);

    expect(openAiConstructor).toHaveBeenCalledWith({ apiKey: 'sk-openai' });
    expect(embeddingsCreate).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'describe this',
    });
  });

  it('tries the Ollama fallback endpoints until one returns an embedding payload', async () => {
    inferBrainRuntimeVendorMock.mockReturnValue('ollama');
    normalizeBrainRuntimeModelIdMock.mockReturnValue('nomic-embed-text');

    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        text: vi.fn().mockResolvedValue('missing endpoint'),
        statusText: 'Not Found',
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          embeddings: [[0.9, 0.8]],
        }),
      } as unknown as Response);

    const { generateBrainEmbedding } = await import('@/shared/lib/ai-brain/server-embeddings-client');

    await expect(
      generateBrainEmbedding({
        modelId: 'ollama:nomic-embed-text',
        text: 'vectorize this',
      })
    ).resolves.toEqual([0.9, 0.8]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://ollama.test/api/embeddings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ model: 'nomic-embed-text', prompt: 'vectorize this' }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://ollama.test/api/embed',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ model: 'nomic-embed-text', input: 'vectorize this' }),
      })
    );
  });

  it('captures fetch exceptions and throws when Ollama never returns a usable embedding', async () => {
    inferBrainRuntimeVendorMock.mockReturnValue('ollama');
    normalizeBrainRuntimeModelIdMock.mockReturnValue('nomic-embed-text');

    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ embeddings: [[]] }),
      } as unknown as Response);

    const { generateBrainEmbedding } = await import('@/shared/lib/ai-brain/server-embeddings-client');

    await expect(
      generateBrainEmbedding({
        modelId: 'ollama:nomic-embed-text',
        text: 'vectorize this',
      })
    ).rejects.toThrow('Ollama embedding request failed: Embedding payload was empty.');

    expect(captureExceptionMock).toHaveBeenCalled();
  });
});
