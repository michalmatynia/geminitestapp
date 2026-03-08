import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBrainProviderStatus } from '@/shared/lib/ai-brain/hooks/useBrainProviderStatus';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: vi.fn(),
}));

describe('useBrainProviderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSettingsStore).mockReturnValue({
      map: new Map(),
      isLoading: false,
      isFetching: false,
      error: null,
      get: () => undefined,
      getBoolean: (_key: string, fallback: boolean = false) => fallback,
      getNumber: (_key: string, fallback?: number) => fallback,
      refetch: () => {},
    });
  });

  it('reports provider configuration from the shared AI Brain setting key map', () => {
    vi.mocked(useSettingsStore).mockReturnValue({
      map: new Map([['openai_api_key', ' brain-openai-key ']]),
      isLoading: false,
      isFetching: false,
      error: null,
      get: (key: string) => (key === 'openai_api_key' ? ' brain-openai-key ' : undefined),
      getBoolean: (_key: string, fallback: boolean = false) => fallback,
      getNumber: (_key: string, fallback?: number) => fallback,
      refetch: () => {},
    });

    const { result } = renderHook(() => useBrainProviderStatus('openai'));

    expect(result.current).toEqual({
      vendor: 'openai',
      label: 'OpenAI',
      settingKey: 'openai_api_key',
      configured: true,
      statusText: 'configured in AI Brain',
    });
  });

  it('reports missing provider configuration when no Brain key is present', () => {
    const { result } = renderHook(() => useBrainProviderStatus('gemini'));

    expect(result.current).toEqual({
      vendor: 'gemini',
      label: 'Gemini',
      settingKey: 'gemini_api_key',
      configured: false,
      statusText: 'missing',
    });
  });
});
