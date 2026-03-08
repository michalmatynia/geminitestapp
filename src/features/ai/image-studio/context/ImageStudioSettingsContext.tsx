'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useUserPreferences } from '@/features/auth';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  defaultPromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
  parsePromptValidationRules,
} from '@/shared/lib/prompt-engine/settings';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';
import { internalError } from '@/shared/errors/app-error';

import { useProjectsState } from './ProjectsContext';
import { useStudioImageModels } from '../hooks/useImageStudioQueries';
import {
  defaultImageStudioSettings,
  IMAGE_STUDIO_SETTINGS_KEY,
  getImageStudioProjectSettingsKey,
  type ImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';

import {
  type StudioSettingsTab,
  type ImageStudioSettingsContextValue,
} from './settings/settings-types';
import { useSettingsHydration } from './settings/useSettingsHydration';
import { useModelAwareSettings } from './settings/useModelAwareSettings';
import { useMaintenanceActions } from './settings/useMaintenanceActions';

const ImageStudioSettingsContext = createContext<ImageStudioSettingsContextValue | null>(null);

export function ImageStudioSettingsProvider({
  children,
  onSaved,
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
  const [promptValidationEnabled, setPromptValidationEnabled] = useState<boolean>(
    defaultPromptEngineSettings.promptValidation.enabled
  );
  const [promptValidationRulesText, setPromptValidationRulesText] = useState(
    JSON.stringify(defaultPromptEngineSettings.promptValidation.rules, null, 2)
  );
  const [promptValidationRulesError, setPromptValidationRulesError] = useState<string | null>(null);
  const [backfillProjectId, setBackfillProjectId] = useState<string>('');
  const [backfillDryRun, setBackfillDryRun] = useState<boolean>(true);
  const [backfillIncludeHeuristicGenerationLinks, setBackfillIncludeHeuristicGenerationLinks] =
    useState<boolean>(true);
  const [settingsHydrationError, setSettingsHydrationError] = useState<Error | null>(null);
  const hydratedSignatureRef = useRef<string | null>(null);

  const promptEngineRaw = settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY);
  const promptEngineSettings = useMemo(
    () => parsePromptEngineSettings(promptEngineRaw),
    [promptEngineRaw]
  );
  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const promptExtractModel = useBrainAssignment({
    capability: 'image_studio.prompt_extract',
  });
  const uiExtractorModel = useBrainAssignment({
    capability: 'image_studio.ui_extractor',
  });
  const generationModel = useBrainAssignment({
    capability: 'image_studio.general',
  });
  const liveProjectId = selectedProjectId.trim();
  const activeProjectIdFromPreferences =
    typeof userPreferencesQuery.data?.imageStudioLastProjectId === 'string'
      ? userPreferencesQuery.data.imageStudioLastProjectId.trim()
      : '';
  const activeProjectId = liveProjectId || activeProjectIdFromPreferences;
  const projectSettingsKey = getImageStudioProjectSettingsKey(activeProjectId);
  const globalStudioSettingsRaw = heavyMap.get(IMAGE_STUDIO_SETTINGS_KEY);
  const projectStudioSettingsRaw = projectSettingsKey ? heavyMap.get(projectSettingsKey) : null;
  const studioSettingsRaw = projectStudioSettingsRaw ?? globalStudioSettingsRaw;
  const hydrationSignature = `${projectSettingsKey ?? IMAGE_STUDIO_SETTINGS_KEY}:${studioSettingsRaw ?? ''}:${promptEngineRaw ?? ''}`;

  useSettingsHydration({
    settingsStore,
    heavySettings,
    userPreferencesQuery,
    hydratedSignatureRef,
    settingsLoaded,
    setSettingsLoaded,
    studioSettingsRaw,
    setStudioSettings,
    setAdvancedOverridesText,
    setPromptValidationEnabled,
    setPromptValidationRulesText,
    setPromptValidationRulesError,
    setSettingsHydrationError,
    hydrationSignature,
  });

  useEffect(() => {
    if (!settingsHydrationError) return;
    toast(`${settingsHydrationError.message} Using defaults until you save updated settings.`, {
      variant: 'error',
    });
  }, [settingsHydrationError, toast]);

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
          targetAi: {
            ...prev.targetAi,
            openai: { ...prev.targetAi.openai, advanced_overrides: null },
          },
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
          openai: {
            ...prev.targetAi.openai,
            advanced_overrides: parsed as Record<string, unknown>,
          },
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
      (studioSettings.promptExtraction.mode === 'gpt' ||
        studioSettings.promptExtraction.mode === 'hybrid') &&
      !promptExtractModel.effectiveModelId.trim()
    ) {
      toast('Configure Image Studio Prompt Extract in AI Brain first.', {
        variant: 'error',
      });
      return;
    }

    if (
      (studioSettings.uiExtractor.mode === 'ai' || studioSettings.uiExtractor.mode === 'both') &&
      !uiExtractorModel.effectiveModelId.trim()
    ) {
      toast('Configure Image Studio UI Extractor in AI Brain first.', { variant: 'error' });
      return;
    }

    if (!generationModel.effectiveModelId.trim()) {
      toast('Configure Image Studio Image Generation in AI Brain first.', { variant: 'error' });
      return;
    }

    const nextStudioSettings: ImageStudioSettings = {
      ...studioSettings,
      targetAi: {
        ...studioSettings.targetAi,
        openai: {
          ...studioSettings.targetAi.openai,
          api: 'images',
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
      const parsedRules = parsePromptValidationRules(promptValidationRulesText);
      if (!parsedRules.ok) {
        throw internalError(parsedRules.error);
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
      logClientError(error, {
        context: { source: 'AdminImageStudioSettingsPage', action: 'saveSettings' },
      });
      toast('Failed to save Image Studio settings.', { variant: 'error' });
    }
  }, [
    advancedOverridesError,
    generationModel.effectiveModelId,
    promptValidationEnabled,
    promptValidationRulesError,
    promptExtractModel.effectiveModelId,
    studioSettings,
    selectedProjectId,
    activeProjectId,
    promptValidationRulesText,
    promptEngineSettings,
    toast,
    updateSetting,
    uiExtractorModel.effectiveModelId,
    onSaved,
    heavySettings,
  ]);

  const resetStudioSettings = useCallback((): void => {
    setStudioSettings(defaultImageStudioSettings);
    setAdvancedOverridesText(
      JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2)
    );
    setAdvancedOverridesError(null);
    setPromptValidationEnabled(defaultPromptEngineSettings.promptValidation.enabled);
    setPromptValidationRulesText(
      JSON.stringify(defaultPromptEngineSettings.promptValidation.rules, null, 2)
    );
    setPromptValidationRulesError(null);
  }, []);

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
    generationModelId: generationModel.effectiveModelId,
  });

  const {
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
      projectSettingsKey && projectStudioSettingsRaw && projectStudioSettingsRaw.trim().length > 0
    );
    if (hasProjectSpecificSettings && activeProjectId) {
      return `project (${activeProjectId})`;
    }
    if (activeProjectId && projectSettingsKey) {
      return globalStudioSettingsRaw ? `global fallback (${activeProjectId})` : 'defaults';
    }
    return globalStudioSettingsRaw ? 'global settings' : 'defaults';
  }, [activeProjectId, globalStudioSettingsRaw, projectSettingsKey, projectStudioSettingsRaw]);

  const value: ImageStudioSettingsContextValue = {
    settingsLoaded,
    activeSettingsTab,
    setActiveSettingsTab,
    studioSettings,
    setStudioSettings,
    advancedOverridesText,
    advancedOverridesError,
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
    settingsSource,
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
    throw internalError(
      'useImageStudioSettingsContext must be used within ImageStudioSettingsProvider'
    );
  }
  return context;
}
