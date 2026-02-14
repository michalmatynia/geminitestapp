'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useUserPreferences } from '@/features/auth/hooks/useUserPreferences';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import { useProjectsState } from './ProjectsContext';
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
  const { projectId: selectedProjectId } = useProjectsState();
  const settingsStore = useSettingsStore();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const userPreferencesQuery = useUserPreferences();
  const updateSetting = useUpdateSetting();

  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [studioSettings, setStudioSettings] = useState<ImageStudioSettings>(defaultImageStudioSettings);
  const hydratedSignatureRef = useRef<string | null>(null);
  const modelPersistSignatureRef = useRef<string | null>(null);
  const modelPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const liveProjectId = selectedProjectId.trim();
  const activeProjectIdFromPreferences =
    typeof userPreferencesQuery.data?.imageStudioLastProjectId === 'string'
      ? userPreferencesQuery.data.imageStudioLastProjectId.trim()
      : '';
  const legacyActiveProjectId = parseImageStudioActiveProject(
    heavyMap.get(IMAGE_STUDIO_ACTIVE_PROJECT_KEY)
  );
  const activeProjectId = liveProjectId || activeProjectIdFromPreferences || legacyActiveProjectId;
  const projectSettingsKey = getImageStudioProjectSettingsKey(activeProjectId);
  const studioProjectSettingsRaw =
    projectSettingsKey ? heavyMap.get(projectSettingsKey) : null;
  const globalStudioSettingsRaw = heavyMap.get(IMAGE_STUDIO_SETTINGS_KEY);
  const studioSettingsRaw = studioProjectSettingsRaw ?? globalStudioSettingsRaw;
  const openaiModelFallback = settingsStore.get('openai_model');
  const settingsSignature = `${projectSettingsKey ?? IMAGE_STUDIO_SETTINGS_KEY}:${studioSettingsRaw ?? ''}:${openaiModelFallback ?? ''}`;

  useEffect(() => {
    if (settingsStore.isLoading || heavySettings.isLoading || userPreferencesQuery.isLoading) return;
    if (hydratedSignatureRef.current === settingsSignature) {
      if (!settingsLoaded) setSettingsLoaded(true);
      return;
    }

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
    hydratedSignatureRef.current = settingsSignature;
    setSettingsLoaded(true);
  }, [
    settingsSignature,
    settingsLoaded,
    settingsStore.isLoading,
    heavySettings.isLoading,
    userPreferencesQuery.isLoading,
    studioSettingsRaw,
    openaiModelFallback,
  ]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (settingsStore.isLoading || heavySettings.isLoading || userPreferencesQuery.isLoading) return;

    const activeModel = studioSettings.targetAi.openai.model.trim();
    if (!activeModel) return;
    const targetKey = projectSettingsKey ?? IMAGE_STUDIO_SETTINGS_KEY;
    if (!targetKey) return;

    const normalizedPresets = normalizeImageStudioModelPresets(
      studioSettings.targetAi.openai.modelPresets,
      activeModel,
    );
    const persisted = parseImageStudioSettings(studioSettingsRaw);
    const persistedModel = persisted.targetAi.openai.model.trim();
    const persistedPresets = normalizeImageStudioModelPresets(
      persisted.targetAi.openai.modelPresets,
      persistedModel,
    );

    const presetsChanged =
      normalizedPresets.length !== persistedPresets.length ||
      normalizedPresets.some((entry: string, index: number) => entry !== persistedPresets[index]);
    const modelChanged = activeModel !== persistedModel;
    if (!modelChanged && !presetsChanged) {
      modelPersistSignatureRef.current = null;
      return;
    }

    const persistSignature = `${targetKey}:${activeModel}:${normalizedPresets.join('|')}`;
    if (modelPersistSignatureRef.current === persistSignature) return;

    if (modelPersistTimerRef.current) {
      clearTimeout(modelPersistTimerRef.current);
    }
    modelPersistTimerRef.current = setTimeout(() => {
      modelPersistSignatureRef.current = persistSignature;
      const nextSettings: ImageStudioSettings = {
        ...persisted,
        targetAi: {
          ...persisted.targetAi,
          openai: {
            ...persisted.targetAi.openai,
            api: 'images',
            model: activeModel,
            modelPresets: normalizedPresets,
          },
        },
      };
      void updateSetting.mutateAsync({
        key: targetKey,
        value: serializeSetting(nextSettings),
      }).catch(() => {
        if (modelPersistSignatureRef.current === persistSignature) {
          modelPersistSignatureRef.current = null;
        }
      });
    }, 450);

    return () => {
      if (modelPersistTimerRef.current) {
        clearTimeout(modelPersistTimerRef.current);
        modelPersistTimerRef.current = null;
      }
    };
  }, [
    settingsLoaded,
    settingsStore.isLoading,
    heavySettings.isLoading,
    userPreferencesQuery.isLoading,
    studioSettings.targetAi.openai.model,
    studioSettings.targetAi.openai.modelPresets,
    projectSettingsKey,
    studioSettingsRaw,
    updateSetting,
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
    hydratedSignatureRef.current = null;
    modelPersistSignatureRef.current = null;
    if (modelPersistTimerRef.current) {
      clearTimeout(modelPersistTimerRef.current);
      modelPersistTimerRef.current = null;
    }
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
