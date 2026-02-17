'use client';

import { ArrowDown, ArrowUp, RefreshCcw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import {
  Button,
  Input,
  Label,
  PanelHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  SelectSimple,
  useToast,
  FormSection,
  FormField,
  StatusBadge,
  Alert,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { serializeSetting } from '@/shared/utils/settings-json';

import { useProjectsState } from '../context/ProjectsContext';
import { useStudioImageModels } from '../hooks/useImageStudioQueries';
import { getImageModelCapabilities, isGpt52ImageModel, uniqueSortedModelIds } from '../utils/image-models';
import {
  IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
  parseImageStudioActiveProject,
} from '../utils/project-session';
import {
  defaultImageStudioSettings,
  IMAGE_STUDIO_SEQUENCE_OPERATIONS,
  type ImageStudioSequenceOperation,
  IMAGE_STUDIO_OPENAI_API_KEY_KEY,
  IMAGE_STUDIO_SETTINGS_KEY,
  getImageStudioProjectSettingsKey,
  normalizeImageStudioModelPresets,
  parseImageStudioSettings,
  type ImageStudioSettings,
} from '../utils/studio-settings';

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

type StudioSettingsTab = 'pipeline' | 'prompt' | 'generation' | 'validation' | 'maintenance';

const PROMPT_EXTRACTION_MODE_OPTIONS = [
  { value: 'programmatic', label: 'Programmatic' },
  { value: 'gpt', label: 'GPT (AI)' },
  { value: 'hybrid', label: 'Hybrid (Auto Fallback)' },
];

const UI_EXTRACTOR_MODE_OPTIONS = [
  { value: 'heuristic', label: 'Heuristic' },
  { value: 'ai', label: 'AI' },
  { value: 'both', label: 'Both' },
];

const BACKFILL_EXECUTION_MODE_OPTIONS = [
  { value: 'dry', label: 'Dry-run (no writes)' },
  { value: 'write', label: 'Write updates' },
];

const MODERATION_OPTIONS = [
  { value: '__null__', label: 'Default' },
  { value: 'auto', label: 'auto' },
  { value: 'low', label: 'low' },
];

const PROJECT_SEQUENCE_TRIGGER_OPTIONS = [
  { value: 'manual', label: 'Manual Trigger' },
];

const PROJECT_SEQUENCE_UPSCALE_SCALE_OPTIONS = [
  { value: '1.5', label: '1.5x' },
  { value: '2', label: '2x' },
  { value: '3', label: '3x' },
  { value: '4', label: '4x' },
];

const PROJECT_SEQUENCE_UPSCALE_STRATEGY_OPTIONS = [
  { value: 'scale', label: 'By Multiplier' },
  { value: 'target_resolution', label: 'By Resolution' },
];

const PROJECT_SEQUENCE_OPERATION_LABELS: Record<ImageStudioSequenceOperation, string> = {
  crop_center: 'Center Crop',
  mask: 'Masking',
  generate: 'Generate',
  regenerate: 'Regenerate',
  upscale: 'Upscale',
};

export function AdminImageStudioSettingsPage(
  { embedded = false, onSaved }: { embedded?: boolean | undefined; onSaved?: (() => void) | undefined } = {}
): React.JSX.Element {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const userPreferencesQuery = useUserPreferences();
  const updateSetting = useUpdateSetting();
  const imageModelsQuery = useStudioImageModels();
  const { projectId: selectedProjectId } = useProjectsState();

  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<StudioSettingsTab>('pipeline');
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
  const legacyActiveProjectId = parseImageStudioActiveProject(
    heavyMap.get(IMAGE_STUDIO_ACTIVE_PROJECT_KEY)
  );
  const activeProjectId = liveProjectId || activeProjectIdFromPreferences || legacyActiveProjectId;
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

  useEffect(() => {
    return () => {
      if (presetPersistTimerRef.current) {
        clearTimeout(presetPersistTimerRef.current);
        presetPersistTimerRef.current = null;
      }
    };
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
    } catch (error) {
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

  const generationModelOptions = useMemo(() => {
    const discovered = Array.isArray(imageModelsQuery.data?.models) ? imageModelsQuery.data.models : [];
    const currentModel = studioSettings.targetAi.openai.model?.trim() || '';
    return uniqueSortedModelIds([
      ...discovered,
      ...quickSwitchModels,
      ...(currentModel ? [currentModel] : []),
    ]);
  }, [imageModelsQuery.data?.models, quickSwitchModels, studioSettings.targetAi.openai.model]);

  const selectedGenerationModel = useMemo(() => {
    const currentModel = studioSettings.targetAi.openai.model?.trim() || '';
    if (currentModel && quickSwitchModels.includes(currentModel)) return currentModel;
    return quickSwitchModels[0] ?? '';
  }, [quickSwitchModels, studioSettings.targetAi.openai.model]);

  const addableGenerationModelOptions = useMemo(() => {
    return generationModelOptions.filter((modelId) => !quickSwitchModels.includes(modelId));
  }, [generationModelOptions, quickSwitchModels]);

  const quickSwitchModelSelectOptions = useMemo(
    () => quickSwitchModels.map((modelId) => ({ value: modelId, label: modelId })),
    [quickSwitchModels]
  );

  const addableModelSelectOptions = useMemo(
    () => addableGenerationModelOptions.map((modelId) => ({ value: modelId, label: modelId })),
    [addableGenerationModelOptions]
  );

  useEffect(() => {
    if (modelToAdd && addableGenerationModelOptions.includes(modelToAdd)) return;
    setModelToAdd(addableGenerationModelOptions[0] ?? '');
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
    return value && modelCapabilities.sizeOptions.includes(value) ? value : '__null__';
  }, [modelCapabilities.sizeOptions, studioSettings.targetAi.openai.image.size]);

  const modelAwareQualityValue = useMemo(() => {
    const value = studioSettings.targetAi.openai.image.quality;
    return value && modelCapabilities.qualityOptions.includes(value) ? value : '__null__';
  }, [modelCapabilities.qualityOptions, studioSettings.targetAi.openai.image.quality]);

  const modelAwareBackgroundValue = useMemo(() => {
    const value = studioSettings.targetAi.openai.image.background;
    return value && modelCapabilities.backgroundOptions.includes(value) ? value : '__null__';
  }, [modelCapabilities.backgroundOptions, studioSettings.targetAi.openai.image.background]);

  const modelAwareFormatValue = useMemo(() => {
    const value = studioSettings.targetAi.openai.image.format ?? 'png';
    if (modelCapabilities.formatOptions.includes(value)) return value;
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
        label: option === 'white' ? 'white (legacy)' : option,
      })),
    ]),
    [modelCapabilities.backgroundOptions]
  );
  const modelAwareFormatOptions = useMemo(
    () => modelCapabilities.formatOptions.map((option: string) => ({ value: option, label: option })),
    [modelCapabilities.formatOptions]
  );

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

  return (
    <div className={cn('space-y-6', embedded ? '' : 'container mx-auto max-w-5xl py-6')}>
      <PanelHeader
        title='Settings'
        description='Configure prompt extraction, prompt validation, and target AI defaults.'
        actions={[
          ...(!embedded ? [{
            key: 'back',
            label: 'Back to Studio',
            onClick: () => { if (!embedded) window.location.href = '/admin/image-studio'; },
          }] : []),
          {
            key: 'validator',
            label: 'Global Validation',
            onClick: () => { window.location.href = '/admin/validator'; },
          },
          {
            key: 'refresh',
            label: 'Refresh',
            icon: <RefreshCcw className={cn('size-3.5', settingsStore.isFetching && 'animate-spin')} />,
            onClick: handleRefresh,
            disabled: settingsStore.isFetching,
          },
          {
            key: 'reset',
            label: 'Reset',
            onClick: resetStudioSettings,
            disabled: updateSetting.isPending,
          },
          {
            key: 'save',
            label: updateSetting.isPending ? 'Saving...' : 'Save All',
            onClick: () => { void saveStudioSettings(); },
            disabled: updateSetting.isPending || Boolean(advancedOverridesError) || Boolean(promptValidationRulesError),
          }
        ]}
      />

      <div className='space-y-4'>
        <div className='flex items-center justify-between px-1'>
          <StatusBadge 
            status={`Settings Source: ${settingsSource}`} 
            variant='neutral' 
            size='sm'
            className='font-medium'
          />
          {settingsStore.isLoading && !settingsLoaded && (
            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
              <RefreshCcw className='size-3 animate-spin' />
              Loading...
            </div>
          )}
        </div>

        <Tabs
          value={activeSettingsTab}
          onValueChange={(value: string) => setActiveSettingsTab(value as StudioSettingsTab)}
          className='w-full'
        >
          <TabsList className='grid h-auto w-full grid-cols-2 gap-1 bg-muted/40 p-1 sm:grid-cols-5'>
            <TabsTrigger value='pipeline'>Pipeline</TabsTrigger>
            <TabsTrigger value='prompt'>Prompt</TabsTrigger>
            <TabsTrigger value='generation'>Generation</TabsTrigger>
            <TabsTrigger value='validation'>Validation</TabsTrigger>
            <TabsTrigger value='maintenance'>Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value='pipeline' className='mt-6 space-y-6'>
            <FormSection 
              title='Sequence Workflow' 
              description='Define the automated operations executed when processing images.'
              variant='subtle'
            >
              <div className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                  <label className='flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-card/50 cursor-pointer'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 rounded border-gray-300'
                      checked={studioSettings.projectSequencing.enabled}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setStudioSettings((prev: ImageStudioSettings) => ({
                          ...prev,
                          projectSequencing: {
                            ...prev.projectSequencing,
                            enabled: event.target.checked,
                          },
                        }))
                      }
                    />
                    Enable Sequencing
                  </label>
                  
                  <FormField label='Trigger'>
                    <SelectSimple
                      size='sm'
                      value={studioSettings.projectSequencing.trigger}
                      onValueChange={(value: string) =>
                        setStudioSettings((prev: ImageStudioSettings) => ({
                          ...prev,
                          projectSequencing: {
                            ...prev.projectSequencing,
                            trigger: value === 'manual' ? 'manual' : 'manual',
                          },
                        }))
                      }
                      options={PROJECT_SEQUENCE_TRIGGER_OPTIONS}
                      triggerClassName='h-9'
                    />
                  </FormField>

                  <FormField label='Upscale Strategy'>
                    <SelectSimple
                      size='sm'
                      value={studioSettings.projectSequencing.upscaleStrategy}
                      onValueChange={(value: string) => {
                        const strategy = value === 'target_resolution' ? 'target_resolution' : 'scale';
                        setStudioSettings((prev: ImageStudioSettings) => ({
                          ...prev,
                          projectSequencing: {
                            ...prev.projectSequencing,
                            upscaleStrategy: strategy,
                          },
                        }));
                      }}
                      options={PROJECT_SEQUENCE_UPSCALE_STRATEGY_OPTIONS}
                      triggerClassName='h-9'
                    />
                  </FormField>
                </div>

                {studioSettings.projectSequencing.upscaleStrategy === 'scale' ? (
                  <FormField label='Upscale Multiplier' className='max-w-[200px]'>
                    <SelectSimple
                      size='sm'
                      value={String(studioSettings.projectSequencing.upscaleScale)}
                      onValueChange={(value: string) => {
                        const numeric = Number(value);
                        if (!Number.isFinite(numeric)) return;
                        setStudioSettings((prev: ImageStudioSettings) => ({
                          ...prev,
                          projectSequencing: {
                            ...prev.projectSequencing,
                            upscaleScale: numeric,
                          },
                        }));
                      }}
                      options={PROJECT_SEQUENCE_UPSCALE_SCALE_OPTIONS}
                      triggerClassName='h-9'
                    />
                  </FormField>
                ) : (
                  <FormField label='Target Resolution' className='max-w-[300px]'>
                    <div className='flex items-center gap-2'>
                      <Input
                        type='number'
                        min={1}
                        max={32768}
                        value={String(studioSettings.projectSequencing.upscaleTargetWidth)}
                        onChange={(e) => {
                          const val = Math.floor(Number(e.target.value));
                          if (val >= 1) setStudioSettings(p => ({ ...p, projectSequencing: { ...p.projectSequencing, upscaleTargetWidth: val } }));
                        }}
                        className='h-9 font-mono'
                      />
                      <span className='text-gray-500 font-bold'>×</span>
                      <Input
                        type='number'
                        min={1}
                        max={32768}
                        value={String(studioSettings.projectSequencing.upscaleTargetHeight)}
                        onChange={(e) => {
                          const val = Math.floor(Number(e.target.value));
                          if (val >= 1) setStudioSettings(p => ({ ...p, projectSequencing: { ...p.projectSequencing, upscaleTargetHeight: val } }));
                        }}
                        className='h-9 font-mono'
                      />
                    </div>
                  </FormField>
                )}

                <div className='space-y-3 pt-2'>
                  <Label className='text-xs font-semibold uppercase tracking-wider text-gray-500'>Operation Order</Label>
                  <div className='grid gap-2'>
                    {IMAGE_STUDIO_SEQUENCE_OPERATIONS.map((operation) => {
                      const operations = studioSettings.projectSequencing.operations;
                      const enabled = operations.includes(operation);
                      const orderIndex = operations.indexOf(operation);
                      return (
                        <div
                          key={operation}
                          className={cn(
                            'flex items-center justify-between rounded-lg border border-border/40 bg-card/30 px-4 py-2 transition-colors',
                            enabled ? 'border-primary/20 bg-primary/5' : 'opacity-60'
                          )}
                        >
                          <label className='flex cursor-pointer items-center gap-3 py-1'>
                            <input
                              type='checkbox'
                              className='h-4 w-4 rounded border-gray-300'
                              checked={enabled}
                              onChange={(e) => toggleProjectSequencingOperation(operation, e.target.checked)}
                            />
                            <div className='flex items-center gap-2'>
                              <span className='text-sm font-medium text-gray-200'>{PROJECT_SEQUENCE_OPERATION_LABELS[operation]}</span>
                              {enabled && (
                                <StatusBadge status={`Step #${orderIndex + 1}`} variant='info' size='sm' className='font-bold h-5' />
                              )}
                            </div>
                          </label>
                          <div className='flex items-center gap-1'>
                            <Button
                              size='xs'
                              variant='ghost'
                              className='h-7 w-7 p-0'
                              onClick={() => moveProjectSequencingOperation(operation, -1)}
                              disabled={!enabled || orderIndex <= 0}
                            >
                              <ArrowUp className='size-3.5' />
                            </Button>
                            <Button
                              size='xs'
                              variant='ghost'
                              className='h-7 w-7 p-0'
                              onClick={() => moveProjectSequencingOperation(operation, 1)}
                              disabled={!enabled || orderIndex < 0 || orderIndex >= operations.length - 1}
                            >
                              <ArrowDown className='size-3.5' />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </FormSection>
          </TabsContent>

          <TabsContent value='prompt' className='mt-6 space-y-6'>
            <FormSection 
              title='Prompt Extraction' 
              description='Control how prompt parameters are extracted from raw inputs.'
              variant='subtle'
            >
              <div className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <FormField label='Extraction Mode'>
                    <SelectSimple
                      size='sm'
                      value={studioSettings.promptExtraction.mode}
                      onValueChange={(v) => setStudioSettings(p => ({ ...p, promptExtraction: { ...p.promptExtraction, mode: v as any } }))}
                      options={PROMPT_EXTRACTION_MODE_OPTIONS}
                      triggerClassName='h-9'
                    />
                  </FormField>
                  <FormField label='Model'>
                    <Input
                      value={studioSettings.promptExtraction.gpt.model}
                      onChange={(e) => setStudioSettings(p => ({ ...p, promptExtraction: { ...p.promptExtraction, gpt: { ...p.promptExtraction.gpt, model: e.target.value } } }))}
                      className='h-9'
                      placeholder='e.g. gpt-4o-mini'
                    />
                  </FormField>
                </div>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                  <FormField label='Temperature'>
                    <Input
                      type='number'
                      value={studioSettings.promptExtraction.gpt.temperature ?? ''}
                      onChange={(e) => setStudioSettings(p => ({ ...p, promptExtraction: { ...p.promptExtraction, gpt: { ...p.promptExtraction.gpt, temperature: e.target.value === '' ? null : Number(e.target.value) } } }))}
                      className='h-9'
                      min={0} max={2} step={0.1}
                    />
                  </FormField>
                  <FormField label='Top P'>
                    <Input
                      type='number'
                      value={studioSettings.promptExtraction.gpt.top_p ?? ''}
                      onChange={(e) => setStudioSettings(p => ({ ...p, promptExtraction: { ...p.promptExtraction, gpt: { ...p.promptExtraction.gpt, top_p: e.target.value === '' ? null : Number(e.target.value) } } }))}
                      className='h-9'
                      min={0} max={1} step={0.05}
                    />
                  </FormField>
                  <FormField label='Max Tokens'>
                    <Input
                      type='number'
                      value={studioSettings.promptExtraction.gpt.max_output_tokens ?? ''}
                      onChange={(e) => setStudioSettings(p => ({ ...p, promptExtraction: { ...p.promptExtraction, gpt: { ...p.promptExtraction.gpt, max_output_tokens: e.target.value === '' ? null : Number(e.target.value) } } }))}
                      className='h-9'
                      min={1} step={1}
                    />
                  </FormField>
                </div>

                <div className='grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2'>
                  <label className='flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-xs text-gray-300 hover:bg-card/50 cursor-pointer'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 rounded'
                      checked={studioSettings.promptExtraction.applyAutofix}
                      onChange={(e) => setStudioSettings(p => ({ ...p, promptExtraction: { ...p.promptExtraction, applyAutofix: e.target.checked } }))}
                    />
                    Apply autofix
                  </label>
                  <label className='flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-xs text-gray-300 hover:bg-card/50 cursor-pointer'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 rounded'
                      checked={studioSettings.promptExtraction.autoApplyFormattedPrompt}
                      onChange={(e) => setStudioSettings(p => ({ ...p, promptExtraction: { ...p.promptExtraction, autoApplyFormattedPrompt: e.target.checked } }))}
                    />
                    Auto-apply format
                  </label>
                  <label className='flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-xs text-gray-300 hover:bg-card/50 cursor-pointer'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 rounded'
                      checked={studioSettings.promptExtraction.showValidationSummary}
                      onChange={(e) => setStudioSettings(p => ({ ...p, promptExtraction: { ...p.promptExtraction, showValidationSummary: e.target.checked } }))}
                    />
                    Show validation
                  </label>
                </div>
              </div>
            </FormSection>

            <FormSection 
              title='UI Extractor' 
              description='Configure how visual parameters are detected from the workspace.'
              variant='subtle'
            >
              <div className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <FormField label='Extractor Mode'>
                    <SelectSimple
                      size='sm'
                      value={studioSettings.uiExtractor.mode}
                      onValueChange={(v) => setStudioSettings(p => ({ ...p, uiExtractor: { ...p.uiExtractor, mode: v as any } }))}
                      options={UI_EXTRACTOR_MODE_OPTIONS}
                      triggerClassName='h-9'
                    />
                  </FormField>
                  <FormField label='AI Model'>
                    <Input
                      value={studioSettings.uiExtractor.model}
                      onChange={(e) => setStudioSettings(p => ({ ...p, uiExtractor: { ...p.uiExtractor, model: e.target.value } }))}
                      className='h-9'
                      placeholder='e.g. gpt-4o-mini'
                    />
                  </FormField>
                </div>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <FormField label='Temperature'>
                    <Input
                      type='number'
                      value={studioSettings.uiExtractor.temperature ?? ''}
                      onChange={(e) => setStudioSettings(p => ({ ...p, uiExtractor: { ...p.uiExtractor, temperature: e.target.value === '' ? null : Number(e.target.value) } } ))}
                      className='h-9'
                      min={0} max={2} step={0.1}
                    />
                  </FormField>
                  <FormField label='Max Tokens'>
                    <Input
                      type='number'
                      value={studioSettings.uiExtractor.max_output_tokens ?? ''}
                      onChange={(e) => setStudioSettings(p => ({ ...p, uiExtractor: { ...p.uiExtractor, max_output_tokens: e.target.value === '' ? null : Number(e.target.value) } } ))}
                      className='h-9'
                      min={1} step={1}
                    />
                  </FormField>
                </div>
              </div>
            </FormSection>
          </TabsContent>

          <TabsContent value='generation' className='mt-6 space-y-6'>
            <FormSection 
              title='Target AI Configuration' 
              description='Default model and API options for image generation.'
              variant='subtle'
            >
              <div className='space-y-6'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] items-end'>
                  <FormField label='Primary Generation Model' className='flex-1'>
                    <SelectSimple
                      size='sm'
                      value={selectedGenerationModel}
                      onValueChange={(v) => setGenerationModelAndPresets(v, quickSwitchModels)}
                      options={quickSwitchModelSelectOptions}
                      placeholder='Select model'
                      triggerClassName='h-10'
                    />
                  </FormField>
                  <Button
                    variant='outline'
                    className='h-10'
                    onClick={() => { void imageModelsQuery.refetch(); }}
                    disabled={imageModelsQuery.isFetching}
                  >
                    <RefreshCcw className={cn('mr-2 size-4', imageModelsQuery.isFetching && 'animate-spin')} />
                    Sync Models
                  </Button>
                </div>

                <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
                  <Label className='mb-3 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'>
                    Quick-switch Presets
                  </Label>
                  <div className='flex flex-wrap gap-2 mb-4'>
                    {quickSwitchModels.map((modelId) => {
                      const isActive = modelId === studioSettings.targetAi.openai.model;
                      const canRemove = quickSwitchModels.length > 1 || !isActive;
                      return (
                        <div
                          key={modelId}
                          className={cn(
                            'group inline-flex items-center gap-1 rounded-md border px-1 py-1 text-xs transition-colors',
                            isActive
                              ? 'border-sky-400/50 bg-sky-500/10 text-sky-100'
                              : 'border-border/60 bg-card/30 text-muted-foreground hover:border-sky-400/40 hover:bg-card/60'
                          )}
                        >
                          <button
                            type='button'
                            className='rounded px-2 py-1 text-left font-medium leading-none'
                            onClick={() =>
                              setGenerationModelAndPresets(modelId, quickSwitchModels)
                            }
                          >
                            {modelId}
                          </button>
                          <button
                            type='button'
                            className={cn(
                              'rounded p-1 text-muted-foreground/70 transition-colors hover:bg-red-500/15 hover:text-red-300',
                              !canRemove && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground/70'
                            )}
                            disabled={!canRemove}
                            onClick={() => {
                              const nextPresets = quickSwitchModels.filter((presetId) => presetId !== modelId);
                              const nextModel = studioSettings.targetAi.openai.model === modelId
                                ? (nextPresets[0] ?? studioSettings.targetAi.openai.model)
                                : studioSettings.targetAi.openai.model;
                              setGenerationModelAndPresets(nextModel, nextPresets);
                            }}
                          >
                            <X className='size-3' />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className='flex gap-2 items-end max-w-md'>
                    <FormField label='Add Model to Presets' className='flex-1'>
                      <SelectSimple
                        size='sm'
                        value={modelToAdd}
                        onValueChange={setModelToAdd}
                        options={addableModelSelectOptions}
                        placeholder='Select model...'
                        triggerClassName='h-9'
                        disabled={addableGenerationModelOptions.length === 0}
                      />
                    </FormField>
                    <Button
                      size='sm'
                      variant='secondary'
                      className='h-9 px-4'
                      disabled={!modelToAdd}
                      onClick={() => {
                        const nextPresets = [...quickSwitchModels, modelToAdd];
                        setGenerationModelAndPresets(studioSettings.targetAi.openai.model, nextPresets);
                        setModelToAdd('');
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {isGpt52Model ? (
                  <Alert variant='success' className='bg-emerald-500/5 border-emerald-500/20'>
                    GPT-5.2 (advanced) active. Full capability suite enabled.
                  </Alert>
                ) : (
                  <Alert variant='info' className='bg-blue-500/5 border-blue-500/20'>
                    Standard model active. Advanced GPT-5.2 fields are hidden.
                  </Alert>
                )}

                <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                  <FormField label='API Access Key' description='Used for all Image Studio AI operations.'>
                    <Input
                      type='password'
                      value={imageStudioApiKey}
                      onChange={(e) => setImageStudioApiKey(e.target.value)}
                      className='h-10 font-mono'
                      placeholder='sk-...'
                    />
                  </FormField>
                  {modelCapabilities.supportsUser && (
                    <FormField label='OpenAI User Tag' description='Optional metadata for tracking API usage.'>
                      <Input
                        value={studioSettings.targetAi.openai.user ?? ''}
                        onChange={(e) => setStudioSettings(p => ({ ...p, targetAi: { ...p.targetAi, openai: { ...p.targetAi.openai, user: e.target.value || null } } }))}
                        className='h-10'
                        placeholder='e.g. studio_admin'
                      />
                    </FormField>
                  )}
                </div>

                <div className='space-y-4 rounded-lg border border-border/40 bg-card/20 p-4'>
                  <Label className='text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block'>Request Parameters</Label>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    <FormField label='Image Size'>
                      <SelectSimple
                        size='sm'
                        value={modelAwareSizeValue}
                        onValueChange={(v) => setStudioSettings(p => ({ ...p, targetAi: { ...p.targetAi, openai: { ...p.targetAi.openai, image: { ...p.targetAi.openai.image, size: v === '__null__' ? null : v } } } }))}
                        options={modelAwareSizeOptions}
                        triggerClassName='h-9'
                      />
                    </FormField>
                    <FormField label='Quality'>
                      <SelectSimple
                        size='sm'
                        value={modelAwareQualityValue}
                        onValueChange={(v) => setStudioSettings(p => ({ ...p, targetAi: { ...p.targetAi, openai: { ...p.targetAi.openai, image: { ...p.targetAi.openai.image, quality: v === '__null__' ? null : v as any } } } }))}
                        options={modelAwareQualityOptions}
                        triggerClassName='h-9'
                      />
                    </FormField>
                    <FormField label='Background'>
                      <SelectSimple
                        size='sm'
                        value={modelAwareBackgroundValue}
                        onValueChange={(v) => setStudioSettings(p => ({ ...p, targetAi: { ...p.targetAi, openai: { ...p.targetAi.openai, image: { ...p.targetAi.openai.image, background: v === '__null__' ? null : v as any } } } }))}
                        options={modelAwareBackgroundOptions}
                        triggerClassName='h-9'
                      />
                    </FormField>
                    {modelCapabilities.supportsOutputFormat && (
                      <FormField label='File Format'>
                        <SelectSimple
                          size='sm'
                          value={modelAwareFormatValue}
                          onValueChange={(v) => setStudioSettings(p => ({ ...p, targetAi: { ...p.targetAi, openai: { ...p.targetAi.openai, image: { ...p.targetAi.openai.image, format: v as any } } } }))}
                          options={modelAwareFormatOptions}
                          triggerClassName='h-9'
                        />
                      </FormField>
                    )}
                    {modelCapabilities.supportsCount && (
                      <FormField label='Batch Size (N)'>
                        <Input
                          type='number'
                          value={studioSettings.targetAi.openai.image.n ?? ''}
                          onChange={(e) => setStudioSettings(p => ({ ...p, targetAi: { ...p.targetAi, openai: { ...p.targetAi.openai, image: { ...p.targetAi.openai.image, n: e.target.value === '' ? null : Number(e.target.value) } } } }))}
                          className='h-9'
                          min={1} max={10}
                        />
                      </FormField>
                    )}
                  </div>

                  {(modelCapabilities.supportsModeration || modelCapabilities.supportsOutputCompression || modelCapabilities.supportsPartialImages) && (
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2'>
                      {modelCapabilities.supportsModeration && (
                        <FormField label='Moderation'>
                          <SelectSimple
                            size='sm'
                            value={studioSettings.targetAi.openai.image.moderation ?? '__null__'}
                            onValueChange={(v) => setStudioSettings(p => ({ ...p, targetAi: { ...p.targetAi, openai: { ...p.targetAi.openai, image: { ...p.targetAi.openai.image, moderation: v === '__null__' ? null : v as any } } } }))}
                            options={MODERATION_OPTIONS}
                            triggerClassName='h-9'
                          />
                        </FormField>
                      )}
                      {modelCapabilities.supportsOutputCompression && (
                        <FormField label='Compression'>
                          <Input
                            type='number'
                            value={studioSettings.targetAi.openai.image.output_compression ?? ''}
                            onChange={(e) => setStudioSettings(p => ({ ...p, targetAi: { ...p.targetAi, openai: { ...p.targetAi.openai, image: { ...p.targetAi.openai.image, output_compression: e.target.value === '' ? null : Number(e.target.value) } } } }))}
                            className='h-9'
                            min={0} max={100}
                          />
                        </FormField>
                      )}
                      {modelCapabilities.supportsPartialImages && (
                        <FormField label='Partial Images'>
                          <Input
                            type='number'
                            value={studioSettings.targetAi.openai.image.partial_images ?? ''}
                            onChange={(e) => setStudioSettings(p => ({ ...p, targetAi: { ...p.targetAi, openai: { ...p.targetAi.openai, image: { ...p.targetAi.openai.image, partial_images: e.target.value === '' ? null : Number(e.target.value) } } } }))}
                            className='h-9'
                            min={0} max={3}
                          />
                        </FormField>
                      )}
                    </div>
                  )}

                  {modelCapabilities.supportsStream && (
                    <label className='flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-xs text-gray-300 hover:bg-card/50 cursor-pointer w-fit mt-2'>
                      <input
                        type='checkbox'
                        className='h-4 w-4 rounded'
                        checked={studioSettings.targetAi.openai.stream}
                        onChange={(e) => setStudioSettings(p => ({ ...p, targetAi: { ...p.targetAi, openai: { ...p.targetAi.openai, stream: e.target.checked } } }))}
                      />
                      Enable API Streaming
                    </label>
                  )}
                </div>

                <FormField label='Advanced Overrides (JSON)' description='Inject raw parameters directly into the Images API request.'>
                  <Textarea
                    value={advancedOverridesText}
                    onChange={(e) => handleAdvancedOverridesChange(e.target.value)}
                    className={cn('min-h-[120px] font-mono text-[11px] bg-gray-950/40', advancedOverridesError && 'border-destructive focus-visible:ring-destructive')}
                    placeholder='{"metadata": {"project": "xyz"}}'
                  />
                  {advancedOverridesError && (
                    <p className='text-[10px] text-destructive mt-1 font-medium'>{advancedOverridesError}</p>
                  )}
                </FormField>
              </div>
            </FormSection>
          </TabsContent>

          <TabsContent value='validation' className='mt-6 space-y-6'>
            <FormSection 
              title='Prompt Validator' 
              description='Control programmatic prompt quality using rule-based validation.'
              variant='subtle'
            >
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <Label className='text-sm font-medium text-gray-200'>Validator Engine Status</Label>
                  <label className='flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 rounded'
                      checked={promptValidationEnabled}
                      onChange={(e) => setPromptValidationEnabled(e.target.checked)}
                    />
                    Validator Enabled
                  </label>
                </div>
                
                <FormField label='Validation Rules (JSON)' description='Definition of heuristics and patterns to enforce in prompts.'>
                  <Textarea
                    value={promptValidationRulesText}
                    onChange={(e) => handlePromptValidationRulesChange(e.target.value)}
                    className={cn('min-h-[300px] font-mono text-[11px] bg-gray-950/40', promptValidationRulesError && 'border-destructive')}
                    placeholder='[{ "ruleId": "no-brand-names", ... }]'
                  />
                  {promptValidationRulesError && (
                    <p className='text-[10px] text-destructive mt-1 font-medium'>{promptValidationRulesError}</p>
                  )}
                </FormField>
              </div>
            </FormSection>
          </TabsContent>

          <TabsContent value='maintenance' className='mt-6 space-y-6'>
            <FormSection 
              title='Metadata Migration' 
              description='Tools for backfilling and normalizing Image Studio data records.'
              variant='subtle'
            >
              <div className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <FormField label='Target Project' description='Process specific project or leave empty for all.'>
                    <Input
                      value={backfillProjectId}
                      onChange={(e) => setBackfillProjectId(e.target.value)}
                      className='h-9'
                      placeholder='global / all'
                    />
                  </FormField>
                  <FormField label='Execution Mode' description='Dry-run will only report changes without writing.'>
                    <SelectSimple
                      size='sm'
                      value={backfillDryRun ? 'dry' : 'write'}
                      onValueChange={(v) => setBackfillDryRun(v === 'dry')}
                      options={BACKFILL_EXECUTION_MODE_OPTIONS}
                      triggerClassName='h-9'
                    />
                  </FormField>
                </div>

                <label className='flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-xs text-gray-300 hover:bg-card/50 cursor-pointer w-fit'>
                  <input
                    type='checkbox'
                    className='h-4 w-4 rounded'
                    checked={backfillIncludeHeuristicGenerationLinks}
                    onChange={(e) => setBackfillIncludeHeuristicGenerationLinks(e.target.checked)}
                  />
                  Include generation heuristic linking
                </label>

                <div className='pt-2'>
                  <Button
                    onClick={() => { void runCardBackfill(); }}
                    disabled={backfillRunning}
                    className='min-w-[160px]'
                  >
                    {backfillRunning ? (
                      <>
                        <RefreshCcw className='mr-2 size-4 animate-spin' />
                        Processing...
                      </>
                    ) : (
                      'Execute Backfill'
                    )}
                  </Button>
                </div>

                {backfillResultText && (
                  <div className='space-y-2'>
                    <Label className='text-[10px] uppercase font-bold text-gray-500'>Result Summary</Label>
                    <pre className='max-h-80 overflow-auto rounded-lg border border-border/60 bg-gray-950/60 p-4 font-mono text-[11px] text-emerald-400 whitespace-pre-wrap leading-relaxed shadow-inner'>
                      {backfillResultText}
                    </pre>
                  </div>
                )}
              </div>
            </FormSection>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
