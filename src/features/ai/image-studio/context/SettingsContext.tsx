'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import { IMAGE_STUDIO_SETTINGS_KEY, parseImageStudioSettings, type ImageStudioSettings, defaultImageStudioSettings } from '../utils/studio-settings';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SettingsState {
  studioSettings: ImageStudioSettings;
  settingsLoaded: boolean;
}

export interface SettingsActions {
  setStudioSettings: React.Dispatch<React.SetStateAction<ImageStudioSettings>>;
  saveStudioSettings: () => Promise<void>;
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
  const studioSettingsRaw = heavyMap.get(IMAGE_STUDIO_SETTINGS_KEY);
  const openaiModelFallback = settingsStore.get('openai_model');

  useEffect(() => {
    if (settingsLoaded) return;
    if (settingsStore.isLoading || heavySettings.isLoading) return;

    const stored = parseImageStudioSettings(studioSettingsRaw);
    const hydrated: ImageStudioSettings =
      openaiModelFallback && stored.targetAi.openai.model === defaultImageStudioSettings.targetAi.openai.model
        ? {
          ...stored,
          targetAi: {
            ...stored.targetAi,
            openai: {
              ...stored.targetAi.openai,
              model: openaiModelFallback,
            },
          },
        }
        : stored;

    setStudioSettings(hydrated);
    setSettingsLoaded(true);
  }, [settingsLoaded, settingsStore.isLoading, heavySettings.isLoading, studioSettingsRaw, openaiModelFallback]);

  const saveStudioSettings = useCallback(async () => {
    await updateSetting.mutateAsync({
      key: IMAGE_STUDIO_SETTINGS_KEY,
      value: serializeSetting(studioSettings),
    });
    toast('Settings saved.', { variant: 'success' });
  }, [studioSettings, updateSetting, toast]);

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
