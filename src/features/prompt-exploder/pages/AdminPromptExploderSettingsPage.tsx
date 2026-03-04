'use client';

import { ArrowLeft, RefreshCcw, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
} from '@/shared/contracts/validator';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  FormField,
  FormActions,
  FormSection,
  Alert,
  Input,
  SectionHeader,
  Button,
  SelectSimple,
  useToast,
} from '@/shared/ui';
import {
  SettingsFieldsRenderer,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';
import { serializeSetting } from '@/shared/utils/settings-json';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { DocsTooltipEnhancer } from '../components/DocsTooltipEnhancer';
import { PromptExploderDocsTooltipSwitch } from '../components/PromptExploderDocsTooltipSwitch';
import { usePromptExploderDocsTooltips } from '../hooks/usePromptExploderDocsTooltips';
import {
  defaultPromptExploderSettings,
  parsePromptExploderSettingsResult,
} from '../settings';
import { PROMPT_EXPLODER_SETTINGS_KEY } from '@/shared/contracts/prompt-exploder';
import {
  buildPromptExploderValidationRuleStackOptions,
  normalizePromptExploderValidationRuleStack,
} from '../validation-stack';

import type { 
  PromptExploderOperationMode, 
  PromptExploderSettings,
  PromptExploderValidationRuleStack
} from '@/shared/contracts/prompt-exploder';

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

type SettingsDraft = Pick<PromptExploderSettings, 'runtime' | 'learning' | 'ai'>;

const toSettingsDraft = (settings: PromptExploderSettings): SettingsDraft => ({
  runtime: settings.runtime,
  learning: settings.learning,
  ai: settings.ai,
});

export function AdminPromptExploderSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const { docsTooltipsEnabled, setDocsTooltipsEnabled } = usePromptExploderDocsTooltips();
  const settingsQuery = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();
  const brainModelOptions = useBrainModelOptions({
    capability: 'prompt_engine.prompt_exploder',
    enabled: settingsQuery.isSuccess,
  });

  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);
  const lastSettingsErrorSignatureRef = useRef<string | null>(null);

  const rawSettings = settingsQuery.data?.get(PROMPT_EXPLODER_SETTINGS_KEY) ?? null;
  const hasPersistedSettingsPayload = Boolean(rawSettings?.trim());
  const rawValidatorPatternLists = settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const parsedSettingsResult = useMemo(
    () => parsePromptExploderSettingsResult(rawSettings),
    [rawSettings]
  );
  const settingsValidationError = hasPersistedSettingsPayload ? parsedSettingsResult.error : null;
  const parsedSettings = parsedSettingsResult.settings;
  const validatorPatternLists = useMemo(
    () => parseValidatorPatternLists(rawValidatorPatternLists),
    [rawValidatorPatternLists]
  );
  const validationPatternStackOptions = useMemo(
    () => buildPromptExploderValidationRuleStackOptions(validatorPatternLists),
    [validatorPatternLists]
  );
  useEffect(() => {
    const raw = rawSettings ?? '';
    if (draft && loadedFrom === raw) return;
    setDraft({
      ...toSettingsDraft(parsedSettings),
      runtime: {
        ...parsedSettings.runtime,
        validationRuleStack: normalizePromptExploderValidationRuleStack(
          parsedSettings.runtime.validationRuleStack as PromptExploderValidationRuleStack | null | undefined,
          validatorPatternLists
        ),
      },
    });
    setLoadedFrom(raw);
  }, [draft, loadedFrom, parsedSettings, rawSettings, validatorPatternLists]);

  useEffect(() => {
    const error = parsedSettingsResult.error;
    const raw = rawSettings?.trim() ?? '';
    if (!error || !raw) return;
    const signature = `${raw}::error::${error}`;
    if (lastSettingsErrorSignatureRef.current === signature) return;
    lastSettingsErrorSignatureRef.current = signature;
    logClientError(new Error(error), {
      context: {
        source: 'AdminPromptExploderSettingsPage',
        action: 'parsePromptExploderSettings',
        settingKey: PROMPT_EXPLODER_SETTINGS_KEY,
      },
    });
    toast(error, { variant: 'error' });
  }, [parsedSettingsResult.error, rawSettings, toast]);

  useEffect(() => {
    setDraft((previous) => {
      if (!previous) return previous;
      const normalizedStack = normalizePromptExploderValidationRuleStack(
        previous.runtime.validationRuleStack as PromptExploderValidationRuleStack | null | undefined,
        validatorPatternLists
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

  const modelDiscoverySummary = useMemo(() => {
    const discovered = brainModelOptions.models.length;
    return `AI Brain discovery returned ${discovered} compatible model option(s) for Prompt Exploder.`;
  }, [brainModelOptions.models.length]);

  const brainAssignment = brainModelOptions.assignment;
  const brainEffectiveModelId = brainModelOptions.effectiveModelId.trim();
  const hasConfiguredBrainModel =
    brainAssignment.enabled && brainAssignment.provider === 'model' && brainEffectiveModelId !== '';
  const brainAssignmentStatus = hasConfiguredBrainModel
    ? brainEffectiveModelId
    : 'Not configured in AI Brain';

  const runtimeFields: SettingsField<PromptExploderSettings['runtime']>[] = useMemo(
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
        options: validationPatternStackOptions.map((opt) => ({
          label: opt.label,
          value: typeof opt.value === 'string' ? opt.value : opt.value.id || '',
        })),
      },
      {
        key: 'allowValidationStackFallback',
        label: 'Allow Validation Stack Fallback',
        type: 'switch',
      },
      {
        key: 'caseResolverCaptureMode',
        label: 'Case Resolver Capture Mode',
        type: 'select',
        options: [
          { value: 'rules_only', label: 'Rules Only (UI capture rules)' },
          { value: 'rules_with_heuristics', label: 'Rules + Heuristics' },
        ],
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
    [validationPatternStackOptions]
  );

  const learningFields: SettingsField<PromptExploderSettings['learning']>[] = useMemo(
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
    []
  );

  const saveDisabled = !draft || settingsQuery.isLoading || updateSetting.isPending;

  const handleResetInvalidSettings = async (): Promise<void> => {
    if (!settingsValidationError) return;
    try {
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(defaultPromptExploderSettings),
      });
      toast('Prompt Exploder settings were reset to defaults.', { variant: 'success' });
      await settingsQuery.refetch();
      brainModelOptions.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to reset Prompt Exploder settings.', {
        variant: 'error',
      });
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    if (draft.ai.operationMode !== 'rules_only' && !hasConfiguredBrainModel) {
      toast('Configure Prompt Exploder AI in AI Brain first.', {
        variant: 'error',
      });
      return;
    }

    const nextSettings: PromptExploderSettings = {
      ...parsedSettings,
      runtime: {
        ...draft.runtime,
        validationRuleStack: normalizePromptExploderValidationRuleStack(
          draft.runtime.validationRuleStack as PromptExploderValidationRuleStack | null | undefined,
          validatorPatternLists
        ),
        benchmarkLowConfidenceThreshold: clampNumber(
          draft.runtime.benchmarkLowConfidenceThreshold ?? 0.55,
          0.3,
          0.9
        ),
        benchmarkSuggestionLimit: toIntInRange(draft.runtime.benchmarkSuggestionLimit ?? 4, 1, 20),
      },
      learning: {
        ...draft.learning,
        similarityThreshold: clampNumber(draft.learning.similarityThreshold ?? 0.68, 0.3, 0.95),
        templateMergeThreshold: clampNumber(
          draft.learning.templateMergeThreshold ?? 0.63,
          0.3,
          0.95
        ),
        minApprovalsForMatching: toIntInRange(draft.learning.minApprovalsForMatching, 1, 20),
        maxTemplates: toIntInRange(draft.learning.maxTemplates, 50, 5000),
      },
      ai: {
        ...draft.ai,
      },
    };

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
      toast(error instanceof Error ? error.message : 'Failed to save Prompt Exploder settings.', {
        variant: 'error',
      });
    }
  };

  if (settingsValidationError) {
    return (
      <div id='prompt-exploder-settings-docs-root' className='container mx-auto space-y-4 py-6'>
        <SectionHeader
          eyebrow='AI · Prompt Exploder'
          title='Prompt Exploder Settings'
          description='Persisted settings are invalid and cannot be loaded.'
        />
        <Alert variant='error'>{(settingsValidationError as any).message}</Alert>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void handleResetInvalidSettings();
            }}
            disabled={updateSetting.isPending}
          >
            {updateSetting.isPending ? 'Resetting...' : 'Reset Settings to Defaults'}
          </Button>
          <Button
            type='button'
            variant='ghost'
            onClick={() => {
              void settingsQuery.refetch();
              brainModelOptions.refresh();
            }}
            disabled={settingsQuery.isFetching}
          >
            {settingsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        <DocsTooltipEnhancer
          rootId='prompt-exploder-settings-docs-root'
          enabled={docsTooltipsEnabled}
        />
      </div>
    );
  }

  if (!draft) {
    return (
      <div id='prompt-exploder-settings-docs-root' className='container mx-auto py-6'>
        <SectionHeader
          eyebrow='AI · Prompt Exploder'
          title='Prompt Exploder Settings'
          description='Loading settings...'
        />
        <DocsTooltipEnhancer
          rootId='prompt-exploder-settings-docs-root'
          enabled={docsTooltipsEnabled}
        />
      </div>
    );
  }

  return (
    <div id='prompt-exploder-settings-docs-root' className='container mx-auto space-y-4 py-6'>
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
                brainModelOptions.refresh();
              }}
              disabled={settingsQuery.isLoading}
              data-doc-id='settings_refresh'
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
            <PromptExploderDocsTooltipSwitch
              docsTooltipsEnabled={docsTooltipsEnabled}
              onDocsTooltipsChange={setDocsTooltipsEnabled}
            />
          </div>
        }
      />

      <div className='grid gap-6'>
        <FormSection
          title='AI Operations'
          description='AI Brain owns Prompt Exploder routing. Only the local operation mode remains configurable here.'
          variant='subtle'
          className='p-4'
          actions={
            <div className='flex items-center gap-2 text-xs text-gray-400'>
              <Settings2 className='size-3.5' />
              <span>{modelDiscoverySummary}</span>
            </div>
          }
        >
          <div className='grid gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3'>
            <FormField
              label='Operation Mode'
              description='Runtime behavior remains local. AI routing below is Brain-managed.'
            >
              <SelectSimple
                value={draft.ai.operationMode}
                onValueChange={(value: string): void => {
                  setDraft((prev) =>
                    prev
                      ? {
                        ...prev,
                        ai: {
                          ...prev.ai,
                          operationMode: value as PromptExploderOperationMode,
                        },
                      }
                      : null
                  );
                }}
                options={OPERATION_MODE_OPTIONS}
                size='sm'
              />
            </FormField>
            <FormField
              label='Brain Assignment'
              description='Read-only effective model assignment from AI Brain.'
            >
              <Input
                value={brainAssignmentStatus}
                readOnly
                disabled
                className='cursor-not-allowed'
                placeholder='Not configured in AI Brain'
              />
            </FormField>
          </div>
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
              setDraft((prev) => (prev ? { ...prev, runtime: { ...prev.runtime, ...vals } } : null))
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
                prev ? { ...prev, learning: { ...prev.learning, ...vals } } : null
              )
            }
            className='grid gap-x-6 gap-y-2 md:grid-cols-2 lg:grid-cols-4'
          />
        </FormSection>
      </div>

      <FormActions
        onSave={() => void handleSave()}
        onCancel={() => setDraft(toSettingsDraft(parsedSettings))}
        saveText='Save Prompt Exploder Settings'
        cancelText='Reset Unsaved Changes'
        isSaving={updateSetting.isPending}
        isDisabled={saveDisabled}
        className='pt-4 border-t border-white/5 !justify-start'
      >
        <span className='text-xs text-gray-500'>
          {brainModelOptions.isLoading
            ? 'Loading Brain model discovery...'
            : brainModelOptions.sourceWarnings.length > 0
              ? brainModelOptions.sourceWarnings[0]
              : 'AI Brain routing connected. Prompt Exploder uses the dedicated Brain capability.'}
        </span>
      </FormActions>
      <DocsTooltipEnhancer
        rootId='prompt-exploder-settings-docs-root'
        enabled={docsTooltipsEnabled}
      />
    </div>
  );
}
