'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useUserPreferences } from '@/features/auth/hooks/useUserPreferences';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import { useProjectsState } from './ProjectsContext';
import {
  IMAGE_STUDIO_SETTINGS_KEY,
  getImageStudioProjectSettingsKey,
  parseImageStudioSettings,
  type ImageStudioSettings,
  defaultImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SettingsState {
  studioSettings: ImageStudioSettings;
  settingsLoaded: boolean;
  settingsValidationError: Error | null;
}

export type SaveStudioSettingsResult = {
  key: string;
  scope: 'project' | 'global';
  verified: boolean;
  persistedSequencingEnabled: boolean;
  persistedSnapshotHash: string | null;
};

export interface SettingsActions {
  setStudioSettings: React.Dispatch<React.SetStateAction<ImageStudioSettings>>;
  saveStudioSettings: (options?: {
    silent?: boolean;
    settingsOverride?: ImageStudioSettings;
    verifyPersisted?: boolean;
  }) => Promise<SaveStudioSettingsResult>;
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
  const [studioSettings, setStudioSettings] = useState<ImageStudioSettings>(
    defaultImageStudioSettings
  );
  const [settingsValidationError, setSettingsValidationError] = useState<Error | null>(null);
  const hydratedSignatureRef = useRef<string | null>(null);

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const liveProjectId = selectedProjectId.trim();
  const activeProjectIdFromPreferences =
    typeof userPreferencesQuery.data?.imageStudioLastProjectId === 'string'
      ? userPreferencesQuery.data.imageStudioLastProjectId.trim()
      : '';
  const activeProjectId = liveProjectId || activeProjectIdFromPreferences;
  const projectSettingsKey = getImageStudioProjectSettingsKey(activeProjectId);
  const studioProjectSettingsRaw = projectSettingsKey ? heavyMap.get(projectSettingsKey) : null;
  const globalStudioSettingsRaw = heavyMap.get(IMAGE_STUDIO_SETTINGS_KEY);
  const studioSettingsRaw = studioProjectSettingsRaw ?? globalStudioSettingsRaw;
  const settingsSignature = `${projectSettingsKey ?? IMAGE_STUDIO_SETTINGS_KEY}:${studioSettingsRaw ?? ''}`;

  useEffect(() => {
    if (settingsStore.isLoading || heavySettings.isLoading || userPreferencesQuery.isLoading)
      return;
    if (hydratedSignatureRef.current === settingsSignature) {
      if (!settingsLoaded) setSettingsLoaded(true);
      return;
    }

    let hydrated = defaultImageStudioSettings;
    let parseError: Error | null = null;
    try {
      hydrated = parseImageStudioSettings(studioSettingsRaw);
    } catch (error) {
      parseError =
        error instanceof Error ? error : new Error('Invalid Image Studio settings payload.');
      logClientError(parseError, {
        context: {
          source: 'ImageStudioRuntimeSettings',
          action: 'hydrateSettings',
        },
      });
    }

    if (parseError) {
      setSettingsValidationError(parseError);
      hydratedSignatureRef.current = settingsSignature;
      setSettingsLoaded(true);
      toast(parseError.message, { variant: 'error' });
      return;
    }

    setStudioSettings(hydrated);
    setSettingsValidationError(null);
    hydratedSignatureRef.current = settingsSignature;
    setSettingsLoaded(true);
  }, [
    settingsSignature,
    settingsLoaded,
    settingsStore.isLoading,
    heavySettings.isLoading,
    userPreferencesQuery.isLoading,
    studioSettingsRaw,
    settingsStore,
    toast,
  ]);

  const saveStudioSettings = useCallback(
    async (options?: {
      silent?: boolean;
      settingsOverride?: ImageStudioSettings;
      verifyPersisted?: boolean;
    }) => {
      const targetKey = projectSettingsKey ?? IMAGE_STUDIO_SETTINGS_KEY;
      const scope: 'project' | 'global' = projectSettingsKey ? 'project' : 'global';
      const sourcePayload = options?.settingsOverride ?? studioSettings;
      const payload: ImageStudioSettings = {
        ...sourcePayload,
        targetAi: {
          ...sourcePayload.targetAi,
          openai: {
            ...sourcePayload.targetAi.openai,
            api: 'images',
          },
        },
      };
      await updateSetting.mutateAsync({
        key: targetKey,
        value: serializeSetting(payload),
      });
      let result: SaveStudioSettingsResult = {
        key: targetKey,
        scope,
        verified: false,
        persistedSequencingEnabled: Boolean(payload.projectSequencing.enabled),
        persistedSnapshotHash:
          typeof payload.projectSequencing.snapshotHash === 'string' &&
          payload.projectSequencing.snapshotHash.trim().length > 0
            ? payload.projectSequencing.snapshotHash.trim()
            : null,
      };
      if (options?.verifyPersisted) {
        settingsStore.refetch();
        const refreshed = await heavySettings.refetch();
        const persistedMap = refreshed.data ?? new Map<string, string>();
        const persistedRaw = persistedMap.get(targetKey);
        if (!persistedRaw || persistedRaw.trim().length === 0) {
          throw new Error(`Settings write completed but verification failed for "${targetKey}".`);
        }
        const persisted = parseImageStudioSettings(persistedRaw);
        const expectedSnapshotHash =
          typeof payload.projectSequencing.snapshotHash === 'string' &&
          payload.projectSequencing.snapshotHash.trim().length > 0
            ? payload.projectSequencing.snapshotHash.trim()
            : null;
        const persistedSnapshotHash =
          typeof persisted.projectSequencing.snapshotHash === 'string' &&
          persisted.projectSequencing.snapshotHash.trim().length > 0
            ? persisted.projectSequencing.snapshotHash.trim()
            : null;
        const expectedStepCount = Number.isFinite(payload.projectSequencing.snapshotStepCount)
          ? Math.max(0, Math.floor(payload.projectSequencing.snapshotStepCount))
          : 0;
        const persistedStepCount = Number.isFinite(persisted.projectSequencing.snapshotStepCount)
          ? Math.max(0, Math.floor(persisted.projectSequencing.snapshotStepCount))
          : 0;
        const sequencingEnabledMatches =
          Boolean(persisted.projectSequencing.enabled) ===
          Boolean(payload.projectSequencing.enabled);
        const snapshotHashMatches =
          expectedSnapshotHash === null || expectedSnapshotHash === persistedSnapshotHash;
        const snapshotStepCountMatches = expectedStepCount === persistedStepCount;
        if (!sequencingEnabledMatches || !snapshotHashMatches || !snapshotStepCountMatches) {
          throw new Error(
            `Settings write for "${targetKey}" could not be verified. Reload and retry.`
          );
        }
        result = {
          key: targetKey,
          scope,
          verified: true,
          persistedSequencingEnabled: Boolean(persisted.projectSequencing.enabled),
          persistedSnapshotHash: persistedSnapshotHash,
        };
      }
      if (options?.silent === false) {
        toast('Settings saved.', { variant: 'success' });
      }
      return result;
    },
    [
      heavySettings,
      projectSettingsKey,
      settingsStore,
      studioSettings,
      toast,
      updateSetting,
    ]
  );

  const resetStudioSettings = useCallback(() => {
    setStudioSettings(defaultImageStudioSettings);
  }, []);

  const handleRefreshSettings = useCallback((): void => {
    hydratedSignatureRef.current = null;
    setSettingsLoaded(false);
    settingsStore.refetch();
    heavySettings.refetch().catch(() => {
      /* ignore */
    });
  }, [settingsStore, heavySettings]);

  const state = useMemo<SettingsState>(
    () => ({ studioSettings, settingsLoaded, settingsValidationError }),
    [studioSettings, settingsLoaded, settingsValidationError]
  );

  const actions = useMemo<SettingsActions>(
    () => ({ setStudioSettings, saveStudioSettings, resetStudioSettings, handleRefreshSettings }),
    [saveStudioSettings, handleRefreshSettings]
  );

  return (
    <SettingsActionsContext.Provider value={actions}>
      <SettingsStateContext.Provider value={state}>{children}</SettingsStateContext.Provider>
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
