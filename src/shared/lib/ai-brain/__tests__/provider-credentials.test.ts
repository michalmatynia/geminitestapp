import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readStoredSettingValueMock, logSystemEventMock } = vi.hoisted(() => ({
  readStoredSettingValueMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

import {
  __testables,
  readBrainProviderCredential,
  resolveBrainProviderCredential,
} from '../provider-credentials';

describe('Brain provider credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __testables.clearProviderCredentialWarningCache();
    delete process.env['OPENAI_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['GEMINI_API_KEY'];
  });

  it('prefers the global Brain provider key and warns once when a deprecated feature key conflicts', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string): Promise<string | null> => {
      if (key === 'openai_api_key') return 'brain-openai-key';
      if (key === 'image_studio_openai_api_key') return 'legacy-openai-key';
      return null;
    });

    const first = await readBrainProviderCredential('openai');
    const second = await readBrainProviderCredential('openai');

    expect(first).toEqual({
      apiKey: 'brain-openai-key',
      source: 'brain',
      sourceKey: 'openai_api_key',
      usedLegacyFallback: false,
    });
    expect(second).toEqual(first);
    expect(logSystemEventMock).toHaveBeenCalledTimes(1);
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        source: 'ai_brain.provider_credential_conflict',
        context: expect.objectContaining({
          vendor: 'openai',
          primarySettingKey: 'openai_api_key',
          legacySettingKey: 'image_studio_openai_api_key',
        }),
      })
    );
  });

  it('uses the deprecated Image Studio key as a logged migration fallback when no Brain key exists', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string): Promise<string | null> => {
      if (key === 'openai_api_key') return null;
      if (key === 'image_studio_openai_api_key') return 'legacy-openai-key';
      return null;
    });

    const resolved = await readBrainProviderCredential('openai');

    expect(resolved).toEqual({
      apiKey: 'legacy-openai-key',
      source: 'legacy',
      sourceKey: 'image_studio_openai_api_key',
      usedLegacyFallback: true,
    });
    expect(logSystemEventMock).toHaveBeenCalledTimes(1);
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        source: 'ai_brain.provider_credential_legacy_fallback',
      })
    );
  });

  it('falls back to environment credentials when no stored Brain key exists', async () => {
    process.env['OPENAI_API_KEY'] = 'env-openai-key';
    readStoredSettingValueMock.mockResolvedValue(null);

    const resolved = await readBrainProviderCredential('openai');

    expect(resolved).toEqual({
      apiKey: 'env-openai-key',
      source: 'env',
      sourceKey: 'OPENAI_API_KEY',
      usedLegacyFallback: false,
    });
    expect(logSystemEventMock).not.toHaveBeenCalled();
  });

  it('throws a Brain-owned configuration error when a provider credential is missing', async () => {
    readStoredSettingValueMock.mockResolvedValue(null);

    await expect(resolveBrainProviderCredential('openai')).rejects.toMatchObject({
      message: 'OpenAI API key is missing in AI Brain provider settings.',
      code: 'CONFIGURATION_ERROR',
    });
  });
});
