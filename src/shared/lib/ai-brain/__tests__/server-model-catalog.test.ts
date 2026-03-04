import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readStoredSettingValueMock, upsertStoredSettingValueMock } = vi.hoisted(() => ({
  readStoredSettingValueMock: vi.fn(),
  upsertStoredSettingValueMock: vi.fn(),
}));

vi.mock('../server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
  upsertStoredSettingValue: upsertStoredSettingValueMock,
}));

vi.mock('../ollama-config', () => ({
  resolveOllamaBaseUrl: () => 'http://localhost:11434',
}));

import { listBrainModels } from '../server-model-catalog';

describe('server model catalog', () => {
  beforeEach(() => {
    readStoredSettingValueMock.mockReset();
    upsertStoredSettingValueMock.mockReset();
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
});
