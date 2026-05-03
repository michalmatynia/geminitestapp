import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readStoredSettingValueMock, upsertStoredSettingValueMock, captureExceptionMock } = vi.hoisted(() => ({
  readStoredSettingValueMock: vi.fn(),
  upsertStoredSettingValueMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('../server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
  upsertStoredSettingValue: upsertStoredSettingValueMock,
}));

vi.mock('../ollama-config', () => ({
  resolveOllamaBaseUrl: () => 'http://localhost:11434',
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import { describeBrainModel, listBrainModels } from '../server-model-catalog';

describe('server model catalog', () => {
  beforeEach(() => {
    readStoredSettingValueMock.mockReset();
    upsertStoredSettingValueMock.mockReset();
    captureExceptionMock.mockReset();
    upsertStoredSettingValueMock.mockResolvedValue(true);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resets invalid provider catalog payloads into canonical entries', async () => {
    readStoredSettingValueMock.mockResolvedValue('{invalid_json');

    const payload = await listBrainModels();

    expect(payload.models).toContain('gpt-4o-mini');
    expect(payload.warning?.code).toContain('PROVIDER_CATALOG_RESET');
    expect(upsertStoredSettingValueMock).toHaveBeenCalledWith(
      'ai_brain_provider_catalog',
      expect.stringContaining('"entries"')
    );
  });

  it('parses canonical entry-only provider catalog payloads', async () => {
    readStoredSettingValueMock.mockResolvedValue(
      JSON.stringify({
        entries: [
          { pool: 'modelPresets', value: 'gpt-4o-mini' },
          { pool: 'paidModels', value: 'gpt-4.1' },
          { pool: 'ollamaModels', value: 'llama3.1' },
        ],
      })
    );

    await expect(listBrainModels()).resolves.toMatchObject({
      models: ['gpt-4o-mini', 'gpt-4.1', 'llama3.1'],
      sources: {
        modelPresets: ['gpt-4o-mini'],
        paidModels: ['gpt-4.1'],
        configuredOllamaModels: ['llama3.1'],
      },
    });
    expect(upsertStoredSettingValueMock).not.toHaveBeenCalled();
  });

  it('resets deprecated provider catalog pool arrays to canonical defaults', async () => {
    readStoredSettingValueMock.mockResolvedValue(
      JSON.stringify({
        modelPresets: ['gpt-4o-mini'],
      })
    );

    const payload = await listBrainModels();

    expect(payload.models).toContain('gpt-4o-mini');
    expect(payload.warning?.code).toContain('PROVIDER_CATALOG_RESET');
    expect(upsertStoredSettingValueMock).toHaveBeenCalledWith(
      'ai_brain_provider_catalog',
      expect.stringContaining('"entries"')
    );
  });

  it('classifies brain model families from canonical model ids', () => {
    expect(describeBrainModel('text-embedding-3-large').family).toBe('embedding');
    expect(describeBrainModel('dall-e-3').family).toBe('image_generation');
    expect(describeBrainModel('docling-ocr').family).toBe('ocr');
    expect(describeBrainModel('llava:latest').family).toBe('vision_extract');
    expect(describeBrainModel('ollama:gemma4').family).toBe('vision_extract');
    expect(describeBrainModel('ollama:gemma-4').family).toBe('vision_extract');
    expect(describeBrainModel('guard-mini').family).toBe('validation');
    expect(describeBrainModel('gpt-4o-mini').family).toBe('chat');
  });

  it('classifies Gemma 4 descriptors as multimodal', () => {
    expect(describeBrainModel('ollama:gemma4')).toMatchObject({
      family: 'vision_extract',
      modality: 'multimodal',
      vendor: 'ollama',
    });
    expect(describeBrainModel('ollama:gemma-4')).toMatchObject({
      family: 'vision_extract',
      modality: 'multimodal',
      vendor: 'ollama',
    });
  });

  it('logs the last Ollama discovery failure once when every endpoint errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('connection refused'));

    const payload = await listBrainModels();

    expect(payload.warning?.code).toContain('OLLAMA_UNAVAILABLE');
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Ollama server unreachable at http://localhost:11434.',
      }),
      expect.objectContaining({
        service: 'ai-brain-model-catalog',
        baseUrl: 'http://localhost:11434',
        url: expect.stringContaining('/v1/models'),
      })
    );
  });
});
