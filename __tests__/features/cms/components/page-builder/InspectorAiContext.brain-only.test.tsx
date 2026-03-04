import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InspectorAiProvider,
  useInspectorAi,
} from '@/features/cms/components/page-builder/context/InspectorAiContext';
import { usePageBuilder } from '@/features/cms/hooks/usePageBuilderContext';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import { useTeachingAgents } from '@/features/ai/agentcreator/teaching/hooks/useAgentTeachingQueries';

vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilder: vi.fn(),
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

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
  };
});

describe('InspectorAiContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePageBuilder).mockReturnValue({
      state: {
        currentPage: null,
        sections: [],
      },
      selectedSection: null,
      selectedBlock: null,
      selectedColumn: null,
      selectedColumnParentSection: null,
      selectedParentSection: null,
      selectedParentColumn: null,
      selectedParentBlock: null,
    } as unknown as ReturnType<typeof usePageBuilder>);

    vi.mocked(useBrainAssignment).mockReturnValue({
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'gpt-4o-mini',
        agentId: '',
        temperature: 0.25,
        maxTokens: 900,
        systemPrompt: '',
        notes: null,
      },
      effectiveModelId: 'gpt-4o-mini',
    });
  });

  it('exposes only Brain routing fields and skips legacy routing queries', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <InspectorAiProvider
        customCssValue=''
        customCssAiConfig={{ prompt: '' }}
        onUpdateCss={vi.fn()}
        onUpdateSettings={vi.fn()}
        onUpdateCustomCssAiConfig={vi.fn()}
        contentAiAllowedKeys={[]}
      >
        {children}
      </InspectorAiProvider>
    );

    const { result } = renderHook(() => useInspectorAi(), { wrapper });
    const value = result.current as unknown as Record<string, unknown>;

    expect(result.current.brainAiProvider).toBe('model');
    expect(result.current.brainAiModelId).toBe('gpt-4o-mini');
    expect('contentAiProvider' in value).toBe(false);
    expect('setContentAiProvider' in value).toBe(false);
    expect('contentAiModelId' in value).toBe(false);
    expect('setContentAiModelId' in value).toBe(false);
    expect('contentAiAgentId' in value).toBe(false);
    expect('setContentAiAgentId' in value).toBe(false);
    expect('providerOptions' in value).toBe(false);
    expect('modelOptions' in value).toBe(false);
    expect('agentOptions' in value).toBe(false);
    expect(vi.mocked(useTeachingAgents)).not.toHaveBeenCalled();
    expect(vi.mocked(useBrainModelOptions)).not.toHaveBeenCalled();
  });
});
