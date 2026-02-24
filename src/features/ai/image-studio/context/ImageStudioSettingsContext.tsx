'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUserPreferences } from '@/features/auth/hooks/useUserPreferences';
import { logClientError } from '@/features/observability';
import {
  defaultPromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
  parsePromptValidationRules,
} from '@/features/prompt-engine/settings';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';
import { internalError } from '@/shared/errors/app-error';

import { useProjectsState } from './ProjectsContext';
import { useStudioImageModels } from '../hooks/useImageStudioQueries';
import { getImageModelCapabilities, isGpt52ImageModel, uniqueSortedModelIds } from '../utils/image-models';
import {
  defaultImageStudioSettings,
  type ImageStudioSequenceOperation,
  IMAGE_STUDIO_OPENAI_API_KEY_KEY,
  IMAGE_STUDIO_SETTINGS_KEY,
  getImageStudioProjectSettingsKey,
  normalizeImageStudioModelPresets,
  parseImageStudioSettings,
  type ImageStudioSettings,
} from '../utils/studio-settings';

// ─── Types ───────────────────────────────────────────────────────────────────

export type StudioSettingsTab = 'prompt' | 'generation' | 'validation' | 'maintenance';

export type SelectOption = {
  value: string;
  label: string;
};

export type ModelCapabilities = {
  supportsUser: boolean;
  supportsOutputFormat: boolean;
  supportsCount: boolean;
  supportsModeration: boolean;
  supportsOutputCompression: boolean;
  supportsPartialImages: boolean;
  supportsStream: boolean;
  sizeOptions: readonly string[];
  qualityOptions: readonly string[];
  backgroundOptions: readonly string[];
  formatOptions: readonly string[];
};

type CardBackfillProjectResult = {
  projectId: string;
  scannedSlots: number;
  scannedLinks: number;
  updatedCards: number;
  slotLinkBackfilled: number;
  maskFolderBackfilled: number;
  inferredGenerationBackfilled: number;
  errors: string[];
};

type CardBackfillResult = {
  dryRun: boolean;
  includeHeuristicGenerationLinks: boolean;
  projectCount: number;
  scannedSlots: number;
  scannedLinks: number;
  updatedCards: number;
  slotLinkBackfilled: number;
  maskFolderBackfilled: number;
  inferredGenerationBackfilled: number;
  projects: CardBackfillProjectResult[];
};

type CardBackfillResponse = {
  result: CardBackfillResult;
};

export interface ImageStudioSettingsContextValue {
  // State
  settingsLoaded: boolean;
  activeSettingsTab: StudioSettingsTab;
  setActiveSettingsTab: React.Dispatch<React.SetStateAction<StudioSettingsTab>>;
  studioSettings: ImageStudioSettings;
  setStudioSettings: React.Dispatch<React.SetStateAction<ImageStudioSettings>>;
  advancedOverridesText: string;
  advancedOverridesError: string | null;
  imageStudioApiKey: string;
  setImageStudioApiKey: React.Dispatch<React.SetStateAction<string>>;
  promptValidationEnabled: boolean;
  setPromptValidationEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  promptValidationRulesText: string;
  promptValidationRulesError: string | null;
  backfillProjectId: string;
  setBackfillProjectId: React.Dispatch<React.SetStateAction<string>>;
  backfillDryRun: boolean;
  setBackfillDryRun: React.Dispatch<React.SetStateAction<boolean>>;
  backfillIncludeHeuristicGenerationLinks: boolean;
  setBackfillIncludeHeuristicGenerationLinks: React.Dispatch<React.SetStateAction<boolean>>;
  backfillRunning: boolean;
  backfillResultText: string;
  modelToAdd: string;
  setModelToAdd: React.Dispatch<React.SetStateAction<string>>;

  // Derived
  settingsSource: string;
  quickSwitchModels: string[];
  quickSwitchModelSelectOptions: SelectOption[];
  addableGenerationModelOptions: SelectOption[];
  isGpt52Model: boolean;
  modelCapabilities: ModelCapabilities;
  modelAwareSizeValue: string;
  modelAwareQualityValue: string;
  modelAwareBackgroundValue: string;
  modelAwareFormatValue: string;
  modelAwareSizeOptions: SelectOption[];
  modelAwareQualityOptions: SelectOption[];
  modelAwareBackgroundOptions: SelectOption[];
  modelAwareFormatOptions: SelectOption[];
  selectedGenerationModel: string;
  
  // Queries/Stores
  settingsStore: {
    isFetching: boolean;
    isLoading: boolean;
  };
  imageModelsQuery: {
    isFetching: boolean;
    refetch: () => Promise<unknown>;
  };
  updateSetting: {
    isPending: boolean;
  };

  // Actions
  handleRefresh: () => Promise<void>;
  handleAdvancedOverridesChange: (raw: string) => void;
  handlePromptValidationRulesChange: (raw: string) => void;
  saveStudioSettings: () => Promise<void>;
  resetStudioSettings: () => void;
  setGenerationModelAndPresets: (nextModel: string, nextPresets: string[]) => void;
  runCardBackfill: () => Promise<void>;
  toggleProjectSequencingOperation: (operation: ImageStudioSequenceOperation, checked: boolean) => void;
  moveProjectSequencingOperation: (operation: ImageStudioSequenceOperation, direction: -1 | 1) => void;
}

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
  const [studioSettings, setStudioSettings] = useState<ImageStudioSettings>(defaultImageStudioSettings);
  const [advancedOverridesText, setAdvancedOverridesText] = useState<string>(
    JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2)
  );
  const [advancedOverridesError, setAdvancedOverridesError] = useState<string | null>(null);
  const [imageStudioApiKey, setImageStudioApiKey] = useState<string>('');
  const [promptValidationEnabled, setPromptValidationEnabled] = useState<boolean>(
    defaultPromptEngineSettings.promptValidation.enabled
  );
  const [promptValidationRulesText, setPromptValidationRulesText] = useState<string>(
    JSON.stringify(defaultPromptEngineSettings.promptValidation.rules, null, 2)
  );
  const [promptValidationRulesError, setPromptValidationRulesError] = useState<string | null>(null);
  const [backfillProjectId, setBackfillProjectId] = useState<string>('');
  const [backfillDryRun, setBackfillDryRun] = useState<boolean>(true);
  const [backfillIncludeHeuristicGenerationLinks, setBackfillIncludeHeuristicGenerationLinks] = useState<boolean>(true);
  const [backfillRunning, setBackfillRunning] = useState<boolean>(false);
  const [backfillResultText, setBackfillResultText] = useState<string>('');
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

  useEffect(() => {
    if (settingsStore.isLoading || heavySettings.isLoading || userPreferencesQuery.isLoading) return;
    if (hydratedSignatureRef.current === hydrationSignature) {
      if (!settingsLoaded) setSettingsLoaded(true);
      return;
    }

    const storedRaw = studioSettingsRaw;
    const stored = parseImageStudioSettings(storedRaw);
    const globalSettings = parseImageStudioSettings(globalStudioSettingsRaw);
    const promptEngineStored = parsePromptEngineSettings(settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY));
    const hasStoredStudioSettings = Boolean(storedRaw && storedRaw.trim().length > 0);

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
                openaiModelFallback,
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
      hydratedBase.targetAi.openai.model,
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
    setAdvancedOverridesText(JSON.stringify(hydrated.targetAi.openai.advanced_overrides ?? {}, null, 2));
    setImageStudioApiKey(apiKeyFallback);
    setPromptValidationEnabled(promptEngineStored.promptValidation.enabled);
    setPromptValidationRulesText(JSON.stringify(promptEngineStored.promptValidation.rules, null, 2));
    setPromptValidationRulesError(null);
    setModelToAdd('');
    hydratedSignatureRef.current = hydrationSignature;
    setSettingsLoaded(true);
  }, [
    hydrationSignature,
    settingsLoaded,
    settingsStore.isLoading,
    heavySettings.isLoading,
    settingsStore,
    userPreferencesQuery.isLoading,
    studioSettingsRaw,
    globalStudioSettingsRaw,
    openaiModelFallback,
    apiKeyFallback,
    promptEngineRaw
  ]);

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
        setStudioSettings((prev: ImageStudioSettings) => ({
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
      setStudioSettings((prev: ImageStudioSettings) => ({
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
        const nextPersistedSettings: ImageStudioSettings = {
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
      setStudioSettings((prev: ImageStudioSettings) => ({
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

  const runCardBackfill = useCallback(async (): Promise<void> => {
    setBackfillRunning(true);
    setBackfillResultText('');

    try {
      const response = await api.post<CardBackfillResponse>('/api/image-studio/cards/backfill', {
        projectId: backfillProjectId.trim() || null,
        dryRun: backfillDryRun,
        includeHeuristicGenerationLinks: backfillIncludeHeuristicGenerationLinks,
      });

      const result = response.result;
      const summary = [
        `Mode: ${result.dryRun ? 'dry-run' : 'write'}`,
        `Projects: ${result.projectCount}`,
        `Scanned slots: ${result.scannedSlots}`,
        `Scanned links: ${result.scannedLinks}`,
        `Updated cards: ${result.updatedCards}`,
        `Slot-link backfilled: ${result.slotLinkBackfilled}`,
        `Mask-folder backfilled: ${result.maskFolderBackfilled}`,
        `Generation inferred: ${result.inferredGenerationBackfilled}`,
      ].join('\n');

      const projectErrorCount = result.projects.reduce((count: number, project: CardBackfillProjectResult) => {
        return count + (project.errors.length > 0 ? 1 : 0);
      }, 0);

      if (projectErrorCount > 0) {
        toast(`Backfill finished with errors in ${projectErrorCount} project(s).`, { variant: 'error' });
      } else {
        toast(
          result.dryRun
            ? 'Backfill dry-run completed.'
            : `Backfill completed. Updated ${result.updatedCards} card(s).`,
          { variant: 'success' }
        );
      }

      const perProject = result.projects
        .map((project: CardBackfillProjectResult) => {
          const errors = project.errors.length > 0 ? `\n  errors: ${project.errors.join(' | ')}` : '';
          return `- ${project.projectId}: updated=${project.updatedCards}, link=${project.slotLinkBackfilled}, mask=${project.maskFolderBackfilled}, inferred=${project.inferredGenerationBackfilled}${errors}`;
        })
        .join('\n');

      setBackfillResultText(`${summary}\n\nPer project:\n${perProject || '- none'}`);
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AdminImageStudioSettingsPage', action: 'runCardBackfill' } });
      toast(error instanceof Error ? error.message : 'Failed to run card backfill.', { variant: 'error' });
    } finally {
      setBackfillRunning(false);
    }
  }, [
    backfillDryRun,
    backfillIncludeHeuristicGenerationLinks,
    backfillProjectId,
    toast,
  ]);

  const toggleProjectSequencingOperation = useCallback(
    (operation: ImageStudioSequenceOperation, checked: boolean): void => {
      setStudioSettings((prev: ImageStudioSettings) => {
        const operations = prev.projectSequencing.operations;
        const nextOperations = checked
          ? operations.includes(operation)
            ? operations
            : [...operations, operation]
          : operations.filter((entry) => entry !== operation);
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
    (operation: ImageStudioSequenceOperation, direction: -1 | 1): void => {
      setStudioSettings((prev: ImageStudioSettings) => {
        const operations = [...prev.projectSequencing.operations];
        const index = operations.indexOf(operation);
        if (index < 0) return prev;
        const target = index + direction;
        if (target < 0 || target >= operations.length) return prev;
        [operations[index], operations[target]] = [operations[target]!, operations[index]!];
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

  const quickSwitchModels = useMemo(() => {
    return normalizeImageStudioModelPresets(
      studioSettings.targetAi.openai.modelPresets,
      studioSettings.targetAi.openai.model,
    );
  }, [studioSettings.targetAi.openai.modelPresets, studioSettings.targetAi.openai.model]);

  const selectedGenerationModel = useMemo(() => {
    const currentModel = studioSettings.targetAi.openai.model?.trim() || '';
    if (currentModel && quickSwitchModels.includes(currentModel)) return currentModel;
    return quickSwitchModels[0] ?? '';
  }, [quickSwitchModels, studioSettings.targetAi.openai.model]);

  const generationModelOptions = useMemo(() => {
    const discovered = Array.isArray(imageModelsQuery.data?.models) ? imageModelsQuery.data.models : [];
    const currentModel = studioSettings.targetAi.openai.model?.trim() || '';
    return uniqueSortedModelIds([
      ...discovered,
      ...quickSwitchModels,
      ...(currentModel ? [currentModel] : []),
    ]);
  }, [imageModelsQuery.data?.models, quickSwitchModels, studioSettings.targetAi.openai.model]);

  const addableGenerationModelOptions = useMemo(() => {
    return generationModelOptions
      .filter((modelId) => !quickSwitchModels.includes(modelId))
      .map((modelId) => ({ value: modelId, label: modelId }));
  }, [generationModelOptions, quickSwitchModels]);

  const quickSwitchModelSelectOptions = useMemo(
    () => quickSwitchModels.map((modelId) => ({ value: modelId, label: modelId })),
    [quickSwitchModels]
  );

  useEffect(() => {
    if (modelToAdd && addableGenerationModelOptions.some(opt => opt.value === modelToAdd)) return;
    setModelToAdd(addableGenerationModelOptions[0]?.value ?? '');
  }, [addableGenerationModelOptions, modelToAdd]);

  const modelCapabilities = useMemo(
    () => getImageModelCapabilities(studioSettings.targetAi.openai.model),
    [studioSettings.targetAi.openai.model]
  );

  const isGpt52Model = useMemo(
    () => isGpt52ImageModel(studioSettings.targetAi.openai.model),
    [studioSettings.targetAi.openai.model]
  );

  const modelAwareSizeValue = useMemo(() => {
    const value = studioSettings.targetAi.openai.image.size;
    return value && (modelCapabilities.sizeOptions as string[]).includes(value) ? value : '__null__';
  }, [modelCapabilities.sizeOptions, studioSettings.targetAi.openai.image.size]);

  const modelAwareQualityValue = useMemo(() => {
    const value = studioSettings.targetAi.openai.image.quality;
    return value && (modelCapabilities.qualityOptions as string[]).includes(value) ? value : '__null__';
  }, [modelCapabilities.qualityOptions, studioSettings.targetAi.openai.image.quality]);

  const modelAwareBackgroundValue = useMemo(() => {
    const value = studioSettings.targetAi.openai.image.background;
    return value && (modelCapabilities.backgroundOptions as string[]).includes(value) ? value : '__null__';
  }, [modelCapabilities.backgroundOptions, studioSettings.targetAi.openai.image.background]);

  const modelAwareFormatValue = useMemo(() => {
    const value = studioSettings.targetAi.openai.image.format ?? 'png';
    if ((modelCapabilities.formatOptions as string[]).includes(value)) return value;
    return modelCapabilities.formatOptions[0] ?? 'png';
  }, [modelCapabilities.formatOptions, studioSettings.targetAi.openai.image.format]);

  const modelAwareSizeOptions = useMemo(
    () => ([
      { value: '__null__', label: 'Default' },
      ...modelCapabilities.sizeOptions.map((option: string) => ({ value: option, label: option })),
    ]),
    [modelCapabilities.sizeOptions]
  );
  const modelAwareQualityOptions = useMemo(
    () => ([
      { value: '__null__', label: 'Default' },
      ...modelCapabilities.qualityOptions.map((option: string) => ({ value: option, label: option })),
    ]),
    [modelCapabilities.qualityOptions]
  );
  const modelAwareBackgroundOptions = useMemo(
    () => ([
      { value: '__null__', label: 'Default' },
      ...modelCapabilities.backgroundOptions.map((option: string) => ({
        value: option,
        label: option,
      })),
    ]),
    [modelCapabilities.backgroundOptions]
  );
  const modelAwareFormatOptions = useMemo(
    () => modelCapabilities.formatOptions.map((option: string) => ({ value: option, label: option })),
    [modelCapabilities.formatOptions]
  );

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
