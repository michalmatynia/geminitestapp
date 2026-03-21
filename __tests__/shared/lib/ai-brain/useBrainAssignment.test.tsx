import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AI_BRAIN_SETTINGS_KEY,
  defaultBrainSettings,
} from '@/shared/lib/ai-brain/settings';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useBrainModels } from '@/shared/lib/ai-brain/hooks/useBrainQueries';

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainQueries', () => ({
  useBrainModels: vi.fn(),
}));

describe('useBrainAssignment', () => {
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

  it('resolves capability assignments without using model discovery', () => {
    const settings = {
      ...defaultBrainSettings,
      capabilities: {
        ...defaultBrainSettings.capabilities,
        'cms.css_stream': {
          ...defaultBrainSettings.defaults,
          enabled: true,
          provider: 'agent' as const,
          modelId: '',
          agentId: 'agent-7',
          temperature: 0.4,
          maxTokens: 1200,
        },
      },
    };

    vi.mocked(useSettingsStore).mockReturnValue({
      map: new Map([[AI_BRAIN_SETTINGS_KEY, JSON.stringify(settings)]]),
      isLoading: false,
      isFetching: false,
      error: null,
      get: (key: string) => (key === AI_BRAIN_SETTINGS_KEY ? JSON.stringify(settings) : undefined),
      getBoolean: (_key: string, fallback: boolean = false) => fallback,
      getNumber: (_key: string, fallback?: number) => fallback,
      refetch: () => {},
    });

    const { result } = renderHook(() =>
      useBrainAssignment({ capability: 'cms.css_stream' })
    );

    expect(result.current.assignment.provider).toBe('agent');
    expect(result.current.assignment.agentId).toBe('agent-7');
    expect(result.current.effectiveModelId).toBe('');
    expect(vi.mocked(useBrainModels)).not.toHaveBeenCalled();
  });

  it('falls back to feature assignments when resolving by feature', () => {
    const settings = {
      ...defaultBrainSettings,
      assignments: {
        ...defaultBrainSettings.assignments,
        chatbot: {
          ...defaultBrainSettings.defaults,
          enabled: true,
          provider: 'model' as const,
          modelId: 'gpt-4o-mini',
          agentId: '',
          temperature: 0.25,
          maxTokens: 900,
        },
      },
    };

    vi.mocked(useSettingsStore).mockReturnValue({
      map: new Map([[AI_BRAIN_SETTINGS_KEY, JSON.stringify(settings)]]),
      isLoading: false,
      isFetching: false,
      error: null,
      get: (key: string) => (key === AI_BRAIN_SETTINGS_KEY ? JSON.stringify(settings) : undefined),
      getBoolean: (_key: string, fallback: boolean = false) => fallback,
      getNumber: (_key: string, fallback?: number) => fallback,
      refetch: () => {},
    });

    const { result } = renderHook(() => useBrainAssignment({ feature: 'chatbot' }));

    expect(result.current.assignment.provider).toBe('model');
    expect(result.current.assignment.modelId).toBe('gpt-4o-mini');
    expect(result.current.effectiveModelId).toBe('gpt-4o-mini');
  });

  it('throws when no feature or capability is provided', () => {
    expect(() => renderHook(() => useBrainAssignment({}))).toThrow(
      'useBrainAssignment requires a feature or capability.'
    );
  });
});
