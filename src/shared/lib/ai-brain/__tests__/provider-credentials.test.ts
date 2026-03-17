import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readStoredSettingValueMock } = vi.hoisted(() => ({
  readStoredSettingValueMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
}));

import { readBrainProviderCredential, resolveBrainProviderCredential } from '../provider-credentials';

describe('Brain provider credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers the global Brain provider key', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string): Promise<string | null> =>
      key === 'openai_api_key' ? 'brain-openai-key' : null
    );

    const resolved = await readBrainProviderCredential('openai');

    expect(resolved).toEqual({
      apiKey: 'brain-openai-key',
      source: 'brain',
      sourceKey: 'openai_api_key',
    });
  });

  it('reports missing when no stored Brain key exists', async () => {
    readStoredSettingValueMock.mockResolvedValue(null);

    const resolved = await readBrainProviderCredential('openai');

    expect(resolved).toEqual({
      apiKey: null,
      source: 'missing',
      sourceKey: null,
    });
  });

  it('throws a Brain-owned configuration error when a provider credential is missing', async () => {
    readStoredSettingValueMock.mockResolvedValue(null);

    await expect(resolveBrainProviderCredential('openai')).rejects.toMatchObject({
      message: 'OpenAI API key is missing in AI Brain provider settings.',
      code: 'CONFIGURATION_ERROR',
    });
  });
});
