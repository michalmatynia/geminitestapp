'use client';

import { ArrowLeft, RefreshCcw, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
} from '@/features/admin/pages/validator-scope';
import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  parseBrainProviderCatalog,
} from '@/features/ai/brain/settings';
import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { FormSection, SectionHeader, Button, useToast } from '@/shared/ui';
import {
  SettingsFieldsRenderer,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  parsePromptExploderSettings,
  PROMPT_EXPLODER_SETTINGS_KEY,
} from '../settings';
import {
  buildPromptExploderValidationRuleStackOptions,
  normalizePromptExploderValidationRuleStack,
} from '../validation-stack';

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

type SettingsDraft = Pick<
  PromptExploderSettings,
  'runtime' | 'learning' | 'ai'
>;

const toSettingsDraft = (settings: PromptExploderSettings): SettingsDraft => ({
  runtime: settings.runtime,
  learning: settings.learning,
  ai: settings.ai,
});

const normalizeModelValues = (values: unknown): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  const visited = new WeakSet<object>();

  const append = (value: unknown): void => {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      output.push(normalized);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry: unknown) => {
        append(entry);
      });
      return;
    }

    if (!value || typeof value !== 'object') return;
    if (visited.has(value)) return;
    visited.add(value);

    if (value instanceof Map) {
      value.forEach((entry: unknown): void => {
        append(entry);
      });
      return;
    }

    if (value instanceof Set) {
      value.forEach((entry: unknown): void => {
        append(entry);
      });
      return;
    }

    const record = value as Record<string, unknown>;
    const keyOrder = [
      'models',
      'data',
      'id',
      'model',
      'name',
      'value',
    ] as const;
    let matchedKnownKey = false;
    keyOrder.forEach((key: (typeof keyOrder)[number]): void => {
      if (!(key in record)) return;
      matchedKnownKey = true;
      append(record[key]);
    });
    if (matchedKnownKey) return;

    Object.values(record).forEach((entry: unknown): void => {
      append(entry);
    });
  };

  try {
    append(values);
  } catch {
    if (typeof values === 'string') {
      append(values);
    }
  }

  return output;
};

export function AdminPromptExploderSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();
  const chatbotModelsQuery = useChatbotModels({
    enabled: settingsQuery.isSuccess,
  });

  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);

  const rawSettings =
    settingsQuery.data?.get(PROMPT_EXPLODER_SETTINGS_KEY) ?? null;
  const rawValidatorPatternLists =
    settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const parsedSettings = useMemo(
    () => parsePromptExploderSettings(rawSettings),
    [rawSettings],
  );
  const validatorPatternLists = useMemo(
    () => parseValidatorPatternLists(rawValidatorPatternLists),
    [rawValidatorPatternLists],
  );
  const validationPatternStackOptions = useMemo(
    () => buildPromptExploderValidationRuleStackOptions(validatorPatternLists),
    [validatorPatternLists],
  );
  const providerCatalog = useMemo(
    () =>
      parseBrainProviderCatalog(
        settingsQuery.data?.get(AI_BRAIN_PROVIDER_CATALOG_KEY) ?? null,
      ),
    [settingsQuery.data],
  );

  useEffect(() => {
    const raw = rawSettings ?? '';
    if (draft && loadedFrom === raw) return;
    setDraft({
      ...toSettingsDraft(parsedSettings),
      runtime: {
        ...parsedSettings.runtime,
        validationRuleStack: normalizePromptExploderValidationRuleStack(
          parsedSettings.runtime.validationRuleStack,
          validatorPatternLists,
        ),
      },
    });
    setLoadedFrom(raw);
  }, [draft, loadedFrom, parsedSettings, rawSettings, validatorPatternLists]);

  useEffect(() => {
    setDraft((previous) => {
      if (!previous) return previous;
      const normalizedStack = normalizePromptExploderValidationRuleStack(
        previous.runtime.validationRuleStack,
        validatorPatternLists,
      );
      if (normalizedStack === previous.runtime.validationRuleStack) {
        return previous;
      }
      return {
        ...previous,
        runtime: {
          ...previous.runtime,
          validationRuleStack: normalizedStack,
        },
      };
    });
  }, [validatorPatternLists]);

  const modelOptions = useMemo(() => {
    const options: Array<{
      value: string;
      label: string;
      description: string;
    }> = [];
    const seen = new Set<string>();

    const append = (values: unknown, source: string): void => {
      const normalizedValues = normalizeModelValues(values);
      for (const value of normalizedValues) {
        const model = value.trim();
        if (!model || seen.has(model)) continue;
        seen.add(model);
        options.push({
          value: model,
          label: model,
          description: source,
        });
      }
    };

    append(providerCatalog.modelPresets, 'AI Brain preset');
    append(providerCatalog.paidModels, 'AI Brain paid model');
    append(providerCatalog.ollamaModels, 'AI Brain ollama');
    append(chatbotModelsQuery.data ?? [], 'live discovery');

    const openAiModel = settingsQuery.data?.get('openai_model') ?? '';
    if (openAiModel.trim()) append(openAiModel, 'system openai_model');

    const modelId = draft?.ai.modelId ?? '';
    const fallbackModelId = draft?.ai.fallbackModelId ?? '';
    append(modelId, 'current model');
    append(fallbackModelId, 'fallback model');

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
    const discovered = normalizeModelValues(chatbotModelsQuery.data).length;
    const catalog = new Set([
      ...normalizeModelValues(providerCatalog.modelPresets),
      ...normalizeModelValues(providerCatalog.paidModels),
      ...normalizeModelValues(providerCatalog.ollamaModels),
    ]).size;
    return `Catalog ${catalog} + live ${discovered} = ${modelOptions.length} unique model option(s)`;
  }, [
    chatbotModelsQuery.data,
    modelOptions.length,
    providerCatalog.modelPresets,
    providerCatalog.ollamaModels,
    providerCatalog.paidModels,
  ]);

  const aiFields: SettingsField<PromptExploderSettings['ai']>[] = useMemo(
    () => [
      {
        key: 'operationMode',
        label: 'Operation Mode',
        type: 'select',
        options: OPERATION_MODE_OPTIONS,
      },
      {
        key: 'provider',
        label: 'Provider',
        type: 'select',
        options: AI_PROVIDER_OPTIONS,
      },
      {
        key: 'modelId',
        label: 'Primary AI Model',
        type: 'select',
        options: modelOptions,
        placeholder: 'Choose model',
      },
      {
        key: 'modelId',
        label: 'Custom Primary Model',
        type: 'text',
        placeholder: 'Type model id (e.g. llama3.2)',
      },
      {
        key: 'fallbackModelId',
        label: 'Fallback Model',
        type: 'select',
        options: modelOptions,
        placeholder: 'Optional fallback',
      },
      {
        key: 'fallbackModelId',
        label: 'Custom Fallback Model',
        type: 'text',
        placeholder: 'Type fallback model id',
      },
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'number',
        min: 0,
        max: 2,
        step: 0.1,
      },
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        min: 1,
        max: 8192,
      },
    ],
    [modelOptions],
  );

  const runtimeFields: SettingsField<PromptExploderSettings['runtime']>[] =
    useMemo(
      () => [
        {
          key: 'orchestratorEnabled',
          label: 'Orchestrator Runtime',
          type: 'switch',
        },
        {
          key: 'validationRuleStack',
          label: 'Validation Stack',
          type: 'select',
          options: validationPatternStackOptions,
        },
        {
          key: 'ruleProfile',
          label: 'Runtime Rule Profile',
          type: 'select',
          options: [
            { value: 'all', label: 'All Rules' },
            { value: 'pattern_pack', label: 'Pattern Pack Only' },
            { value: 'learned_only', label: 'Learned Only' },
          ],
        },
        {
          key: 'benchmarkSuite',
          label: 'Benchmark Suite',
          type: 'select',
          options: [
            { value: 'default', label: 'Default' },
            { value: 'extended', label: 'Extended' },
            { value: 'custom', label: 'Custom' },
          ],
        },
        {
          key: 'benchmarkLowConfidenceThreshold',
          label: 'Low Confidence Threshold',
          type: 'number',
          min: 0.3,
          max: 0.9,
          step: 0.01,
        },
        {
          key: 'benchmarkSuggestionLimit',
          label: 'Suggestion Limit',
          type: 'number',
          min: 1,
          max: 20,
        },
      ],
      [validationPatternStackOptions],
    );

  const learningFields: SettingsField<PromptExploderSettings['learning']>[] =
    useMemo(
      () => [
        {
          key: 'enabled',
          label: 'Learning Enabled',
          type: 'switch',
        },
        {
          key: 'similarityThreshold',
          label: 'Similarity Threshold',
          type: 'number',
          min: 0.3,
          max: 0.95,
          step: 0.01,
        },
        {
          key: 'templateMergeThreshold',
          label: 'Merge Threshold',
          type: 'number',
          min: 0.3,
          max: 0.95,
          step: 0.01,
        },
        {
          key: 'minApprovalsForMatching',
          label: 'Min Approvals',
          type: 'number',
          min: 1,
          max: 20,
        },
        {
          key: 'maxTemplates',
          label: 'Template Cap',
          type: 'number',
          min: 50,
          max: 5000,
        },
        {
          key: 'autoActivateLearnedTemplates',
          label: 'Auto Activate Learned',
          type: 'switch',
        },
        {
          key: 'benchmarkSuggestionUpsertTemplates',
          label: 'Benchmark Template Upsert',
          type: 'switch',
        },
      ],
      [],
    );

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
        validationRuleStack: normalizePromptExploderValidationRuleStack(
          draft.runtime.validationRuleStack,
          validatorPatternLists,
        ),
        benchmarkLowConfidenceThreshold: clampNumber(
          draft.runtime.benchmarkLowConfidenceThreshold,
          0.3,
          0.9,
        ),
        benchmarkSuggestionLimit: toIntInRange(
          draft.runtime.benchmarkSuggestionLimit,
          1,
          20,
        ),
      },
      learning: {
        ...draft.learning,
        similarityThreshold: clampNumber(
          draft.learning.similarityThreshold,
          0.3,
          0.95,
        ),
        templateMergeThreshold: clampNumber(
          draft.learning.templateMergeThreshold,
          0.3,
          0.95,
        ),
        minApprovalsForMatching: toIntInRange(
          draft.learning.minApprovalsForMatching,
          1,
          20,
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
      const serialized = serializeSetting(nextSettings);
      if (rawSettings === serialized) {
        toast('No settings changes to save.', { variant: 'info' });
        return;
      }
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serialized,
      });
      setDraft(toSettingsDraft(nextSettings));
      toast('Prompt Exploder settings saved.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save Prompt Exploder settings.',
        { variant: 'error' },
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

      <div className='grid gap-6'>
        <FormSection
          title='AI Operations'
          description='Choose the AI model and provider used for AI-assisted operations.'
          variant='subtle'
          className='p-4'
          actions={
            <div className='flex items-center gap-2 text-xs text-gray-400'>
              <Settings2 className='size-3.5' />
              <span>{modelDiscoverySummary}</span>
            </div>
          }
        >
          <SettingsFieldsRenderer
            fields={aiFields}
            values={draft.ai}
            onChange={(vals) =>
              setDraft((prev) =>
                prev ? { ...prev, ai: { ...prev.ai, ...vals } } : null,
              )
            }
            className='grid gap-x-6 gap-y-2 md:grid-cols-3 lg:grid-cols-4'
          />
        </FormSection>

        <FormSection
          title='Runtime Defaults'
          description='Rule-profile and benchmark defaults.'
          variant='subtle'
          className='p-4'
        >
          <SettingsFieldsRenderer
            fields={runtimeFields}
            values={draft.runtime}
            onChange={(vals) =>
              setDraft((prev) =>
                prev
                  ? { ...prev, runtime: { ...prev.runtime, ...vals } }
                  : null,
              )
            }
            className='grid gap-x-6 gap-y-2 md:grid-cols-2 lg:grid-cols-3'
          />
        </FormSection>

        <FormSection
          title='Learning behavior'
          description='Controls template matching and auto-learning.'
          variant='subtle'
          className='p-4'
        >
          <SettingsFieldsRenderer
            fields={learningFields}
            values={draft.learning}
            onChange={(vals) =>
              setDraft((prev) =>
                prev
                  ? { ...prev, learning: { ...prev.learning, ...vals } }
                  : null,
              )
            }
            className='grid gap-x-6 gap-y-2 md:grid-cols-2 lg:grid-cols-4'
          />
        </FormSection>
      </div>

      <div className='flex flex-wrap items-center gap-2 pt-4 border-t border-white/5'>
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
              ? 'Live model discovery unavailable.'
              : 'Live model discovery connected.'}
        </span>
      </div>
    </div>
  );
}
