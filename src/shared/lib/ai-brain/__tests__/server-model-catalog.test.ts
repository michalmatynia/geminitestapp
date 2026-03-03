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

  it('falls back to defaults when provider catalog payload is invalid', async () => {
    readStoredSettingValueMock.mockResolvedValue('{invalid_json');

    const payload = await listBrainModels();

    expect(payload.models.length).toBeGreaterThan(0);
    expect(payload.warning?.code).toContain('PROVIDER_CATALOG_INVALID');
  });
});
