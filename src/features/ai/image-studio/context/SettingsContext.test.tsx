// @vitest-environment jsdom

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  IMAGE_STUDIO_SETTINGS_KEY,
  defaultImageStudioSettings,
  getImageStudioProjectSettingsKey,
} from '@/features/ai/image-studio/utils/studio-settings';

import { SettingsProvider, useSettingsActions, useSettingsState } from './SettingsContext';

const mocks = vi.hoisted(() => ({
  projectId: '',
  heavyMap: new Map<string, string>(),
  heavyRefetch: vi.fn(),
  updateSetting: vi.fn(),
  settingsStoreRefetch: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('./ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: mocks.projectId,
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => ({
    data: mocks.heavyMap,
    isLoading: false,
    refetch: mocks.heavyRefetch,
  }),
  useUpdateSetting: () => ({
    mutateAsync: mocks.updateSetting,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    isLoading: false,
    refetch: mocks.settingsStoreRefetch,
  }),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

describe('SettingsContext', () => {
  beforeEach(() => {
    mocks.projectId = '';
    mocks.heavyMap = new Map<string, string>();
    mocks.heavyRefetch.mockReset().mockResolvedValue({ data: mocks.heavyMap });
    mocks.updateSetting.mockReset().mockResolvedValue(undefined);
    mocks.settingsStoreRefetch.mockReset();
    mocks.toast.mockReset();
  });

  it('throws outside the provider for both strict hooks', () => {
    expect(() => renderHook(() => useSettingsState())).toThrow(
      'useSettingsState must be used within a SettingsProvider'
    );
    expect(() => renderHook(() => useSettingsActions())).toThrow(
      'useSettingsActions must be used within a SettingsProvider'
    );
  });

  it('hydrates defaults and saves settings through the update mutation', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SettingsProvider>{children}</SettingsProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useSettingsActions(),
        state: useSettingsState(),
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.state.settingsLoaded).toBe(true);
    });

    expect(result.current.state.studioSettings).toEqual(defaultImageStudioSettings);
    expect(result.current.state.settingsValidationError).toBeNull();

    let saveResult: Awaited<ReturnType<typeof result.current.actions.saveStudioSettings>> | null =
      null;

    await act(async () => {
      saveResult = await result.current.actions.saveStudioSettings();
    });

    expect(mocks.updateSetting).toHaveBeenCalledTimes(1);
    expect(mocks.updateSetting).toHaveBeenCalledWith({
      key: IMAGE_STUDIO_SETTINGS_KEY,
      value: expect.any(String),
    });
    expect(saveResult).toMatchObject({
      key: IMAGE_STUDIO_SETTINGS_KEY,
      scope: 'global',
      verified: false,
      persistedSequencingEnabled: false,
      persistedSnapshotHash: null,
    });
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('hydrates project-scoped settings immediately from the selected project id', async () => {
    mocks.projectId = 'project-a';
    mocks.heavyMap = new Map<string, string>([
      [
        getImageStudioProjectSettingsKey('project-a') as string,
        JSON.stringify({
          ...defaultImageStudioSettings,
          projectSequencing: {
            ...defaultImageStudioSettings.projectSequencing,
            enabled: true,
          },
        }),
      ],
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SettingsProvider>{children}</SettingsProvider>
    );

    const { result } = renderHook(() => useSettingsState(), { wrapper });

    await waitFor(() => {
      expect(result.current.settingsLoaded).toBe(true);
    });

    expect(result.current.studioSettings.projectSequencing.enabled).toBe(true);
  });
});
