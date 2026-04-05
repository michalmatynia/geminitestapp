import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ThemeColorsProvider,
  useThemeColorsState,
} from '@/features/cms/components/page-builder/theme/ThemeColorsContext';
import {
  useThemeSettingsActions,
  useThemeSettingsValue,
} from '@/features/cms/components/page-builder/ThemeSettingsContext';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import { useTeachingAgents } from '@/features/ai/agentcreator/teaching/hooks/useAgentTeachingQueries';

vi.mock('@/features/cms/components/page-builder/ThemeSettingsContext', () => ({
  useThemeSettingsValue: vi.fn(),
  useThemeSettingsActions: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainAssignment', () => ({
  useBrainAssignment: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: vi.fn(),
}));

vi.mock('@/features/ai/agentcreator/teaching/hooks/useAgentTeachingQueries', () => ({
  useTeachingAgents: vi.fn(),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createMutationV2: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
  };
});

describe('ThemeColorsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useThemeSettingsValue).mockReturnValue({
      activeColorSchemeId: null,
      colorSchemes: [],
      primaryColor: '#111111',
      secondaryColor: '#222222',
      accentColor: '#333333',
      backgroundColor: '#000000',
      surfaceColor: '#111111',
      textColor: '#ffffff',
      mutedTextColor: '#999999',
      borderColor: '#444444',
    });
    vi.mocked(useThemeSettingsActions).mockReturnValue({
      setTheme: vi.fn(),
      update: vi.fn(),
    });

    vi.mocked(useBrainAssignment).mockReturnValue({
      assignment: {
        enabled: true,
        provider: 'agent',
        modelId: '',
        agentId: 'agent-42',
        temperature: 0.3,
        maxTokens: 800,
        systemPrompt: '',
        notes: null,
      },
      effectiveModelId: '',
    });
  });

  it('exposes only Brain routing fields and skips legacy routing queries', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeColorsProvider>{children}</ThemeColorsProvider>
    );

    const { result } = renderHook(() => useThemeColorsState(), { wrapper });
    const value = result.current as unknown as Record<string, unknown>;

    expect(result.current.brainAiProvider).toBe('agent');
    expect(result.current.brainAiAgentId).toBe('agent-42');
    expect('schemeAiProvider' in value).toBe(false);
    expect('setSchemeAiProvider' in value).toBe(false);
    expect('schemeProviderOptions' in value).toBe(false);
    expect('schemeAiModelId' in value).toBe(false);
    expect('setSchemeAiModelId' in value).toBe(false);
    expect('modelOptions' in value).toBe(false);
    expect('schemeAiAgentId' in value).toBe(false);
    expect('setSchemeAiAgentId' in value).toBe(false);
    expect('agentOptions' in value).toBe(false);
    expect(vi.mocked(useTeachingAgents)).not.toHaveBeenCalled();
    expect(vi.mocked(useBrainModelOptions)).not.toHaveBeenCalled();
  });
});
