'use client';

import React from 'react';
import { z } from 'zod';

import {
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_LABELS,
  parseValidatorPatternLists,
  type ValidatorPatternList,
} from '@/features/admin/pages/validator-scope';
import {
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
} from '@/features/prompt-engine/settings';
import type {
  PromptValidationRuleDto as PromptValidationRule,
  PromptValidationScopeDto as PromptValidationScope,
} from '@/shared/contracts/prompt-engine';
import { promptValidationRuleSchema } from '@/shared/contracts/prompt-engine';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import {
  Badge,
  Button,
  Input,
  Label,
  SelectSimple,
  Textarea,
  ToggleRow,
} from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

type ValidationPatternConfigDraft = {
  source: 'global_stack' | 'path_local';
  stackId: string;
  scope: PromptValidationScope;
  includeLearnedRules: boolean;
  runtimeMode: 'validate_only' | 'validate_and_autofix';
  failPolicy: 'block_on_error' | 'report_only';
  inputPort: 'auto' | 'value' | 'prompt' | 'result' | 'context';
  outputPort: 'value' | 'result';
  maxAutofixPasses: number;
  includeRuleIds: string[];
  localListName: string;
  localListDescription: string;
  rules: PromptValidationRule[];
  learnedRules: PromptValidationRule[];
};

const SOURCE_OPTIONS = [
  { value: 'global_stack', label: 'Global Validation Stack' },
  { value: 'path_local', label: 'Path-Local Validation List' },
];

const RUNTIME_MODE_OPTIONS = [
  { value: 'validate_only', label: 'Validate Only' },
  { value: 'validate_and_autofix', label: 'Validate + Autofix' },
];

const FAIL_POLICY_OPTIONS = [
  { value: 'block_on_error', label: 'Block On Errors' },
  { value: 'report_only', label: 'Report Only' },
];

const INPUT_PORT_OPTIONS = [
  { value: 'auto', label: 'Auto (value/prompt/result/context)' },
  { value: 'value', label: 'value' },
  { value: 'prompt', label: 'prompt' },
  { value: 'result', label: 'result' },
  { value: 'context', label: 'context' },
];

const OUTPUT_PORT_OPTIONS = [
  { value: 'value', label: 'value' },
  { value: 'result', label: 'result' },
];

const SCOPE_OPTIONS: Array<{ value: PromptValidationScope; label: string }> = [
  { value: 'global', label: 'Global' },
  { value: 'image_studio_prompt', label: 'Image Studio Prompt' },
  { value: 'image_studio_extraction', label: 'Image Studio Extraction' },
  { value: 'image_studio_generation', label: 'Image Studio Generation' },
  { value: 'prompt_exploder', label: 'Prompt Exploder' },
  { value: 'case_resolver_prompt_exploder', label: 'Case Resolver Prompt Exploder' },
];

const DEFAULT_CONFIG: ValidationPatternConfigDraft = {
  source: 'global_stack',
  stackId: '',
  scope: 'global',
  includeLearnedRules: true,
  runtimeMode: 'validate_only',
  failPolicy: 'block_on_error',
  inputPort: 'auto',
  outputPort: 'value',
  maxAutofixPasses: 1,
  includeRuleIds: [],
  localListName: 'Path Local Validation List',
  localListDescription: '',
  rules: [],
  learnedRules: [],
};

const VALIDATOR_SCOPE_TO_PROMPT_SCOPE: Record<
  ValidatorPatternList['scope'],
  PromptValidationScope
> = {
  products: 'global',
  'image-studio': 'image_studio_prompt',
  'prompt-exploder': 'prompt_exploder',
  'case-resolver-prompt-exploder': 'case_resolver_prompt_exploder',
};

const parseRuleIdList = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((token: string): string => token.trim())
    .filter(Boolean);

const safeParseRuleArray = (
  raw: string
): { ok: true; value: PromptValidationRule[] } | { ok: false; error: string } => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: 'Expected a JSON array of validation rules.' };
    }
    const result = z.array(promptValidationRuleSchema).safeParse(parsed);
    if (!result.success) {
      return { ok: false, error: 'Rule array contains invalid rule shape.' };
    }
    return { ok: true, value: result.data };
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }
};

const ruleAppliesToScope = (
  rule: PromptValidationRule,
  scope: PromptValidationScope
): boolean => {
  const appliesToScopes = rule.appliesToScopes ?? [];
  if (appliesToScopes.length === 0) return true;
  return appliesToScopes.includes(scope) || appliesToScopes.includes('global');
};

const buildLocalRegexRule = (
  scope: PromptValidationScope,
  currentLength: number
): PromptValidationRule => ({
  kind: 'regex',
  id: `path.local.rule.${currentLength + 1}`,
  enabled: true,
  severity: 'warning',
  title: `Path Local Rule ${currentLength + 1}`,
  description: 'Path-local validation rule created from AI Paths.',
  message: 'Validation pattern rule did not match.',
  similar: [],
  pattern: '.+',
  flags: 'm',
  sequence: (currentLength + 1) * 10,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  appliesToScopes: [scope],
  launchEnabled: false,
  launchOperator: 'contains',
  launchValue: null,
  launchFlags: null,
});

export function ValidationPatternNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig, toast } = useAiPathConfig();
  const settingsQuery = useSettingsMap();

  if (selectedNode?.type !== 'validation_pattern') return null;

  const persistedConfig: Partial<ValidationPatternConfigDraft> =
    (selectedNode.config?.validationPattern as Partial<ValidationPatternConfigDraft> | undefined) ??
    {};
  const config: ValidationPatternConfigDraft = {
    source: persistedConfig.source ?? DEFAULT_CONFIG.source,
    stackId: persistedConfig.stackId ?? DEFAULT_CONFIG.stackId,
    scope: persistedConfig.scope ?? DEFAULT_CONFIG.scope,
    includeLearnedRules: persistedConfig.includeLearnedRules ?? DEFAULT_CONFIG.includeLearnedRules,
    runtimeMode: persistedConfig.runtimeMode ?? DEFAULT_CONFIG.runtimeMode,
    failPolicy: persistedConfig.failPolicy ?? DEFAULT_CONFIG.failPolicy,
    inputPort: persistedConfig.inputPort ?? DEFAULT_CONFIG.inputPort,
    outputPort: persistedConfig.outputPort ?? DEFAULT_CONFIG.outputPort,
    maxAutofixPasses:
      typeof persistedConfig.maxAutofixPasses === 'number' &&
      Number.isFinite(persistedConfig.maxAutofixPasses)
        ? Math.max(1, Math.min(10, Math.trunc(persistedConfig.maxAutofixPasses)))
        : DEFAULT_CONFIG.maxAutofixPasses,
    includeRuleIds: Array.isArray(persistedConfig.includeRuleIds)
      ? persistedConfig.includeRuleIds
      : DEFAULT_CONFIG.includeRuleIds,
    localListName: persistedConfig.localListName ?? DEFAULT_CONFIG.localListName,
    localListDescription: persistedConfig.localListDescription ?? DEFAULT_CONFIG.localListDescription,
    rules: Array.isArray(persistedConfig.rules)
      ? persistedConfig.rules
      : DEFAULT_CONFIG.rules,
    learnedRules: Array.isArray(persistedConfig.learnedRules)
      ? persistedConfig.learnedRules
      : DEFAULT_CONFIG.learnedRules,
  };

  const rawPromptEngineSettings =
    settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const promptEngineSettings = React.useMemo(
    () => parsePromptEngineSettings(rawPromptEngineSettings),
    [rawPromptEngineSettings]
  );
  const rawPatternLists =
    settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const patternLists = React.useMemo(
    () => parseValidatorPatternLists(rawPatternLists),
    [rawPatternLists]
  );
  const stackOptions = React.useMemo(
    () =>
      patternLists.map((entry: ValidatorPatternList) => ({
        value: entry.id,
        label: `${entry.name} (${VALIDATOR_SCOPE_LABELS[entry.scope]})`,
      })),
    [patternLists]
  );
  const activeStack = React.useMemo(
    () =>
      patternLists.find((entry: ValidatorPatternList): boolean => entry.id === config.stackId) ??
      null,
    [config.stackId, patternLists]
  );

  const updateConfig = React.useCallback(
    (patch: Partial<ValidationPatternConfigDraft>): void => {
      updateSelectedNodeConfig({
        validationPattern: {
          ...config,
          ...patch,
        },
      });
    },
    [config, updateSelectedNodeConfig]
  );

  const [rulesDraft, setRulesDraft] = React.useState<string>(
    JSON.stringify(config.rules ?? [], null, 2)
  );
  const [learnedRulesDraft, setLearnedRulesDraft] = React.useState<string>(
    JSON.stringify(config.learnedRules ?? [], null, 2)
  );
  const [rulesDraftError, setRulesDraftError] = React.useState<string | null>(null);
  const [learnedRulesDraftError, setLearnedRulesDraftError] =
    React.useState<string | null>(null);

  const rulesSignature = React.useMemo(
    () => JSON.stringify(config.rules ?? []),
    [config.rules]
  );
  const learnedRulesSignature = React.useMemo(
    () => JSON.stringify(config.learnedRules ?? []),
    [config.learnedRules]
  );
  React.useEffect(() => {
    setRulesDraft(JSON.stringify(config.rules ?? [], null, 2));
    setRulesDraftError(null);
  }, [selectedNode.id, rulesSignature]);
  React.useEffect(() => {
    setLearnedRulesDraft(JSON.stringify(config.learnedRules ?? [], null, 2));
    setLearnedRulesDraftError(null);
  }, [selectedNode.id, learnedRulesSignature]);

  const commitRulesDraft = React.useCallback((): void => {
    const parsed = safeParseRuleArray(rulesDraft);
    if (!parsed.ok) {
      setRulesDraftError(parsed.error);
      return;
    }
    setRulesDraftError(null);
    updateConfig({ rules: parsed.value });
  }, [rulesDraft, updateConfig]);

  const commitLearnedRulesDraft = React.useCallback((): void => {
    const parsed = safeParseRuleArray(learnedRulesDraft);
    if (!parsed.ok) {
      setLearnedRulesDraftError(parsed.error);
      return;
    }
    setLearnedRulesDraftError(null);
    updateConfig({ learnedRules: parsed.value });
  }, [learnedRulesDraft, updateConfig]);

  const syncRulesFromGlobalStack = React.useCallback((): void => {
    const inferredScope = activeStack
      ? VALIDATOR_SCOPE_TO_PROMPT_SCOPE[activeStack.scope]
      : config.scope;
    const scopedRules = (promptEngineSettings.promptValidation.rules ?? []).filter(
      (rule: PromptValidationRule): boolean =>
        ruleAppliesToScope(rule, inferredScope)
    );
    const scopedLearnedRules = (
      promptEngineSettings.promptValidation.learnedRules ?? []
    ).filter((rule: PromptValidationRule): boolean =>
      ruleAppliesToScope(rule, inferredScope)
    );
    updateConfig({
      scope: inferredScope,
      rules: scopedRules,
      learnedRules: scopedLearnedRules,
      localListName: activeStack?.name ?? config.localListName,
      localListDescription: activeStack?.description ?? config.localListDescription,
    });
    toast(
      `Loaded ${scopedRules.length} base and ${scopedLearnedRules.length} learned rules from global settings.`,
      { variant: 'success' }
    );
  }, [
    activeStack,
    config.localListDescription,
    config.localListName,
    config.scope,
    promptEngineSettings.promptValidation.learnedRules,
    promptEngineSettings.promptValidation.rules,
    toast,
    updateConfig,
  ]);

  const handleOpenValidatorPatterns = React.useCallback((): void => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (selectedNode?.id) {
      params.set('focusNodeId', selectedNode.id);
    }
    if (selectedNode?.type) {
      params.set('focusNodeType', selectedNode.type);
    }
    const normalizedStackId = config.stackId.trim();
    if (normalizedStackId) {
      params.set('stackId', normalizedStackId);
    }
    const query = params.toString();
    const destination = query
      ? `/admin/ai-paths/validation?${query}`
      : '/admin/ai-paths/validation';
    window.open(destination, '_blank', 'noopener,noreferrer');
  }, [config.stackId, selectedNode?.id, selectedNode?.type]);

  const totalRuleCount =
    (config.rules?.length ?? 0) +
    (config.includeLearnedRules ? config.learnedRules?.length ?? 0 : 0);
  const includeRuleIdsText = (config.includeRuleIds ?? []).join('\n');

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Rules: {config.rules.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Learned: {config.learnedRules.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Active: {totalRuleCount}
        </Badge>
      </div>

      <div>
        <Label className='text-xs text-gray-400'>Source</Label>
        <SelectSimple
          size='sm'
          value={config.source}
          onValueChange={(value: string): void =>
            updateConfig({
              source:
                value === 'path_local'
                  ? 'path_local'
                  : 'global_stack',
            })
          }
          options={SOURCE_OPTIONS}
          className='mt-2'
        />
      </div>

      {config.source === 'global_stack' ? (
        <div className='space-y-3 rounded-md border border-border/60 bg-card/40 p-3'>
          <div>
            <Label className='text-xs text-gray-400'>Validation Stack</Label>
            <SelectSimple
              size='sm'
              value={config.stackId}
              onValueChange={(value: string): void => {
                const list = patternLists.find(
                  (entry: ValidatorPatternList): boolean => entry.id === value
                );
                updateConfig({
                  stackId: value,
                  ...(list
                    ? { scope: VALIDATOR_SCOPE_TO_PROMPT_SCOPE[list.scope] }
                    : {}),
                });
              }}
              options={stackOptions}
              placeholder='Select global validation stack'
              className='mt-2'
            />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={syncRulesFromGlobalStack}
            >
              Sync Rules From Global Stack
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleOpenValidatorPatterns}
            >
              Open AI-Paths Node Validator
            </Button>
          </div>
          <p className='text-[11px] text-gray-500'>
            Runtime uses synced rule snapshots. Click sync after editing global validation patterns.
          </p>
        </div>
      ) : (
        <div className='space-y-3 rounded-md border border-border/60 bg-card/40 p-3'>
          <div>
            <Label className='text-xs text-gray-400'>Path-Local List Name</Label>
            <Input
              className='mt-2 h-9'
              value={config.localListName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                updateConfig({ localListName: event.target.value })
              }
            />
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Description</Label>
            <Textarea
              className='mt-2 min-h-[72px]'
              value={config.localListDescription}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                updateConfig({ localListDescription: event.target.value })
              }
            />
          </div>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={(): void => {
                const nextRule = buildLocalRegexRule(config.scope, config.rules.length);
                updateConfig({ rules: [...config.rules, nextRule] });
              }}
            >
              Add Regex Rule
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleOpenValidatorPatterns}
            >
              Open AI-Paths Node Validator
            </Button>
          </div>
        </div>
      )}

      <div className='grid gap-3 md:grid-cols-2'>
        <div>
          <Label className='text-xs text-gray-400'>Rule Scope</Label>
          <SelectSimple
            size='sm'
            value={config.scope}
            onValueChange={(value: string): void =>
              updateConfig({
                scope:
                  SCOPE_OPTIONS.find((option) => option.value === value)?.value ??
                  'global',
              })
            }
            options={SCOPE_OPTIONS}
            className='mt-2'
          />
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Runtime Mode</Label>
          <SelectSimple
            size='sm'
            value={config.runtimeMode}
            onValueChange={(value: string): void =>
              updateConfig({
                runtimeMode:
                  value === 'validate_and_autofix'
                    ? 'validate_and_autofix'
                    : 'validate_only',
              })
            }
            options={RUNTIME_MODE_OPTIONS}
            className='mt-2'
          />
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Fail Policy</Label>
          <SelectSimple
            size='sm'
            value={config.failPolicy}
            onValueChange={(value: string): void =>
              updateConfig({
                failPolicy:
                  value === 'report_only' ? 'report_only' : 'block_on_error',
              })
            }
            options={FAIL_POLICY_OPTIONS}
            className='mt-2'
          />
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Input Port</Label>
          <SelectSimple
            size='sm'
            value={config.inputPort}
            onValueChange={(value: string): void =>
              updateConfig({
                inputPort:
                  (INPUT_PORT_OPTIONS.find((option) => option.value === value)?.value ??
                    'auto') as ValidationPatternConfigDraft['inputPort'],
              })
            }
            options={INPUT_PORT_OPTIONS}
            className='mt-2'
          />
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Output Port</Label>
          <SelectSimple
            size='sm'
            value={config.outputPort}
            onValueChange={(value: string): void =>
              updateConfig({
                outputPort:
                  (OUTPUT_PORT_OPTIONS.find((option) => option.value === value)?.value ??
                    'value') as ValidationPatternConfigDraft['outputPort'],
              })
            }
            options={OUTPUT_PORT_OPTIONS}
            className='mt-2'
          />
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Max Autofix Passes</Label>
          <Input
            className='mt-2 h-9'
            type='number'
            min={1}
            max={10}
            value={String(config.maxAutofixPasses)}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              const parsed = Number.parseInt(event.target.value, 10);
              updateConfig({
                maxAutofixPasses:
                  Number.isFinite(parsed) && parsed > 0
                    ? Math.min(10, parsed)
                    : 1,
              });
            }}
          />
        </div>
      </div>

      <ToggleRow
        type='switch'
        label='Include learned rules'
        description='When enabled, learned rules are merged with base rules.'
        checked={config.includeLearnedRules}
        onCheckedChange={(checked: boolean): void =>
          updateConfig({ includeLearnedRules: checked })
        }
      />

      <div>
        <Label className='text-xs text-gray-400'>Rule ID Allowlist (optional)</Label>
        <Textarea
          className='mt-2 min-h-[72px]'
          value={includeRuleIdsText}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateConfig({ includeRuleIds: parseRuleIdList(event.target.value) })
          }
          placeholder='One rule ID per line. Leave empty to run all configured rules.'
        />
      </div>

      <div>
        <Label className='text-xs text-gray-400'>Rules JSON</Label>
        <Textarea
          className='mt-2 min-h-[160px] font-mono text-[11px]'
          value={rulesDraft}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            setRulesDraft(event.target.value)
          }
          onBlur={commitRulesDraft}
        />
        {rulesDraftError ? (
          <p className='mt-1 text-[11px] text-rose-300'>{rulesDraftError}</p>
        ) : (
          <p className='mt-1 text-[11px] text-gray-500'>
            Edit on-canvas rule list directly in this path node.
          </p>
        )}
      </div>

      <div>
        <Label className='text-xs text-gray-400'>Learned Rules JSON</Label>
        <Textarea
          className='mt-2 min-h-[120px] font-mono text-[11px]'
          value={learnedRulesDraft}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            setLearnedRulesDraft(event.target.value)
          }
          onBlur={commitLearnedRulesDraft}
        />
        {learnedRulesDraftError ? (
          <p className='mt-1 text-[11px] text-rose-300'>{learnedRulesDraftError}</p>
        ) : (
          <p className='mt-1 text-[11px] text-gray-500'>
            Optional learned rules that can be merged at runtime.
          </p>
        )}
      </div>
    </div>
  );
}
