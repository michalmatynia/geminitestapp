// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';

import {
  ImageStudioSettingsProvider,
  useImageStudioSettingsActions,
  useImageStudioSettingsContext,
  useImageStudioSettingsState,
} from './ImageStudioSettingsContext';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  settingsStoreRefetch: vi.fn(),
  settingsStoreGet: vi.fn(),
  heavyRefetch: vi.fn(),
  imageModelsRefetch: vi.fn(),
  updateSettingMutate: vi.fn(),
  runCardBackfill: vi.fn(),
  toggleProjectSequencingOperation: vi.fn(),
  moveProjectSequencingOperation: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: mocks.settingsStoreGet,
    isFetching: false,
    isLoading: false,
    refetch: mocks.settingsStoreRefetch,
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => ({
    data: new Map<string, string>(),
    isLoading: false,
    refetch: mocks.heavyRefetch,
  }),
  useUpdateSetting: () => ({
    mutateAsync: mocks.updateSettingMutate,
    isPending: false,
  }),
}));

vi.mock('@/shared/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    isLoading: false,
    data: {},
  }),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainAssignment', () => ({
  useBrainAssignment: () => ({
    effectiveModelId: 'gpt-5.4-mini',
  }),
}));

vi.mock('./ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: '',
  }),
}));

vi.mock('../hooks/useImageStudioQueries', () => ({
  useStudioImageModels: () => ({
    isFetching: false,
    refetch: mocks.imageModelsRefetch,
  }),
}));

vi.mock('./settings/useMaintenanceActions', () => ({
  useMaintenanceActions: () => ({
    backfillRunning: false,
    backfillResultText: '',
    runCardBackfill: mocks.runCardBackfill,
  }),
}));

vi.mock('./settings/useModelAwareSettings', () => ({
  useModelAwareSettings: () => ({
    modelCapabilities: {
      supportsUser: true,
      supportsOutputFormat: true,
      supportsCount: true,
      supportsModeration: true,
      supportsOutputCompression: true,
      supportsPartialImages: true,
      supportsStream: true,
      sizeOptions: ['1024x1024'],
      qualityOptions: ['auto'],
      backgroundOptions: ['auto'],
      formatOptions: ['png'],
    },
    isGpt52Model: false,
    modelAwareSizeValue: '1024x1024',
    modelAwareQualityValue: 'auto',
    modelAwareBackgroundValue: 'auto',
    modelAwareFormatValue: 'png',
    modelAwareSizeOptions: [{ label: '1024x1024', value: '1024x1024' }],
    modelAwareQualityOptions: [{ label: 'auto', value: 'auto' }],
    modelAwareBackgroundOptions: [{ label: 'auto', value: 'auto' }],
    modelAwareFormatOptions: [{ label: 'png', value: 'png' }],
  }),
}));

vi.mock('./settings/useProjectSequencingActions', () => ({
  useProjectSequencingActions: () => ({
    toggleProjectSequencingOperation: mocks.toggleProjectSequencingOperation,
    moveProjectSequencingOperation: mocks.moveProjectSequencingOperation,
  }),
}));

vi.mock('./settings/useSettingsHydration', () => ({
  useSettingsHydration: () => {},
}));

describe('ImageStudioSettingsContext', () => {
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.settingsStoreRefetch.mockReset();
    mocks.settingsStoreGet.mockReset().mockReturnValue(undefined);
    mocks.heavyRefetch.mockReset().mockResolvedValue(undefined);
    mocks.imageModelsRefetch.mockReset().mockResolvedValue(undefined);
    mocks.updateSettingMutate.mockReset().mockResolvedValue(undefined);
    mocks.runCardBackfill.mockReset().mockResolvedValue(undefined);
    mocks.toggleProjectSequencingOperation.mockReset();
    mocks.moveProjectSequencingOperation.mockReset();
  });

  it('throws outside the provider for the strict hooks', () => {
    expect(() => renderHook(() => useImageStudioSettingsState())).toThrow(
      'useImageStudioSettingsState must be used within ImageStudioSettingsProvider'
    );
    expect(() => renderHook(() => useImageStudioSettingsActions())).toThrow(
      'useImageStudioSettingsActions must be used within ImageStudioSettingsProvider'
    );
    expect(() => renderHook(() => useImageStudioSettingsContext())).toThrow(
      'useImageStudioSettingsState must be used within ImageStudioSettingsProvider'
    );
  });

  it('updates local settings state through provider actions', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ImageStudioSettingsProvider>{children}</ImageStudioSettingsProvider>
    );

    const { result } = renderHook(
      () => ({
        state: useImageStudioSettingsState(),
        actions: useImageStudioSettingsActions(),
        context: useImageStudioSettingsContext(),
      }),
      { wrapper }
    );

    expect(result.current.state.studioSettings).toEqual(defaultImageStudioSettings);
    expect(result.current.context.settingsLoaded).toBe(false);

    act(() => {
      result.current.actions.handleAdvancedOverridesChange('[]');
      result.current.actions.handlePromptValidationRulesChange('{');
      result.current.actions.setActiveSettingsTab('generation');
      result.current.actions.setBackfillProjectId('project-99');
    });

    expect(result.current.state.advancedOverridesError).toBe('Must be a JSON object (or null).');
    expect(result.current.state.promptValidationRulesError).not.toBeNull();
    expect(result.current.state.activeSettingsTab).toBe('generation');
    expect(result.current.state.backfillProjectId).toBe('project-99');

    act(() => {
      result.current.actions.handleAdvancedOverridesChange('{"temperature":0.5}');
      result.current.actions.resetStudioSettings();
    });

    expect(result.current.state.advancedOverridesError).toBeNull();
    expect(result.current.state.studioSettings.targetAi.openai.advanced_overrides).toEqual(
      defaultImageStudioSettings.targetAi.openai.advanced_overrides
    );

    await act(async () => {
      await result.current.actions.handleRefresh();
    });

    expect(mocks.settingsStoreRefetch).toHaveBeenCalledTimes(1);
    expect(mocks.heavyRefetch).toHaveBeenCalledTimes(1);
  });
});
