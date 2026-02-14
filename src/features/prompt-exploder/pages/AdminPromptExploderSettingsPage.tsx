'use client';

import { ArrowLeft, RefreshCcw, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  parseBrainProviderCatalog,
} from '@/features/ai/brain/settings';
import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  FormSection,
  Label,
  SectionHeader,
  StatusToggle,
  Button,
  Input,
  SelectSimple,
  useToast,
} from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  parsePromptExploderSettings,
  PROMPT_EXPLODER_SETTINGS_KEY,
} from '../settings';

import type {
  PromptExploderAiProvider,
  PromptExploderOperationMode,
  PromptExploderSettings,
} from '../types';

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toIntInRange = (value: number, min: number, max: number): number =>
  clampNumber(Math.floor(value), min, max);

const OPERATION_MODE_OPTIONS: Array<{
  value: PromptExploderOperationMode;
  label: string;
}> = [
  { value: 'rules_only', label: 'Rules Only' },
  { value: 'hybrid', label: 'Hybrid (Rules + AI)' },
  { value: 'ai_assisted', label: 'AI Assisted' },
];

const AI_PROVIDER_OPTIONS: Array<{
  value: PromptExploderAiProvider;
  label: string;
}> = [
  { value: 'auto', label: 'Auto' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Gemini' },
];

type SettingsDraft = Pick<PromptExploderSettings, 'runtime' | 'learning' | 'ai'>;

const toSettingsDraft = (settings: PromptExploderSettings): SettingsDraft => ({
  runtime: settings.runtime,
  learning: settings.learning,
  ai: settings.ai,
});

export function AdminPromptExploderSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();
  const chatbotModelsQuery = useChatbotModels({
    enabled: settingsQuery.isSuccess,
  });

  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);

  const rawSettings = settingsQuery.data?.get(PROMPT_EXPLODER_SETTINGS_KEY) ?? null;
  const parsedSettings = useMemo(
    () => parsePromptExploderSettings(rawSettings),
    [rawSettings]
  );
  const providerCatalog = useMemo(
    () =>
      parseBrainProviderCatalog(
        settingsQuery.data?.get(AI_BRAIN_PROVIDER_CATALOG_KEY) ?? null
      ),
    [settingsQuery.data]
  );

  useEffect(() => {
    const raw = rawSettings ?? '';
    if (draft && loadedFrom === raw) return;
    setDraft(toSettingsDraft(parsedSettings));
    setLoadedFrom(raw);
  }, [draft, loadedFrom, parsedSettings, rawSettings]);

  const modelOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; description: string }> = [];
    const seen = new Set<string>();

    const append = (values: string[], source: string): void => {
      values.forEach((value) => {
        const model = value.trim();
        if (!model || seen.has(model)) return;
        seen.add(model);
        options.push({
          value: model,
          label: model,
          description: source,
        });
      });
    };

    append(providerCatalog.modelPresets, 'AI Brain preset');
    append(providerCatalog.paidModels, 'AI Brain paid model');
    append(providerCatalog.ollamaModels, 'AI Brain ollama');
    append(chatbotModelsQuery.data ?? [], 'live discovery');

    const openAiModel = settingsQuery.data?.get('openai_model') ?? '';
    if (openAiModel.trim()) append([openAiModel], 'system openai_model');

    const modelId = draft?.ai.modelId ?? '';
    const fallbackModelId = draft?.ai.fallbackModelId ?? '';
    append([modelId], 'current model');
    append([fallbackModelId], 'fallback model');

    return options;
  }, [
    chatbotModelsQuery.data,
    draft?.ai.fallbackModelId,
    draft?.ai.modelId,
    providerCatalog.modelPresets,
    providerCatalog.ollamaModels,
    providerCatalog.paidModels,
    settingsQuery.data,
  ]);

  const modelDiscoverySummary = useMemo(() => {
    const discovered = chatbotModelsQuery.data?.length ?? 0;
    const catalog = new Set([
      ...providerCatalog.modelPresets,
      ...providerCatalog.paidModels,
      ...providerCatalog.ollamaModels,
    ]).size;
    return `Catalog ${catalog} + live ${discovered} = ${modelOptions.length} unique model option(s)`;
  }, [
    chatbotModelsQuery.data?.length,
    modelOptions.length,
    providerCatalog.modelPresets,
    providerCatalog.ollamaModels,
    providerCatalog.paidModels,
  ]);

  const saveDisabled =
    !draft ||
    settingsQuery.isLoading ||
    updateSetting.isPending ||
    (draft.ai.operationMode !== 'rules_only' && !draft.ai.modelId.trim());

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    const nextSettings: PromptExploderSettings = {
      ...parsedSettings,
      runtime: {
        ...draft.runtime,
        benchmarkLowConfidenceThreshold: clampNumber(
          draft.runtime.benchmarkLowConfidenceThreshold,
          0.3,
          0.9
        ),
        benchmarkSuggestionLimit: toIntInRange(
          draft.runtime.benchmarkSuggestionLimit,
          1,
          20
        ),
      },
      learning: {
        ...draft.learning,
        similarityThreshold: clampNumber(
          draft.learning.similarityThreshold,
          0.3,
          0.95
        ),
        templateMergeThreshold: clampNumber(
          draft.learning.templateMergeThreshold,
          0.3,
          0.95
        ),
        minApprovalsForMatching: toIntInRange(
          draft.learning.minApprovalsForMatching,
          1,
          20
        ),
        maxTemplates: toIntInRange(draft.learning.maxTemplates, 50, 5000),
      },
      ai: {
        ...draft.ai,
        modelId: draft.ai.modelId.trim(),
        fallbackModelId: draft.ai.fallbackModelId.trim(),
        temperature: clampNumber(draft.ai.temperature, 0, 2),
        maxTokens: toIntInRange(draft.ai.maxTokens, 1, 8192),
      },
    };

    if (
      nextSettings.ai.operationMode !== 'rules_only' &&
      !nextSettings.ai.modelId.trim()
    ) {
      toast('Choose an AI model when operation mode uses AI.', {
        variant: 'error',
      });
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setDraft(toSettingsDraft(nextSettings));
      toast('Prompt Exploder settings saved.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save Prompt Exploder settings.',
        { variant: 'error' }
      );
    }
  };

  if (!draft) {
    return (
      <div className='container mx-auto py-6'>
        <SectionHeader
          eyebrow='AI · Prompt Exploder'
          title='Prompt Exploder Settings'
          description='Loading settings...'
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto space-y-4 py-6'>
      <SectionHeader
        eyebrow='AI · Prompt Exploder'
        title='Prompt Exploder Settings'
        description='Configure runtime, learning, and AI execution defaults for Prompt Exploder operations.'
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='xs'
              onClick={() => {
                void settingsQuery.refetch();
                void chatbotModelsQuery.refetch();
              }}
              disabled={settingsQuery.isLoading}
            >
              <RefreshCcw className='mr-2 size-4' />
              Refresh
            </Button>
            <Button type='button' variant='outline' size='xs' asChild>
              <Link href='/admin/prompt-exploder'>
                <ArrowLeft className='mr-2 size-4' />
                Back to Prompt Exploder
              </Link>
            </Button>
          </div>
        }
      />

      <FormSection
        title='AI Operations'
        description='Choose the AI model and provider used for AI-assisted Prompt Exploder operations.'
        variant='subtle'
        className='p-4'
        actions={
          <div className='flex items-center gap-2 text-xs text-gray-400'>
            <Settings2 className='size-3.5' />
            <span>{modelDiscoverySummary}</span>
          </div>
        }
      >
        <div className='grid gap-3 md:grid-cols-3'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Operation Mode</Label>
            <SelectSimple
              value={draft.ai.operationMode}
              onValueChange={(value: string) => {
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      ai: {
                        ...previous.ai,
                        operationMode: value as PromptExploderOperationMode,
                      },
                    }
                    : previous
                );
              }}
              options={OPERATION_MODE_OPTIONS}
              size='sm'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Provider</Label>
            <SelectSimple
              value={draft.ai.provider}
              onValueChange={(value: string) => {
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      ai: {
                        ...previous.ai,
                        provider: value as PromptExploderAiProvider,
                      },
                    }
                    : previous
                );
              }}
              options={AI_PROVIDER_OPTIONS}
              size='sm'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Primary AI Model</Label>
            <SelectSimple
              value={draft.ai.modelId}
              onValueChange={(value: string) => {
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      ai: {
                        ...previous.ai,
                        modelId: value,
                      },
                    }
                    : previous
                );
              }}
              options={modelOptions}
              placeholder='Choose model'
              size='sm'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Custom Primary Model</Label>
            <Input
              size='sm'
              value={draft.ai.modelId}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      ai: {
                        ...previous.ai,
                        modelId: value,
                      },
                    }
                    : previous
                );
              }}
              placeholder='Type model id (for example llama3.2:latest)'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Fallback Model</Label>
            <SelectSimple
              value={draft.ai.fallbackModelId}
              onValueChange={(value: string) => {
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      ai: {
                        ...previous.ai,
                        fallbackModelId: value,
                      },
                    }
                    : previous
                );
              }}
              options={modelOptions}
              placeholder='Optional fallback'
              size='sm'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Custom Fallback Model</Label>
            <Input
              size='sm'
              value={draft.ai.fallbackModelId}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      ai: {
                        ...previous.ai,
                        fallbackModelId: value,
                      },
                    }
                    : previous
                );
              }}
              placeholder='Type fallback model id'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Temperature</Label>
            <Input
              size='sm'
              type='number'
              min={0}
              max={2}
              step={0.1}
              value={String(draft.ai.temperature)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      ai: {
                        ...previous.ai,
                        temperature: clampNumber(value, 0, 2),
                      },
                    }
                    : previous
                );
              }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Max Tokens</Label>
            <Input
              size='sm'
              type='number'
              min={1}
              max={8192}
              step={1}
              value={String(draft.ai.maxTokens)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      ai: {
                        ...previous.ai,
                        maxTokens: toIntInRange(value, 1, 8192),
                      },
                    }
                    : previous
                );
              }}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title='Runtime'
        description='Rule-profile and benchmark defaults for Prompt Exploder.'
        variant='subtle'
        className='p-4'
      >
        <div className='grid gap-3 md:grid-cols-4'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Runtime Rule Profile</Label>
            <SelectSimple
              value={draft.runtime.ruleProfile}
              onValueChange={(value: string) => {
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      runtime: {
                        ...previous.runtime,
                        ruleProfile: value as PromptExploderSettings['runtime']['ruleProfile'],
                      },
                    }
                    : previous
                );
              }}
              options={[
                { value: 'all', label: 'All Rules' },
                { value: 'pattern_pack', label: 'Pattern Pack Only' },
                { value: 'learned_only', label: 'Learned Only' },
              ]}
              size='sm'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Benchmark Suite</Label>
            <SelectSimple
              value={draft.runtime.benchmarkSuite}
              onValueChange={(value: string) => {
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      runtime: {
                        ...previous.runtime,
                        benchmarkSuite:
                            value as PromptExploderSettings['runtime']['benchmarkSuite'],
                      },
                    }
                    : previous
                );
              }}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'extended', label: 'Extended' },
                { value: 'custom', label: 'Custom' },
              ]}
              size='sm'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>
              Benchmark Low Confidence Threshold
            </Label>
            <Input
              size='sm'
              type='number'
              min={0.3}
              max={0.9}
              step={0.01}
              value={String(draft.runtime.benchmarkLowConfidenceThreshold)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      runtime: {
                        ...previous.runtime,
                        benchmarkLowConfidenceThreshold: clampNumber(
                          value,
                          0.3,
                          0.9
                        ),
                      },
                    }
                    : previous
                );
              }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>
              Benchmark Suggestion Limit
            </Label>
            <Input
              size='sm'
              type='number'
              min={1}
              max={20}
              step={1}
              value={String(draft.runtime.benchmarkSuggestionLimit)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      runtime: {
                        ...previous.runtime,
                        benchmarkSuggestionLimit: toIntInRange(value, 1, 20),
                      },
                    }
                    : previous
                );
              }}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title='Learning'
        description='Controls template matching, approvals, and auto-learning behavior.'
        variant='subtle'
        className='p-4'
      >
        <div className='grid gap-3 md:grid-cols-4'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Learning Enabled</Label>
            <div className='flex h-10 items-center rounded border border-border/60 bg-card/30 px-3'>
              <StatusToggle
                enabled={draft.learning.enabled}
                onToggle={() => {
                  setDraft((previous) =>
                    previous
                      ? {
                        ...previous,
                        learning: {
                          ...previous.learning,
                          enabled: !previous.learning.enabled,
                        },
                      }
                      : previous
                  );
                }}
              />
            </div>
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Similarity Threshold</Label>
            <Input
              size='sm'
              type='number'
              min={0.3}
              max={0.95}
              step={0.01}
              value={String(draft.learning.similarityThreshold)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      learning: {
                        ...previous.learning,
                        similarityThreshold: clampNumber(value, 0.3, 0.95),
                      },
                    }
                    : previous
                );
              }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Template Merge Threshold</Label>
            <Input
              size='sm'
              type='number'
              min={0.3}
              max={0.95}
              step={0.01}
              value={String(draft.learning.templateMergeThreshold)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      learning: {
                        ...previous.learning,
                        templateMergeThreshold: clampNumber(value, 0.3, 0.95),
                      },
                    }
                    : previous
                );
              }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Min Approvals For Match</Label>
            <Input
              size='sm'
              type='number'
              min={1}
              max={20}
              step={1}
              value={String(draft.learning.minApprovalsForMatching)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      learning: {
                        ...previous.learning,
                        minApprovalsForMatching: toIntInRange(value, 1, 20),
                      },
                    }
                    : previous
                );
              }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Runtime Template Cap</Label>
            <Input
              size='sm'
              type='number'
              min={50}
              max={5000}
              step={10}
              value={String(draft.learning.maxTemplates)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setDraft((previous) =>
                  previous
                    ? {
                      ...previous,
                      learning: {
                        ...previous.learning,
                        maxTemplates: toIntInRange(value, 50, 5000),
                      },
                    }
                    : previous
                );
              }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Auto Activate Learned</Label>
            <div className='flex h-10 items-center rounded border border-border/60 bg-card/30 px-3'>
              <StatusToggle
                enabled={draft.learning.autoActivateLearnedTemplates}
                onToggle={() => {
                  setDraft((previous) =>
                    previous
                      ? {
                        ...previous,
                        learning: {
                          ...previous.learning,
                          autoActivateLearnedTemplates:
                              !previous.learning.autoActivateLearnedTemplates,
                        },
                      }
                      : previous
                  );
                }}
              />
            </div>
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>
              Benchmark Template Upsert
            </Label>
            <div className='flex h-10 items-center rounded border border-border/60 bg-card/30 px-3'>
              <StatusToggle
                enabled={draft.learning.benchmarkSuggestionUpsertTemplates}
                onToggle={() => {
                  setDraft((previous) =>
                    previous
                      ? {
                        ...previous,
                        learning: {
                          ...previous.learning,
                          benchmarkSuggestionUpsertTemplates:
                              !previous.learning.benchmarkSuggestionUpsertTemplates,
                        },
                      }
                      : previous
                  );
                }}
              />
            </div>
          </div>
        </div>
      </FormSection>

      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          size='sm'
          onClick={() => {
            void handleSave();
          }}
          disabled={saveDisabled}
        >
          Save Prompt Exploder Settings
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            setDraft(toSettingsDraft(parsedSettings));
          }}
          disabled={updateSetting.isPending}
        >
          Reset Unsaved Changes
        </Button>
        <span className='text-xs text-gray-500'>
          {chatbotModelsQuery.isLoading
            ? 'Loading model discovery...'
            : chatbotModelsQuery.error
              ? 'Live model discovery unavailable. AI Brain catalog models are still available.'
              : 'Live model discovery connected.'}
        </span>
      </div>
    </div>
  );
}
