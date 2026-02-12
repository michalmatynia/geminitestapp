'use client';

import { RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  SectionHeader,
  SectionPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { serializeSetting } from '@/shared/utils/settings-json';

import { useStudioImageModels } from '../hooks/useImageStudioQueries';
import { getImageModelCapabilities, isGpt52ImageModel, uniqueSortedModelIds } from '../utils/image-models';
import {
  defaultImageStudioSettings,
  IMAGE_STUDIO_OPENAI_API_KEY_KEY,
  IMAGE_STUDIO_SETTINGS_KEY,
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

export function AdminImageStudioSettingsPage({ embedded = false }: { embedded?: boolean | undefined } = {}): React.JSX.Element {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();
  const imageModelsQuery = useStudioImageModels();

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

  // Derived state for settings initialization
  const [prevSettingsData, setPrevSettingsData] = useState<unknown>(null);
  const promptEngineRaw = settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY);
  const promptEngineSettings = useMemo(
    () => parsePromptEngineSettings(promptEngineRaw),
    [promptEngineRaw]
  );
  const heavyMap = heavySettings.data ?? new Map<string, string>();

  useEffect(() => {
    if (!heavySettings.data || settingsLoaded) return;
    if (heavySettings.data === prevSettingsData) return;

    setPrevSettingsData(heavySettings.data);

    const storedRaw = heavySettings.data.get(IMAGE_STUDIO_SETTINGS_KEY);
    const stored = parseImageStudioSettings(storedRaw);
    const promptEngineStored = parsePromptEngineSettings(settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY));
    const openaiModelFallback = settingsStore.get('openai_model');
    const apiKeyFallback = settingsStore.get(IMAGE_STUDIO_OPENAI_API_KEY_KEY) ?? settingsStore.get('openai_api_key') ?? '';
    const hasStoredStudioSettings = Boolean(storedRaw && storedRaw.trim().length > 0);

    const hydrated: ImageStudioSettings =
      openaiModelFallback && !hasStoredStudioSettings
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
    setAdvancedOverridesText(JSON.stringify(hydrated.targetAi.openai.advanced_overrides ?? {}, null, 2));
    setImageStudioApiKey(apiKeyFallback);
    setPromptValidationEnabled(promptEngineStored.promptValidation.enabled);
    setPromptValidationRulesText(JSON.stringify(promptEngineStored.promptValidation.rules, null, 2));
    setPromptValidationRulesError(null);
    setSettingsLoaded(true);
  }, [heavySettings.data, prevSettingsData, settingsLoaded, settingsStore]);

  const handleRefresh = useCallback(async (): Promise<void> => {
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

    if (!studioSettings.targetAi.openai.model.trim()) {
      toast('Target AI model is required.', { variant: 'error' });
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
      await updateSetting.mutateAsync({
        key: IMAGE_STUDIO_SETTINGS_KEY,
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
      toast('Image Studio settings saved.', { variant: 'success' });
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
    promptValidationRulesText,
    promptEngineSettings,
    toast,
    updateSetting,
  ]);

  const resetStudioSettings = useCallback((): void => {
    setStudioSettings(defaultImageStudioSettings);
    setAdvancedOverridesText(JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2));
    setAdvancedOverridesError(null);
    setPromptValidationEnabled(defaultPromptEngineSettings.promptValidation.enabled);
    setPromptValidationRulesText(JSON.stringify(defaultPromptEngineSettings.promptValidation.rules, null, 2));
    setPromptValidationRulesError(null);
  }, []);

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

  const studioSettingsRaw = heavyMap.get(IMAGE_STUDIO_SETTINGS_KEY);

  const settingsSource = useMemo(() => {
    return studioSettingsRaw ? 'saved settings' : 'defaults';
  }, [studioSettingsRaw]);

  const generationModelOptions = useMemo(() => {
    const discovered = Array.isArray(imageModelsQuery.data?.models) ? imageModelsQuery.data.models : [];
    const currentModel = studioSettings.targetAi.openai.model?.trim() || '';
    return uniqueSortedModelIds([
      ...discovered,
      ...(currentModel ? [currentModel] : []),
    ]);
  }, [imageModelsQuery.data?.models, studioSettings.targetAi.openai.model]);

  const selectedGenerationModel = useMemo(() => {
    const currentModel = studioSettings.targetAi.openai.model?.trim() || '';
    if (currentModel && generationModelOptions.includes(currentModel)) return currentModel;
    return '__custom__';
  }, [generationModelOptions, studioSettings.targetAi.openai.model]);

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

  return (
    <div className={cn('space-y-4', embedded ? '' : 'container mx-auto max-w-5xl py-6')}>
      <SectionHeader
        eyebrow='AI · Image Studio'
        title='Settings'
        description='Configure prompt extraction, prompt validation, and target AI defaults.'
        actions={
          <>
            {!embedded ? (
              <Button type='button' variant='outline' asChild>
                <Link href='/admin/image-studio'>Back to Studio</Link>
              </Button>
            ) : null}
            <Button type='button' variant='outline' asChild>
              <Link href='/admin/validator'>Global Validation Patterns</Link>
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => { void handleRefresh(); }}
              disabled={settingsStore.isFetching}
              title='Reload settings'
            >
              <RefreshCcw className={cn('mr-2 size-4', settingsStore.isFetching ? 'animate-spin' : '')} />
              Refresh
            </Button>
          </>
        }
      />

      <SectionPanel variant='subtle'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='text-xs text-gray-300'>Studio Settings</div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={resetStudioSettings}
              disabled={updateSetting.isPending}
            >
              Reset
            </Button>
            <Button
              size='sm'
              onClick={() => { saveStudioSettings().catch(() => {}); }}
              disabled={updateSetting.isPending || Boolean(advancedOverridesError) || Boolean(promptValidationRulesError)}
            >
              {updateSetting.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        <div className='mt-1 text-[11px] text-gray-500'>
          Source: {settingsSource}
        </div>

        {settingsStore.isLoading && !settingsLoaded ? (
          <div className='mt-2 text-xs text-gray-500'>Loading settings…</div>
        ) : null}

        <Tabs
          value={activeSettingsTab}
          onValueChange={(value: string) =>
            setActiveSettingsTab(
              value === 'prompt' || value === 'generation' || value === 'validation' || value === 'maintenance'
                ? value
                : 'pipeline'
            )
          }
          className='mt-4'
        >
          <TabsList className='grid h-auto w-full grid-cols-2 gap-1 bg-card/40 p-1 sm:grid-cols-5'>
            <TabsTrigger value='pipeline'>Pipeline</TabsTrigger>
            <TabsTrigger value='prompt'>Prompt</TabsTrigger>
            <TabsTrigger value='generation'>Generation</TabsTrigger>
            <TabsTrigger value='validation'>Validation</TabsTrigger>
            <TabsTrigger value='maintenance'>Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value='pipeline' className='mt-4 space-y-3'>
            <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-300'>
              Main flow: <span className='text-gray-100'>selected preview image + resolved prompt</span> are sent to OpenAI Images API,
              and returned images are available in Outputs where they can be added to card history/versions.
            </div>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
              <div className='rounded border border-border/60 bg-card/30 p-3'>
                <div className='text-[11px] text-gray-500'>Main Generation Model</div>
                <div className='mt-1 text-xs text-gray-100'>{studioSettings.targetAi.openai.model || 'Not set'}</div>
              </div>
              <div className='rounded border border-border/60 bg-card/30 p-3'>
                <div className='text-[11px] text-gray-500'>Model Source</div>
                <div className='mt-1 text-xs text-gray-100'>
                  {imageModelsQuery.data?.source === 'openai' ? 'Discovered from OpenAI' : 'Fallback list'}
                </div>
              </div>
              <div className='rounded border border-border/60 bg-card/30 p-3'>
                <div className='text-[11px] text-gray-500'>API Key</div>
                <div className='mt-1 text-xs text-gray-100'>
                  {imageStudioApiKey.trim() ? 'Configured in Image Studio' : 'Using global/env fallback or missing'}
                </div>
              </div>
            </div>
            {imageModelsQuery.data?.warning ? (
              <div className='text-[11px] text-amber-300'>{imageModelsQuery.data.warning}</div>
            ) : null}
          </TabsContent>

          <TabsContent value='prompt' className='mt-4 space-y-4'>
            <div className='space-y-2'>
              <Label className='text-xs text-gray-400'>Prompt Extraction</Label>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Mode</div>
                  <Select
                    value={studioSettings.promptExtraction.mode}
                    onValueChange={(value: string) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        promptExtraction: {
                          ...prev.promptExtraction,
                          mode: value === 'gpt' || value === 'hybrid' ? value : 'programmatic',
                        },
                      }))
                    }
                  >
                    <SelectTrigger className='h-8'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='programmatic'>Programmatic</SelectItem>
                      <SelectItem value='gpt'>GPT (AI)</SelectItem>
                      <SelectItem value='hybrid'>Hybrid (Auto Fallback)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Model</div>
                  <Input
                    value={studioSettings.promptExtraction.gpt.model}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        promptExtraction: {
                          ...prev.promptExtraction,
                          gpt: { ...prev.promptExtraction.gpt, model: e.target.value },
                        },
                      }))
                    }
                    className='h-8'
                    placeholder='e.g. gpt-4o-mini'
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Temperature</div>
                  <Input
                    type='number'
                    value={studioSettings.promptExtraction.gpt.temperature ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value;
                      const next = raw === '' ? null : Number(raw);
                      if (raw !== '' && !Number.isFinite(next)) return;
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        promptExtraction: {
                          ...prev.promptExtraction,
                          gpt: { ...prev.promptExtraction.gpt, temperature: next },
                        },
                      }));
                    }}
                    className='h-8'
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Top P</div>
                  <Input
                    type='number'
                    value={studioSettings.promptExtraction.gpt.top_p ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value;
                      const next = raw === '' ? null : Number(raw);
                      if (raw !== '' && !Number.isFinite(next)) return;
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        promptExtraction: {
                          ...prev.promptExtraction,
                          gpt: { ...prev.promptExtraction.gpt, top_p: next },
                        },
                      }));
                    }}
                    className='h-8'
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Max Output Tokens</div>
                  <Input
                    type='number'
                    value={studioSettings.promptExtraction.gpt.max_output_tokens ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value;
                      const next = raw === '' ? null : Number(raw);
                      if (raw !== '' && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        promptExtraction: {
                          ...prev.promptExtraction,
                          gpt: { ...prev.promptExtraction.gpt, max_output_tokens: next },
                        },
                      }));
                    }}
                    className='h-8'
                    min={1}
                    step={1}
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                <label className='flex items-center gap-2 rounded border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-200'>
                  <input
                    type='checkbox'
                    className='h-3.5 w-3.5'
                    checked={studioSettings.promptExtraction.applyAutofix}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        promptExtraction: {
                          ...prev.promptExtraction,
                          applyAutofix: event.target.checked,
                        },
                      }))
                    }
                  />
                  Apply formatter before extract
                </label>
                <label className='flex items-center gap-2 rounded border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-200'>
                  <input
                    type='checkbox'
                    className='h-3.5 w-3.5'
                    checked={studioSettings.promptExtraction.autoApplyFormattedPrompt}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        promptExtraction: {
                          ...prev.promptExtraction,
                          autoApplyFormattedPrompt: event.target.checked,
                        },
                      }))
                    }
                  />
                  Auto-apply formatted prompt
                </label>
                <label className='flex items-center gap-2 rounded border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-200'>
                  <input
                    type='checkbox'
                    className='h-3.5 w-3.5'
                    checked={studioSettings.promptExtraction.showValidationSummary}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        promptExtraction: {
                          ...prev.promptExtraction,
                          showValidationSummary: event.target.checked,
                        },
                      }))
                    }
                  />
                  Show validation summary
                </label>
              </div>
            </div>

            <div className='space-y-2 rounded border border-border/60 bg-card/30 p-3'>
              <Label className='text-xs text-gray-400'>UI Extractor</Label>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Mode</div>
                  <Select
                    value={studioSettings.uiExtractor.mode}
                    onValueChange={(value: string) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        uiExtractor: {
                          ...prev.uiExtractor,
                          mode: value === 'ai' || value === 'both' ? value : 'heuristic',
                        },
                      }))
                    }
                  >
                    <SelectTrigger className='h-8'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='heuristic'>Heuristic</SelectItem>
                      <SelectItem value='ai'>AI</SelectItem>
                      <SelectItem value='both'>Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Model</div>
                  <Input
                    value={studioSettings.uiExtractor.model}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        uiExtractor: {
                          ...prev.uiExtractor,
                          model: e.target.value,
                        },
                      }))
                    }
                    className='h-8'
                    placeholder='e.g. gpt-4o-mini'
                  />
                </div>
              </div>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Temperature</div>
                  <Input
                    type='number'
                    value={studioSettings.uiExtractor.temperature ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value;
                      const next = raw === '' ? null : Number(raw);
                      if (raw !== '' && !Number.isFinite(next)) return;
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        uiExtractor: {
                          ...prev.uiExtractor,
                          temperature: next,
                        },
                      }));
                    }}
                    className='h-8'
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Max Output Tokens</div>
                  <Input
                    type='number'
                    value={studioSettings.uiExtractor.max_output_tokens ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value;
                      const next = raw === '' ? null : Number(raw);
                      if (raw !== '' && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        uiExtractor: {
                          ...prev.uiExtractor,
                          max_output_tokens: next,
                        },
                      }));
                    }}
                    className='h-8'
                    min={1}
                    step={1}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='generation' className='mt-4 space-y-4'>
            <div className='space-y-2 rounded border border-border/60 bg-card/30 p-3'>
              <Label className='text-xs text-gray-400'>Target AI (OpenAI / GPT)</Label>
              <div className='text-[11px] text-gray-500'>
                Generation runs with the Images API (image-in, image-out).
              </div>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]'>
                <Select
                  value={selectedGenerationModel}
                  onValueChange={(value: string) => {
                    if (value === '__custom__') return;
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: {
                        ...prev.targetAi,
                        openai: {
                          ...prev.targetAi.openai,
                          api: 'images',
                          model: value,
                        },
                      },
                    }));
                  }}
                >
                  <SelectTrigger className='h-8'>
                    <SelectValue placeholder={imageModelsQuery.isFetching ? 'Loading models...' : 'Select model'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__custom__'>Custom model (manual input)</SelectItem>
                    {generationModelOptions.map((modelId) => (
                      <SelectItem key={modelId} value={modelId}>
                        {modelId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => { void imageModelsQuery.refetch(); }}
                  disabled={imageModelsQuery.isFetching}
                >
                  {imageModelsQuery.isFetching ? 'Refreshing…' : 'Refresh Models'}
                </Button>
              </div>
              <Input
                value={studioSettings.targetAi.openai.model}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
                    ...prev,
                    targetAi: {
                      ...prev.targetAi,
                      openai: {
                        ...prev.targetAi.openai,
                        api: 'images',
                        model: e.target.value,
                      },
                    },
                  }))
                }
                className='h-8'
                placeholder='e.g. gpt-5.2 or gpt-image-1'
              />
              <div className='text-[11px] text-gray-500'>
                Source: {imageModelsQuery.data?.source === 'openai' ? 'OpenAI discovery' : 'fallback list'}
              </div>
              {imageModelsQuery.data?.warning ? (
                <div className='text-[11px] text-amber-300'>{imageModelsQuery.data.warning}</div>
              ) : null}
              {isGpt52Model ? (
                <div className='rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px] text-emerald-100'>
                  GPT-5.2 selected. Model-aware mode is active, and unsupported request fields are hidden and omitted at runtime.
                </div>
              ) : (
                <div className='rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-100'>
                  Model-aware mode active. GPT-5.2-only options (moderation, output compression, partial images, stream)
                  are hidden for this model.
                </div>
              )}
            </div>

            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              <div className='space-y-1'>
                <div className='text-[11px] text-gray-500'>OpenAI API Key</div>
                <Input
                  type='password'
                  value={imageStudioApiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImageStudioApiKey(e.target.value)}
                  className='h-8'
                  placeholder='sk-...'
                  autoComplete='off'
                />
                <div className='text-[11px] text-gray-500'>
                  Used by run, prompt extraction, UI extraction, and AI mask detection.
                </div>
              </div>
              {modelCapabilities.supportsUser ? (
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>User (optional)</div>
                  <Input
                    value={studioSettings.targetAi.openai.user ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        targetAi: {
                          ...prev.targetAi,
                          openai: {
                            ...prev.targetAi.openai,
                            user: e.target.value.trim() ? e.target.value : null,
                          },
                        },
                      }))
                    }
                    className='h-8'
                    placeholder='e.g. user_123'
                  />
                </div>
              ) : null}
            </div>

            <div className='space-y-2 rounded border border-border/60 bg-card/30 p-3'>
              <div className='text-xs text-gray-400'>Images API options</div>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Size</div>
                  <Select
                    value={modelAwareSizeValue}
                    onValueChange={(value: string) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        targetAi: {
                          ...prev.targetAi,
                          openai: {
                            ...prev.targetAi.openai,
                            image: {
                              ...prev.targetAi.openai.image,
                              size: value === '__null__' ? null : value,
                            },
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger className='h-8'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__null__'>Default</SelectItem>
                      {modelCapabilities.sizeOptions.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Quality</div>
                  <Select
                    value={modelAwareQualityValue}
                    onValueChange={(value: string) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        targetAi: {
                          ...prev.targetAi,
                          openai: {
                            ...prev.targetAi.openai,
                            image: {
                              ...prev.targetAi.openai.image,
                              quality: value === '__null__'
                                ? null
                                : value as ImageStudioSettings['targetAi']['openai']['image']['quality'],
                            },
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger className='h-8'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__null__'>Default</SelectItem>
                      {modelCapabilities.qualityOptions.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                <div className='space-y-1'>
                  <div className='text-[11px] text-gray-500'>Background</div>
                  <Select
                    value={modelAwareBackgroundValue}
                    onValueChange={(value: string) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        targetAi: {
                          ...prev.targetAi,
                          openai: {
                            ...prev.targetAi.openai,
                            image: {
                              ...prev.targetAi.openai.image,
                              background: value === '__null__'
                                ? null
                                : value as ImageStudioSettings['targetAi']['openai']['image']['background'],
                            },
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger className='h-8'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__null__'>Default</SelectItem>
                      {modelCapabilities.backgroundOptions.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option === 'white' ? 'white (legacy)' : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {modelCapabilities.supportsOutputFormat ? (
                  <div className='space-y-1'>
                    <div className='text-[11px] text-gray-500'>Format</div>
                    <Select
                      value={modelAwareFormatValue}
                      onValueChange={(value: string) =>
                        setStudioSettings((prev: ImageStudioSettings) => ({
                          ...prev,
                          targetAi: {
                            ...prev.targetAi,
                            openai: {
                              ...prev.targetAi.openai,
                              image: {
                                ...prev.targetAi.openai.image,
                                format: value as ImageStudioSettings['targetAi']['openai']['image']['format'],
                              },
                            },
                          },
                        }))
                      }
                    >
                      <SelectTrigger className='h-8'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modelCapabilities.formatOptions.map((option: string) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {modelCapabilities.supportsCount ? (
                  <div className='space-y-1'>
                    <div className='text-[11px] text-gray-500'>N</div>
                    <Input
                      type='number'
                      value={studioSettings.targetAi.openai.image.n ?? ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const raw = e.target.value;
                        const next = raw === '' ? null : Number(raw);
                        if (raw !== '' && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                        setStudioSettings((prev: ImageStudioSettings) => ({
                          ...prev,
                          targetAi: {
                            ...prev.targetAi,
                            openai: {
                              ...prev.targetAi.openai,
                              image: { ...prev.targetAi.openai.image, n: next },
                            },
                          },
                        }));
                      }}
                      className='h-8'
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>
                ) : null}
              </div>

              {modelCapabilities.supportsModeration || modelCapabilities.supportsOutputCompression || modelCapabilities.supportsPartialImages ? (
                <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                  {modelCapabilities.supportsModeration ? (
                    <div className='space-y-1'>
                      <div className='text-[11px] text-gray-500'>Moderation</div>
                      <Select
                        value={studioSettings.targetAi.openai.image.moderation ?? '__null__'}
                        onValueChange={(value: string) =>
                          setStudioSettings((prev: ImageStudioSettings) => ({
                            ...prev,
                            targetAi: {
                              ...prev.targetAi,
                              openai: {
                                ...prev.targetAi.openai,
                                image: {
                                  ...prev.targetAi.openai.image,
                                  moderation: value === '__null__'
                                    ? null
                                    : value as ImageStudioSettings['targetAi']['openai']['image']['moderation'],
                                },
                              },
                            },
                          }))
                        }
                      >
                        <SelectTrigger className='h-8'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='__null__'>Default</SelectItem>
                          <SelectItem value='auto'>auto</SelectItem>
                          <SelectItem value='low'>low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {modelCapabilities.supportsOutputCompression ? (
                    <div className='space-y-1'>
                      <div className='text-[11px] text-gray-500'>Output Compression</div>
                      <Input
                        type='number'
                        value={studioSettings.targetAi.openai.image.output_compression ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value;
                          const next = raw === '' ? null : Number(raw);
                          if (raw !== '' && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                          setStudioSettings((prev: ImageStudioSettings) => ({
                            ...prev,
                            targetAi: {
                              ...prev.targetAi,
                              openai: {
                                ...prev.targetAi.openai,
                                image: { ...prev.targetAi.openai.image, output_compression: next },
                              },
                            },
                          }));
                        }}
                        className='h-8'
                        min={0}
                        max={100}
                        step={1}
                      />
                      <div className='text-[10px] text-gray-500'>
                        Used for jpeg/webp output formats.
                      </div>
                    </div>
                  ) : null}

                  {modelCapabilities.supportsPartialImages ? (
                    <div className='space-y-1'>
                      <div className='text-[11px] text-gray-500'>Partial Images</div>
                      <Input
                        type='number'
                        value={studioSettings.targetAi.openai.image.partial_images ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value;
                          const next = raw === '' ? null : Number(raw);
                          if (raw !== '' && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                          setStudioSettings((prev: ImageStudioSettings) => ({
                            ...prev,
                            targetAi: {
                              ...prev.targetAi,
                              openai: {
                                ...prev.targetAi.openai,
                                image: { ...prev.targetAi.openai.image, partial_images: next },
                              },
                            },
                          }));
                        }}
                        className='h-8'
                        min={0}
                        max={3}
                        step={1}
                      />
                      <div className='text-[10px] text-gray-500'>
                        Partial results returned while streaming.
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {modelCapabilities.supportsStream ? (
                <label className='flex items-center gap-2 rounded border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-200'>
                  <input
                    type='checkbox'
                    className='h-3.5 w-3.5'
                    checked={studioSettings.targetAi.openai.stream}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        targetAi: {
                          ...prev.targetAi,
                          openai: {
                            ...prev.targetAi.openai,
                            stream: event.target.checked,
                          },
                        },
                      }))
                    }
                  />
                  Stream response events
                </label>
              ) : null}
            </div>

            <div className='space-y-1'>
              <div className='text-[11px] text-gray-500'>Advanced Overrides (JSON)</div>
              <Textarea
                value={advancedOverridesText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAdvancedOverridesChange(e.target.value)}
                className='h-28 font-mono text-[11px]'
                placeholder='e.g. {"metadata":{"project":"milkbar-001"}}'
              />
              {advancedOverridesError ? (
                <div className='text-[11px] text-red-300'>{advancedOverridesError}</div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value='validation' className='mt-4 space-y-2'>
            <div className='flex items-center justify-between gap-2'>
              <Label className='text-xs text-gray-400'>Prompt Validator</Label>
              <label className='flex items-center gap-2 text-xs text-gray-200'>
                <input
                  type='checkbox'
                  checked={promptValidationEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPromptValidationEnabled(e.target.checked)
                  }
                />
                Enabled
              </label>
            </div>
            <div className='text-[11px] text-gray-500'>
              Validates programmatic prompts and suggests fixes when patterns look almost correct. Auto format uses each rule’s <span className='text-gray-300'>autofix</span> operations.
            </div>
            <Textarea
              value={promptValidationRulesText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handlePromptValidationRulesChange(e.target.value)}
              className='h-56 font-mono text-[11px]'
              placeholder='JSON array of validator rules'
            />
            {promptValidationRulesError ? (
              <div className='text-[11px] text-red-300'>{promptValidationRulesError}</div>
            ) : null}
          </TabsContent>

          <TabsContent value='maintenance' className='mt-4 space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='text-xs text-gray-300'>Card Metadata Backfill</div>
              <Button
                type='button'
                size='sm'
                onClick={() => { void runCardBackfill(); }}
                disabled={backfillRunning}
              >
                {backfillRunning ? 'Running...' : backfillDryRun ? 'Run Dry-Run' : 'Run Backfill'}
              </Button>
            </div>

            <div className='text-[11px] text-gray-500'>
              One-time migration utility for older Image Studio data. It backfills card linkage metadata from slot links,
              mask folder conventions, and optional generation heuristics.
            </div>

            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Project ID (optional)</Label>
                <Input
                  value={backfillProjectId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setBackfillProjectId(event.target.value)}
                  className='h-8'
                  placeholder='Leave empty to process all projects'
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Execution Mode</Label>
                <Select
                  value={backfillDryRun ? 'dry' : 'write'}
                  onValueChange={(value: string) => setBackfillDryRun(value !== 'write')}
                >
                  <SelectTrigger className='h-8'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='dry'>Dry-run (no writes)</SelectItem>
                    <SelectItem value='write'>Write updates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className='flex items-center gap-2 rounded border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-200'>
              <input
                type='checkbox'
                className='h-3.5 w-3.5'
                checked={backfillIncludeHeuristicGenerationLinks}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setBackfillIncludeHeuristicGenerationLinks(event.target.checked)
                }
              />
              Include generation heuristic linking for legacy output cards
            </label>

            {backfillResultText ? (
              <pre className='max-h-64 overflow-auto rounded border border-border/60 bg-black/30 p-2 font-mono text-[11px] text-gray-200 whitespace-pre-wrap'>
                {backfillResultText}
              </pre>
            ) : null}
          </TabsContent>
        </Tabs>
      </SectionPanel>
    </div>
  );
}
