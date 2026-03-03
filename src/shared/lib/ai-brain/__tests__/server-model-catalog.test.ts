import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readStoredSettingValueMock } = vi.hoisted(() => ({
  readStoredSettingValueMock: vi.fn(),
}));

vi.mock('../server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
}));

vi.mock('../ollama-config', () => ({
  resolveOllamaBaseUrl: () => 'http://localhost:11434',
}));

import { listBrainModels } from '../server-model-catalog';

describe('server model catalog', () => {
  beforeEach(() => {
    readStoredSettingValueMock.mockReset();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid provider catalog payloads instead of falling back to defaults', async () => {
    readStoredSettingValueMock.mockResolvedValue('{invalid_json');

    await expect(listBrainModels()).rejects.toThrow(/Invalid AI Brain provider catalog payload/i);
  });

  it('supports legacy provider catalog pool arrays for backward compatibility', async () => {
    readStoredSettingValueMock.mockResolvedValue(
      JSON.stringify({
        modelPresets: ['gpt-4o-mini'],
        paidModels: ['gpt-4.1'],
        ollamaModels: ['llama3.1'],
        agentModels: [],
        deepthinkingAgents: [],
        playwrightPersonas: [],
      })
    );

    const payload = await listBrainModels();

    expect(payload.models).toEqual(['gpt-4o-mini', 'gpt-4.1', 'llama3.1']);
    expect(payload.sources?.configuredOllamaModels).toEqual(['llama3.1']);
  });
});
