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
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
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
  normalizeImageStudioModelPresets,
} from '@/shared/lib/ai/image-studio/utils/studio-settings';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SettingsState {
  studioSettings: ImageStudioSettings;
  settingsLoaded: boolean;
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
  const promptExtractModel = useBrainAssignment({
    capability: 'image_studio.prompt_extract',
  });
  const uiExtractorModel = useBrainAssignment({
    capability: 'image_studio.ui_extractor',
  });
  const generationModel = useBrainAssignment({
    capability: 'image_studio.general',
  });
  const hydratedSignatureRef = useRef<string | null>(null);
  const modelPersistSignatureRef = useRef<string | null>(null);
  const modelPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const openaiModelFallback = settingsStore.get('openai_model');
  const settingsSignature = `${projectSettingsKey ?? IMAGE_STUDIO_SETTINGS_KEY}:${studioSettingsRaw ?? ''}:${openaiModelFallback ?? ''}`;

  useEffect(() => {
    if (settingsStore.isLoading || heavySettings.isLoading || userPreferencesQuery.isLoading)
      return;
    if (hydratedSignatureRef.current === settingsSignature) {
      if (!settingsLoaded) setSettingsLoaded(true);
      return;
    }

    const stored = parseImageStudioSettings(studioSettingsRaw);
    const globalSettings = parseImageStudioSettings(globalStudioSettingsRaw);
    const hasStoredStudioSettings = Boolean(
      studioSettingsRaw && studioSettingsRaw.trim().length > 0
    );
    const hydratedBase: ImageStudioSettings =
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
                openaiModelFallback
              ),
            },
          },
        }
        : stored;
    const mergedModelPresets = normalizeImageStudioModelPresets(
      [
        ...globalSettings.targetAi.openai.modelPresets,
        ...hydratedBase.targetAi.openai.modelPresets,
      ],
      hydratedBase.targetAi.openai.model
    );
    const hydrated: ImageStudioSettings = {
      ...hydratedBase,
      targetAi: {
        ...hydratedBase.targetAi,
        openai: {
          ...hydratedBase.targetAi.openai,
          modelPresets: mergedModelPresets,
        },
      },
    };

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
    globalStudioSettingsRaw,
  ]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (settingsStore.isLoading || heavySettings.isLoading || userPreferencesQuery.isLoading)
      return;

    const activeModel = studioSettings.targetAi.openai.model.trim();
    if (!activeModel) return;
    const targetKey = projectSettingsKey ?? IMAGE_STUDIO_SETTINGS_KEY;
    if (!targetKey) return;

    const normalizedPresets = normalizeImageStudioModelPresets(
      studioSettings.targetAi.openai.modelPresets,
      activeModel
    );
    const persisted = parseImageStudioSettings(studioSettingsRaw);
    const persistedModel = persisted.targetAi.openai.model.trim();
    const persistedPresets = normalizeImageStudioModelPresets(
      persisted.targetAi.openai.modelPresets,
      persistedModel
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
      void updateSetting
        .mutateAsync({
          key: targetKey,
          value: serializeSetting(nextSettings),
        })
        .catch(() => {
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

  const saveStudioSettings = useCallback(
    async (options?: {
      silent?: boolean;
      settingsOverride?: ImageStudioSettings;
      verifyPersisted?: boolean;
    }) => {
      const targetKey = projectSettingsKey ?? IMAGE_STUDIO_SETTINGS_KEY;
      const scope: 'project' | 'global' = projectSettingsKey ? 'project' : 'global';
      const sourcePayload = options?.settingsOverride ?? studioSettings;
      const effectivePromptExtractModel =
        promptExtractModel.effectiveModelId.trim() || sourcePayload.promptExtraction.gpt.model.trim();
      const effectiveUiExtractorModel =
        uiExtractorModel.effectiveModelId.trim() || sourcePayload.uiExtractor.model.trim();
      const effectiveGenerationModel =
        generationModel.effectiveModelId.trim() || sourcePayload.targetAi.openai.model.trim();
      const normalizedModelPresets = effectiveGenerationModel
        ? normalizeImageStudioModelPresets(
          sourcePayload.targetAi.openai.modelPresets,
          effectiveGenerationModel
        )
        : sourcePayload.targetAi.openai.modelPresets;
      const payload: ImageStudioSettings = {
        ...sourcePayload,
        promptExtraction: {
          ...sourcePayload.promptExtraction,
          gpt: {
            ...sourcePayload.promptExtraction.gpt,
            model: effectivePromptExtractModel,
          },
        },
        uiExtractor: {
          ...sourcePayload.uiExtractor,
          model: effectiveUiExtractorModel,
        },
        targetAi: {
          ...sourcePayload.targetAi,
          openai: {
            ...sourcePayload.targetAi.openai,
            model: effectiveGenerationModel,
            modelPresets: normalizedModelPresets,
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
      generationModel.effectiveModelId,
      heavySettings,
      projectSettingsKey,
      promptExtractModel.effectiveModelId,
      settingsStore,
      studioSettings,
      toast,
      uiExtractorModel.effectiveModelId,
      updateSetting,
    ]
  );

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
    heavySettings.refetch().catch(() => {
      /* ignore */
    });
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
