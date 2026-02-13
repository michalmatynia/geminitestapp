'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
  parseImageStudioActiveProject,
} from '../utils/project-session';
import {
  IMAGE_STUDIO_SETTINGS_KEY,
  getImageStudioProjectSettingsKey,
  parseImageStudioSettings,
  type ImageStudioSettings,
  defaultImageStudioSettings,
  normalizeImageStudioModelPresets,
} from '../utils/studio-settings';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SettingsState {
  studioSettings: ImageStudioSettings;
  settingsLoaded: boolean;
}

export interface SettingsActions {
  setStudioSettings: React.Dispatch<React.SetStateAction<ImageStudioSettings>>;
  saveStudioSettings: (options?: { silent?: boolean }) => Promise<void>;
  resetStudioSettings: () => void;
  handleRefreshSettings: () => void;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const SettingsStateContext = createContext<SettingsState | null>(null);
const SettingsActionsContext = createContext<SettingsActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();

  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [studioSettings, setStudioSettings] = useState<ImageStudioSettings>(defaultImageStudioSettings);

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const activeProjectId = parseImageStudioActiveProject(
    heavyMap.get(IMAGE_STUDIO_ACTIVE_PROJECT_KEY)
  );
  const projectSettingsKey = getImageStudioProjectSettingsKey(activeProjectId);
  const studioProjectSettingsRaw =
    projectSettingsKey ? heavyMap.get(projectSettingsKey) : null;
  const globalStudioSettingsRaw = heavyMap.get(IMAGE_STUDIO_SETTINGS_KEY);
  const studioSettingsRaw = studioProjectSettingsRaw ?? globalStudioSettingsRaw;
  const openaiModelFallback = settingsStore.get('openai_model');

  useEffect(() => {
    if (settingsLoaded) return;
    if (settingsStore.isLoading || heavySettings.isLoading) return;

    const stored = parseImageStudioSettings(studioSettingsRaw);
    const hasStoredStudioSettings = Boolean(
      studioSettingsRaw && studioSettingsRaw.trim().length > 0
    );
    const hydrated: ImageStudioSettings =
      openaiModelFallback && !hasStoredStudioSettings
        ? {
          ...stored,
          targetAi: {
            ...stored.targetAi,
            openai: {
              ...stored.targetAi.openai,
              model: openaiModelFallback,
              modelPresets: normalizeImageStudioModelPresets(
                stored.targetAi.openai.modelPresets,
                openaiModelFallback,
              ),
            },
          },
        }
        : stored;

    setStudioSettings(hydrated);
    setSettingsLoaded(true);
  }, [
    settingsLoaded,
    settingsStore.isLoading,
    heavySettings.isLoading,
    studioSettingsRaw,
    openaiModelFallback,
  ]);

  const saveStudioSettings = useCallback(async (options?: { silent?: boolean }) => {
    const targetKey = projectSettingsKey ?? IMAGE_STUDIO_SETTINGS_KEY;
    await updateSetting.mutateAsync({
      key: targetKey,
      value: serializeSetting(studioSettings),
    });
    if (options?.silent === false) {
      toast('Settings saved.', { variant: 'success' });
    }
  }, [projectSettingsKey, studioSettings, updateSetting, toast]);

  const resetStudioSettings = useCallback(() => {
    setStudioSettings(defaultImageStudioSettings);
  }, []);

  const handleRefreshSettings = useCallback((): void => {
    setSettingsLoaded(false);
    settingsStore.refetch();
    void heavySettings.refetch().catch(() => {});
  }, [settingsStore, heavySettings]);

  const state = useMemo<SettingsState>(
    () => ({ studioSettings, settingsLoaded }),
    [studioSettings, settingsLoaded]
  );

  const actions = useMemo<SettingsActions>(
    () => ({ setStudioSettings, saveStudioSettings, resetStudioSettings, handleRefreshSettings }),
    [saveStudioSettings, handleRefreshSettings]
  );

  return (
    <SettingsActionsContext.Provider value={actions}>
      <SettingsStateContext.Provider value={state}>
        {children}
      </SettingsStateContext.Provider>
    </SettingsActionsContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useSettingsState(): SettingsState {
  const ctx = useContext(SettingsStateContext);
  if (!ctx) throw new Error('useSettingsState must be used within a SettingsProvider');
  return ctx;
}

export function useSettingsActions(): SettingsActions {
  const ctx = useContext(SettingsActionsContext);
  if (!ctx) throw new Error('useSettingsActions must be used within a SettingsProvider');
  return ctx;
}

export function useSettings(): SettingsState & SettingsActions {
  return { ...useSettingsState(), ...useSettingsActions() };
}
