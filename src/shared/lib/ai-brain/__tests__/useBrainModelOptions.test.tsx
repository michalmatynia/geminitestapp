import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { defaultBrainAssignment } from '@/shared/lib/ai-brain/settings';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useBrainModels } from '@/shared/lib/ai-brain/hooks/useBrainQueries';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

vi.mock('@/shared/lib/ai-brain/hooks/useBrainAssignment', () => ({
  useBrainAssignment: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainQueries', () => ({
  useBrainModels: vi.fn(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: vi.fn(),
}));

describe('useBrainModelOptions', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    refetch.mockReset();
    vi.mocked(useSettingsStore).mockReturnValue({
      isLoading: false,
    } as unknown as ReturnType<typeof useSettingsStore>);
    vi.mocked(useBrainAssignment).mockReturnValue({
      assignment: defaultBrainAssignment,
      effectiveModelId: '',
    });
    vi.mocked(useBrainModels).mockReturnValue({
      isLoading: false,
      data: undefined,
      refetch,
    } as unknown as ReturnType<typeof useBrainModels>);
  });

  it('filters incompatible families, preserves unknown models, dedupes sources, and keeps the effective model visible', () => {
    vi.mocked(useBrainAssignment).mockReturnValue({
      assignment: {
        ...defaultBrainAssignment,
        modelId: 'manual-selection',
      },
      effectiveModelId: 'manual-selection',
    });

    vi.mocked(useBrainModels).mockReturnValue({
      isLoading: false,
      data: {
        models: [' validator-a ', 'chat-a', 'unclassified-a', 'validator-a'],
        descriptors: {
          'validator-a': { family: 'validation' },
          'chat-a': { family: 'chat' },
          'validator-b': { family: 'validation' },
          'manual-selection': { family: 'chat' },
        },
        sources: {
          modelPresets: ['validator-b', 'chat-a'],
          paidModels: [' validator-a '],
          configuredOllamaModels: [''],
          liveOllamaModels: ['unclassified-a'],
        },
        warning: {
          message: '  partial model catalog  ',
        },
      },
      refetch,
    } as unknown as ReturnType<typeof useBrainModels>);

    const { result } = renderHook(() =>
      useBrainModelOptions({ capability: 'product.validation.runtime' })
    );

    expect(result.current.models).toEqual([
      'validator-a',
      'unclassified-a',
      'validator-b',
      'manual-selection',
    ]);
    expect(result.current.assignment.modelId).toBe('manual-selection');
    expect(result.current.effectiveModelId).toBe('manual-selection');
    expect(result.current.sourceWarnings).toEqual(['partial model catalog']);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns normalized model options without family filtering and exposes refresh and loading state', () => {
    vi.mocked(useSettingsStore).mockReturnValue({
      isLoading: true,
    } as unknown as ReturnType<typeof useSettingsStore>);

    vi.mocked(useBrainModels).mockReturnValue({
      isLoading: false,
      data: {
        models: [' gpt-4o-mini ', 'gpt-4o-mini', 'custom-local'],
        descriptors: {},
        sources: {
          modelPresets: ['gpt-4o'],
          paidModels: ['custom-local'],
          configuredOllamaModels: ['mistral'],
          liveOllamaModels: [''],
        },
        warning: {
          message: '   ',
        },
      },
      refetch,
    } as unknown as ReturnType<typeof useBrainModels>);

    const { result } = renderHook(() =>
      useBrainModelOptions({ feature: 'products', enabled: false })
    );

    expect(useBrainModels).toHaveBeenCalledWith({ enabled: false });
    expect(result.current.models).toEqual(['gpt-4o-mini', 'custom-local', 'gpt-4o', 'mistral']);
    expect(result.current.sourceWarnings).toEqual([]);
    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.refresh();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
