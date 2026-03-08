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
    delete process.env['OPENAI_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['GEMINI_API_KEY'];
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

  it('falls back to environment credentials when no stored Brain key exists', async () => {
    process.env['OPENAI_API_KEY'] = 'env-openai-key';
    readStoredSettingValueMock.mockResolvedValue(null);

    const resolved = await readBrainProviderCredential('openai');

    expect(resolved).toEqual({
      apiKey: 'env-openai-key',
      source: 'env',
      sourceKey: 'OPENAI_API_KEY',
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
