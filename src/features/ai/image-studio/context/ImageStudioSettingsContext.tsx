'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUserPreferences } from '@/features/auth/hooks/useUserPreferences';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  defaultPromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
  parsePromptValidationRules,
} from '@/shared/lib/prompt-engine/settings';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';
import { internalError } from '@/shared/errors/app-error';

import { useProjectsState } from './ProjectsContext';
import { useStudioImageModels } from '../hooks/useImageStudioQueries';
import {
  defaultImageStudioSettings,
  IMAGE_STUDIO_OPENAI_API_KEY_KEY,
  IMAGE_STUDIO_SETTINGS_KEY,
  getImageStudioProjectSettingsKey,
  normalizeImageStudioModelPresets,
  parseImageStudioSettings,
  type ImageStudioSettings,
} from '../utils/studio-settings';

import { 
  type StudioSettingsTab, 
  type ImageStudioSettingsContextValue 
} from './settings/settings-types';
import { useSettingsHydration } from './settings/useSettingsHydration';
import { useModelAwareSettings } from './settings/useModelAwareSettings';
import { useMaintenanceActions } from './settings/useMaintenanceActions';

const ImageStudioSettingsContext = createContext<ImageStudioSettingsContextValue | null>(null);

export function ImageStudioSettingsProvider({ 
  children,
  onSaved 
}: { 
  children: React.ReactNode;
  onSaved?: () => void;
}): React.JSX.Element {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const userPreferencesQuery = useUserPreferences();
  const updateSetting = useUpdateSetting();
  const imageModelsQuery = useStudioImageModels();
  const { projectId: selectedProjectId } = useProjectsState();

  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<StudioSettingsTab>('prompt');
  const [studioSettings, setStudioSettings] = useState(defaultImageStudioSettings);
  const [advancedOverridesText, setAdvancedOverridesText] = useState(
    JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2)
  );
  const [advancedOverridesError, setAdvancedOverridesError] = useState<string | null>(null);
  const [imageStudioApiKey, setImageStudioApiKey] = useState<string>('');
  const [promptValidationEnabled, setPromptValidationEnabled] = useState<boolean>(
    defaultPromptEngineSettings.promptValidation.enabled
  );
  const [promptValidationRulesText, setPromptValidationRulesText] = useState(
    JSON.stringify(defaultPromptEngineSettings.promptValidation.rules, null, 2)
  );
  const [promptValidationRulesError, setPromptValidationRulesError] = useState<string | null>(null);
  const [backfillProjectId, setBackfillProjectId] = useState<string>('');
  const [backfillDryRun, setBackfillDryRun] = useState<boolean>(true);
  const [backfillIncludeHeuristicGenerationLinks, setBackfillIncludeHeuristicGenerationLinks] = useState<boolean>(true);
  const [modelToAdd, setModelToAdd] = useState<string>('');
  const hydratedSignatureRef = useRef<string | null>(null);
  const presetPersistSignatureRef = useRef<string | null>(null);
  const presetPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const promptEngineRaw = settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY);
  const promptEngineSettings = useMemo(
    () => parsePromptEngineSettings(promptEngineRaw),
    [promptEngineRaw]
  );
  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const liveProjectId = selectedProjectId.trim();
  const activeProjectIdFromPreferences =
    typeof userPreferencesQuery.data?.imageStudioLastProjectId === 'string'
      ? userPreferencesQuery.data.imageStudioLastProjectId.trim()
      : '';
  const activeProjectId = liveProjectId || activeProjectIdFromPreferences;
  const projectSettingsKey = getImageStudioProjectSettingsKey(activeProjectId);
  const globalStudioSettingsRaw = heavyMap.get(IMAGE_STUDIO_SETTINGS_KEY);
  const projectStudioSettingsRaw =
    projectSettingsKey ? heavyMap.get(projectSettingsKey) : null;
  const studioSettingsRaw = projectStudioSettingsRaw ?? globalStudioSettingsRaw;
  const openaiModelFallback = settingsStore.get('openai_model');
  const apiKeyFallback = settingsStore.get(IMAGE_STUDIO_OPENAI_API_KEY_KEY) ?? settingsStore.get('openai_api_key') ?? '';
  const hydrationSignature = `${projectSettingsKey ?? IMAGE_STUDIO_SETTINGS_KEY}:${studioSettingsRaw ?? ''}:${openaiModelFallback ?? ''}:${apiKeyFallback}:${promptEngineRaw ?? ''}`;

  useSettingsHydration({
    settingsStore,
    heavySettings,
    userPreferencesQuery,
    hydratedSignatureRef,
    settingsLoaded,
    setSettingsLoaded,
    studioSettingsRaw,
    globalStudioSettingsRaw,
    openaiModelFallback,
    apiKeyFallback,
    promptEngineRaw,
    setStudioSettings,
    setAdvancedOverridesText,
    setImageStudioApiKey,
    setPromptValidationEnabled,
    setPromptValidationRulesText,
    setPromptValidationRulesError,
    setModelToAdd,
    hydrationSignature,
  });

  const handleRefresh = useCallback(async (): Promise<void> => {
    hydratedSignatureRef.current = null;
    setSettingsLoaded(false);
    settingsStore.refetch();
    await heavySettings.refetch().catch(() => {});
  }, [settingsStore, heavySettings]);

  const handleAdvancedOverridesChange = useCallback((raw: string): void => {
    setAdvancedOverridesText(raw);
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed === null) {
        setAdvancedOverridesError(null);
        setStudioSettings((prev) => ({
          ...prev,
          targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, advanced_overrides: null } },
        }));
        return;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setAdvancedOverridesError('Must be a JSON object (or null).');
        return;
      }
      setAdvancedOverridesError(null);
      setStudioSettings((prev) => ({
        ...prev,
        targetAi: {
          ...prev.targetAi,
          openai: { ...prev.targetAi.openai, advanced_overrides: parsed as Record<string, unknown> },
        },
      }));
    } catch {
      setAdvancedOverridesError('Invalid JSON.');
    }
  }, []);

  const handlePromptValidationRulesChange = useCallback((raw: string): void => {
    setPromptValidationRulesText(raw);
    const parsed = parsePromptValidationRules(raw);
    if (!parsed.ok) {
      setPromptValidationRulesError(parsed.error);
      return;
    }
    setPromptValidationRulesError(null);
  }, []);

  const saveStudioSettings = useCallback(async (): Promise<void> => {
    if (advancedOverridesError) {
      toast(`Settings not saved: ${advancedOverridesError}`, { variant: 'error' });
      return;
    }
    if (promptValidationRulesError) {
      toast(`Settings not saved: ${promptValidationRulesError}`, { variant: 'error' });
      return;
    }

    if (
      (studioSettings.promptExtraction.mode === 'gpt' || studioSettings.promptExtraction.mode === 'hybrid') &&
      !studioSettings.promptExtraction.gpt.model.trim()
    ) {
      toast('Prompt extract model is required when prompt extraction mode is GPT.', { variant: 'error' });
      return;
    }

    if (
      (studioSettings.uiExtractor.mode === 'ai' || studioSettings.uiExtractor.mode === 'both') &&
      !studioSettings.uiExtractor.model.trim()
    ) {
      toast('UI extractor model is required when UI extractor mode uses AI.', { variant: 'error' });
      return;
    }

    const activeGenerationModel = studioSettings.targetAi.openai.model.trim();
    if (!activeGenerationModel) {
      toast('Target AI model is required.', { variant: 'error' });
      return;
    }

    const normalizedModelPresets = normalizeImageStudioModelPresets(
      studioSettings.targetAi.openai.modelPresets,
      activeGenerationModel,
    );

    const nextStudioSettings: ImageStudioSettings = {
      ...studioSettings,
      targetAi: {
        ...studioSettings.targetAi,
        openai: {
          ...studioSettings.targetAi.openai,
          api: 'images',
          model: activeGenerationModel,
          modelPresets: normalizedModelPresets,
        },
      },
    };

    try {
      const targetProjectId = selectedProjectId.trim() || activeProjectId.trim();
      const targetSettingsKey =
        getImageStudioProjectSettingsKey(targetProjectId) ?? IMAGE_STUDIO_SETTINGS_KEY;
      await updateSetting.mutateAsync({
        key: targetSettingsKey,
        value: serializeSetting(nextStudioSettings),
      });
      await updateSetting.mutateAsync({
        key: IMAGE_STUDIO_OPENAI_API_KEY_KEY,
        value: imageStudioApiKey.trim(),
      });
      const parsedRules = parsePromptValidationRules(promptValidationRulesText);
      if (!parsedRules.ok) {
        throw new Error(parsedRules.error);
      }
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting({
          ...promptEngineSettings,
          promptValidation: {
            ...promptEngineSettings.promptValidation,
            enabled: promptValidationEnabled,
            rules: parsedRules.rules,
          },
        }),
      });
      setStudioSettings(nextStudioSettings);
      hydratedSignatureRef.current = null;
      await heavySettings.refetch().catch(() => {});
      toast(
        targetProjectId
          ? `Image Studio settings saved for project "${targetProjectId}".`
          : 'Image Studio global settings saved.',
        { variant: 'success' }
      );
      onSaved?.();
    } catch (error) {
      logClientError(error, { context: { source: 'AdminImageStudioSettingsPage', action: 'saveSettings' } });
      toast('Failed to save Image Studio settings.', { variant: 'error' });
    }
  }, [
    advancedOverridesError,
    promptValidationEnabled,
    promptValidationRulesError,
    studioSettings,
    imageStudioApiKey,
    selectedProjectId,
    activeProjectId,
    promptValidationRulesText,
    promptEngineSettings,
    toast,
    updateSetting,
    onSaved,
    heavySettings,
  ]);

  const resetStudioSettings = useCallback((): void => {
    setStudioSettings(defaultImageStudioSettings);
    setAdvancedOverridesText(JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2));
    setAdvancedOverridesError(null);
    setPromptValidationEnabled(defaultPromptEngineSettings.promptValidation.enabled);
    setPromptValidationRulesText(JSON.stringify(defaultPromptEngineSettings.promptValidation.rules, null, 2));
    setPromptValidationRulesError(null);
    setModelToAdd('');
  }, []);

  const persistGenerationModelPresets = useCallback(
    (nextModel: string, nextPresets: string[]): void => {
      const normalizedModel = nextModel.trim();
      if (!normalizedModel) return;
      const normalizedPresets = normalizeImageStudioModelPresets(nextPresets, normalizedModel);
      const targetProjectId = selectedProjectId.trim() || activeProjectId.trim();
      const targetSettingsKey =
        getImageStudioProjectSettingsKey(targetProjectId) ?? IMAGE_STUDIO_SETTINGS_KEY;
      const persistedRaw = heavyMap.get(targetSettingsKey) ?? studioSettingsRaw;
      const persistedSettings = parseImageStudioSettings(persistedRaw);
      const persistedModel = persistedSettings.targetAi.openai.model.trim();
      const persistedPresets = normalizeImageStudioModelPresets(
        persistedSettings.targetAi.openai.modelPresets,
        persistedModel,
      );

      const presetsChanged =
        normalizedPresets.length !== persistedPresets.length ||
        normalizedPresets.some((entry: string, index: number) => entry !== persistedPresets[index]);
      const modelChanged = normalizedModel !== persistedModel;
      if (!modelChanged && !presetsChanged) {
        presetPersistSignatureRef.current = null;
        return;
      }

      const persistSignature = `${targetSettingsKey}:${normalizedModel}:${normalizedPresets.join('|')}`;
      if (presetPersistSignatureRef.current === persistSignature) return;

      if (presetPersistTimerRef.current) {
        clearTimeout(presetPersistTimerRef.current);
      }
      presetPersistTimerRef.current = setTimeout(() => {
        presetPersistSignatureRef.current = persistSignature;
        const nextPersistedSettings = {
          ...persistedSettings,
          targetAi: {
            ...persistedSettings.targetAi,
            openai: {
              ...persistedSettings.targetAi.openai,
              api: 'images',
              model: normalizedModel,
              modelPresets: normalizedPresets,
            },
          },
        };
        void updateSetting.mutateAsync({
          key: targetSettingsKey,
          value: serializeSetting(nextPersistedSettings),
        }).catch(() => {
          if (presetPersistSignatureRef.current === persistSignature) {
            presetPersistSignatureRef.current = null;
          }
        });
      }, 350);
    },
    [
      activeProjectId,
      heavyMap,
      selectedProjectId,
      studioSettingsRaw,
      updateSetting,
    ]
  );

  const setGenerationModelAndPresets = useCallback(
    (nextModel: string, nextPresets: string[]): void => {
      const normalizedModel = nextModel.trim();
      if (!normalizedModel) return;
      const normalizedPresets = normalizeImageStudioModelPresets(nextPresets, normalizedModel);
      setStudioSettings((prev) => ({
        ...prev,
        targetAi: {
          ...prev.targetAi,
          openai: {
            ...prev.targetAi.openai,
            model: normalizedModel,
            modelPresets: normalizedPresets,
          },
        },
      }));
      persistGenerationModelPresets(normalizedModel, normalizedPresets);
    },
    [persistGenerationModelPresets]
  );

  const maintenance = useMaintenanceActions({
    backfillProjectId,
    backfillDryRun,
    backfillIncludeHeuristicGenerationLinks,
    toast,
  });

  const { backfillRunning, backfillResultText, runCardBackfill } = maintenance;

  const toggleProjectSequencingOperation = useCallback(
    (operation: string, checked: boolean): void => {
      setStudioSettings((prev) => {
        type Op = 'crop_center' | 'mask' | 'generate' | 'regenerate' | 'upscale';
        const operations = prev.projectSequencing.operations as Op[];
        const op = operation as Op;
        const nextOperations: Op[] = checked
          ? operations.includes(op)
            ? operations
            : [...operations, op]
          : operations.filter((entry) => entry !== op);
        return {
          ...prev,
          projectSequencing: {
            ...prev.projectSequencing,
            operations: nextOperations,
          },
        };
      });
    },
    []
  );

  const moveProjectSequencingOperation = useCallback(
    (operation: string, direction: number): void => {
      setStudioSettings((prev) => {
        type Op = 'crop_center' | 'mask' | 'generate' | 'regenerate' | 'upscale';
        const operations = [...(prev.projectSequencing.operations as Op[])];
        const op = operation as Op;
        const index = operations.indexOf(op);
        if (index < 0) return prev;
        const target = index + direction;
        if (target < 0 || target >= operations.length) return prev;
        const [removed] = operations.splice(index, 1);
        if (removed) operations.splice(target, 0, removed);
        return {
          ...prev,
          projectSequencing: {
            ...prev.projectSequencing,
            operations,
          },
        };
      });
    },
    []
  );

  const modelAware = useModelAwareSettings({
    studioSettings,
    imageModelsQuery,
  });

  const {
    quickSwitchModels,
    selectedGenerationModel,
    addableGenerationModelOptions,
    quickSwitchModelSelectOptions,
    modelCapabilities,
    isGpt52Model,
    modelAwareSizeValue,
    modelAwareQualityValue,
    modelAwareBackgroundValue,
    modelAwareFormatValue,
    modelAwareSizeOptions,
    modelAwareQualityOptions,
    modelAwareBackgroundOptions,
    modelAwareFormatOptions,
  } = modelAware;

  const settingsSource = useMemo(() => {
    const hasProjectSpecificSettings = Boolean(
      projectSettingsKey &&
      projectStudioSettingsRaw &&
      projectStudioSettingsRaw.trim().length > 0
    );
    if (hasProjectSpecificSettings && activeProjectId) {
      return `project (${activeProjectId})`;
    }
    if (activeProjectId && projectSettingsKey) {
      return globalStudioSettingsRaw ? `global fallback (${activeProjectId})` : 'defaults';
    }
    return globalStudioSettingsRaw ? 'global settings' : 'defaults';
  }, [
    activeProjectId,
    globalStudioSettingsRaw,
    projectSettingsKey,
    projectStudioSettingsRaw,
  ]);

  useEffect(() => {
    if (modelToAdd && addableGenerationModelOptions.some(opt => opt.value === modelToAdd)) return;
    setModelToAdd(addableGenerationModelOptions[0]?.value ?? '');
  }, [addableGenerationModelOptions, modelToAdd]);

  const value: ImageStudioSettingsContextValue = {
    settingsLoaded,
    activeSettingsTab,
    setActiveSettingsTab,
    studioSettings,
    setStudioSettings,
    advancedOverridesText,
    advancedOverridesError,
    imageStudioApiKey,
    setImageStudioApiKey,
    promptValidationEnabled,
    setPromptValidationEnabled,
    promptValidationRulesText,
    promptValidationRulesError,
    backfillProjectId,
    setBackfillProjectId,
    backfillDryRun,
    setBackfillDryRun,
    backfillIncludeHeuristicGenerationLinks,
    setBackfillIncludeHeuristicGenerationLinks,
    backfillRunning,
    backfillResultText,
    modelToAdd,
    setModelToAdd,
    settingsSource,
    quickSwitchModels,
    quickSwitchModelSelectOptions,
    addableGenerationModelOptions,
    isGpt52Model,
    modelCapabilities,
    modelAwareSizeValue,
    modelAwareQualityValue,
    modelAwareBackgroundValue,
    modelAwareFormatValue,
    modelAwareSizeOptions,
    modelAwareQualityOptions,
    modelAwareBackgroundOptions,
    modelAwareFormatOptions,
    selectedGenerationModel,
    settingsStore: {
      isFetching: settingsStore.isFetching,
      isLoading: settingsStore.isLoading,
    },
    imageModelsQuery: {
      isFetching: imageModelsQuery.isFetching,
      refetch: () => imageModelsQuery.refetch(),
    },
    updateSetting: {
      isPending: updateSetting.isPending,
    },
    handleRefresh,
    handleAdvancedOverridesChange,
    handlePromptValidationRulesChange,
    saveStudioSettings,
    resetStudioSettings,
    setGenerationModelAndPresets,
    runCardBackfill,
    toggleProjectSequencingOperation,
    moveProjectSequencingOperation,
  };

  return (
    <ImageStudioSettingsContext.Provider value={value}>
      {children}
    </ImageStudioSettingsContext.Provider>
  );
}

export function useImageStudioSettingsContext(): ImageStudioSettingsContextValue {
  const context = useContext(ImageStudioSettingsContext);
  if (!context) {
    throw internalError('useImageStudioSettingsContext must be used within ImageStudioSettingsProvider');
  }
  return context;
}
