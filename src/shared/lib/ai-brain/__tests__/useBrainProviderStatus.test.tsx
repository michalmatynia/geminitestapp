import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBrainProviderStatus } from '@/shared/lib/ai-brain/hooks/useBrainProviderStatus';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: vi.fn(),
}));

describe('useBrainProviderStatus', () => {
  beforeEach(() => {
    vi.mocked(useSettingsStore).mockReturnValue({
      get: vi.fn((_key: string) => undefined),
    } as unknown as ReturnType<typeof useSettingsStore>);
  });

  it('marks a vendor as configured when the backing setting is present', () => {
    vi.mocked(useSettingsStore).mockReturnValue({
      get: vi.fn((key: string) => (key === 'openai_api_key' ? 'sk-live' : undefined)),
    } as unknown as ReturnType<typeof useSettingsStore>);

    const { result } = renderHook(() => useBrainProviderStatus('openai'));

    expect(result.current).toMatchObject({
      vendor: 'openai',
      label: 'OpenAI',
      settingKey: 'openai_api_key',
      configured: true,
      statusText: 'configured in AI Brain',
    });
    expect(result.current.settingsPath).toBe('ai_brain.providers.openai_api_key');
  });

  it('marks a vendor as missing when the setting is blank', () => {
    vi.mocked(useSettingsStore).mockReturnValue({
      get: vi.fn((key: string) => (key === 'gemini_api_key' ? '   ' : undefined)),
    } as unknown as ReturnType<typeof useSettingsStore>);

    const { result } = renderHook(() => useBrainProviderStatus('gemini'));

    expect(result.current).toMatchObject({
      vendor: 'gemini',
      label: 'Gemini',
      settingKey: 'gemini_api_key',
      configured: false,
      statusText: 'missing',
    });
  });
});
