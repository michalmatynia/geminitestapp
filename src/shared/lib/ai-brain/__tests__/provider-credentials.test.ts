import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readStoredSettingValueMock } = vi.hoisted(() => ({
  readStoredSettingValueMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
}));

import {
  createBrainProviderCredentialFingerprint,
  readBrainProviderCredential,
  readBrainProviderCredentialForAssignment,
  resolveBrainProviderCredential,
} from '../provider-credentials';

describe('Brain provider credentials', () => {
  const originalOpenAiApiKey = process.env['OPENAI_API_KEY'];

  beforeEach(() => {
    vi.clearAllMocks();
    if (originalOpenAiApiKey === undefined) {
      delete process.env['OPENAI_API_KEY'];
    } else {
      process.env['OPENAI_API_KEY'] = originalOpenAiApiKey;
    }
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
    delete process.env['OPENAI_API_KEY'];

    const resolved = await readBrainProviderCredential('openai');

    expect(resolved).toEqual({
      apiKey: null,
      source: 'missing',
      sourceKey: null,
    });
  });

  it('falls back to the provider environment variable', async () => {
    readStoredSettingValueMock.mockResolvedValue(null);
    process.env['OPENAI_API_KEY'] = 'env-openai-key';

    const resolved = await readBrainProviderCredential('openai');

    expect(resolved).toEqual({
      apiKey: 'env-openai-key',
      source: 'env',
      sourceKey: 'OPENAI_API_KEY',
    });
  });

  it('prefers a route assignment API key override over global provider settings', async () => {
    readStoredSettingValueMock.mockResolvedValue('brain-openai-key');

    const resolved = await readBrainProviderCredentialForAssignment('openai', {
      apiKey: ' route-openai-key ',
    });

    expect(resolved).toEqual({
      apiKey: 'route-openai-key',
      source: 'assignment',
      sourceKey: 'assignment.apiKey',
    });
    expect(readStoredSettingValueMock).not.toHaveBeenCalled();
  });

  it('creates a stable non-secret fingerprint for configured credentials', () => {
    expect(createBrainProviderCredentialFingerprint(' test-key ')).toBe('sha256:62af8704764f');
    expect(createBrainProviderCredentialFingerprint('')).toBeNull();
  });

  it('throws a Brain-owned configuration error when a provider credential is missing', async () => {
    readStoredSettingValueMock.mockResolvedValue(null);
    delete process.env['OPENAI_API_KEY'];

    await expect(resolveBrainProviderCredential('openai')).rejects.toMatchObject({
      message: 'OpenAI API key is missing in AI Brain provider settings and environment.',
      code: 'CONFIGURATION_ERROR',
    });
  });
});
