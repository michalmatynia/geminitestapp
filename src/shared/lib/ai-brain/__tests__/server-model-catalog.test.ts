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
});
