'use client';

import { Copy, GripVertical } from 'lucide-react';
import React from 'react';

import {
  Button,
  Input,
  Label,
  MultiSelect,
  SectionPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { usePromptEngine, type RuleDraft } from '../context/PromptEngineContext';
import {
  DEFAULT_PROMPT_VALIDATION_SCOPES,
  PROMPT_EXPLODER_RULE_SEGMENT_TYPE_VALUES,
  PROMPT_VALIDATION_SCOPE_LABELS,
  PROMPT_VALIDATION_SCOPE_VALUES,
  type PromptExploderRuleSegmentType,
  type PromptValidationScope,
  type PromptValidationSimilarPattern,
  type PromptAutofixOperation,
  type PromptValidationChainMode,
  type PromptValidationLaunchScopeBehavior,
  type PromptValidationLaunchOperator,
  type PromptValidationSeverity,
  type PromptValidationRule,
} from '../settings';

const formatSeverityLabel = (severity: PromptValidationSeverity): string => {
  if (severity === 'error') return 'Error';
  if (severity === 'warning') return 'Warning';
  return 'Info';
};

const getSeverityBadgeClasses = (severity: PromptValidationSeverity): string => {
  if (severity === 'error') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (severity === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
};

const compileRegex = (pattern: string, flags: string | undefined): { ok: true } | { ok: false; error: string } => {
  try {
    void new RegExp(pattern, flags);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid regex' };
  }
};

const formatAutofixOperation = (op: PromptAutofixOperation): string => {
  if (op.kind === 'params_json') return 'Convert `params` object to strict JSON';
  const flags = op.flags?.trim() ? `/${op.flags.trim()}` : '';
  return `Replace ${op.pattern}${flags} → ${op.replacement}`;
};

type RuleItemProps = {
  draft: RuleDraft;
  draggableEnabled?: boolean | undefined;
  isDragging?: boolean | undefined;
  isDragTarget?: boolean | undefined;
  onDragStart?: (() => void) | undefined;
  onDragEnd?: (() => void) | undefined;
};

const LAUNCH_OPERATORS: Array<{ value: PromptValidationLaunchOperator; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'regex', label: 'Regex' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

const SCOPE_OPTIONS = PROMPT_VALIDATION_SCOPE_VALUES.map((scope) => ({
  value: scope,
  label: PROMPT_VALIDATION_SCOPE_LABELS[scope],
}));
const PROMPT_EXPLODER_SEGMENT_OPTIONS: Array<{
  value: PromptExploderRuleSegmentType;
  label: string;
}> = PROMPT_EXPLODER_RULE_SEGMENT_TYPE_VALUES.map((type) => ({
  value: type,
  label: type.replaceAll('_', ' '),
}));

const normalizeRuleScopes = (
  scopes: PromptValidationScope[] | null | undefined
): PromptValidationScope[] => {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [...DEFAULT_PROMPT_VALIDATION_SCOPES];
  }
  const known = new Set<PromptValidationScope>(PROMPT_VALIDATION_SCOPE_VALUES);
  const deduped: PromptValidationScope[] = [];
  for (const scope of scopes) {
    if (!known.has(scope) || deduped.includes(scope)) continue;
    deduped.push(scope);
  }
  return deduped.length > 0 ? deduped : [...DEFAULT_PROMPT_VALIDATION_SCOPES];
};

const IMAGE_STUDIO_SCOPE_SET = new Set<PromptValidationScope>([
  'image_studio_prompt',
  'image_studio_extraction',
  'image_studio_generation',
]);

const hasOnlyImageStudioScopes = (scopes: PromptValidationScope[]): boolean =>
  scopes.some((scope) => IMAGE_STUDIO_SCOPE_SET.has(scope)) &&
  scopes.every((scope) => IMAGE_STUDIO_SCOPE_SET.has(scope) || scope === 'global');

const normalizeRuleKind = (value: string): PromptValidationRule['kind'] =>
  value === 'params_object' ? 'params_object' : 'regex';

export function RuleItem({
  draft,
  draggableEnabled = false,
  isDragging = false,
  isDragTarget = false,
  onDragStart,
  onDragEnd,
}: RuleItemProps): React.JSX.Element {
  const {
    handleRuleTextChange,
    handlePatchRule,
    handleToggleRuleEnabled,
    handleDuplicateRule,
    handleRemoveRule,
    handleCopy,
  } = usePromptEngine();
  const rule = draft.parsed;
  const regexStatus = rule?.kind === 'regex' ? compileRegex(rule.pattern, rule.flags) : null;
  const sequenceValue =
    typeof rule?.sequence === 'number' && Number.isFinite(rule.sequence)
      ? String(Math.max(0, Math.floor(rule.sequence)))
      : '';
  const chainMode: PromptValidationChainMode = rule?.chainMode ?? 'continue';
  const maxExecutions =
    typeof rule?.maxExecutions === 'number' && Number.isFinite(rule.maxExecutions)
      ? Math.max(1, Math.floor(rule.maxExecutions))
      : 1;
  const passOutputToNext = rule?.passOutputToNext ?? true;
  const launchEnabled = rule?.launchEnabled ?? false;
  const appliesToScopes = normalizeRuleScopes(rule?.appliesToScopes);
  const launchAppliesToScopes = normalizeRuleScopes(rule?.launchAppliesToScopes);
  const launchScopeBehavior: PromptValidationLaunchScopeBehavior =
    rule?.launchScopeBehavior === 'bypass' ? 'bypass' : 'gate';
  const launchOperator = rule?.launchOperator ?? 'contains';
  const launchValue = rule?.launchValue ?? '';
  const launchFlags = rule?.launchFlags ?? '';
  const promptExploderSegmentType = rule?.promptExploderSegmentType ?? null;
  const promptExploderConfidenceBoost = Number.isFinite(rule?.promptExploderConfidenceBoost)
    ? Math.min(0.5, Math.max(0, rule?.promptExploderConfidenceBoost ?? 0))
    : 0;
  const promptExploderPriority = Number.isFinite(rule?.promptExploderPriority)
    ? Math.min(50, Math.max(-50, Math.floor(rule?.promptExploderPriority ?? 0)))
    : 0;
  const promptExploderTreatAsHeading = rule?.promptExploderTreatAsHeading ?? false;
  const hasPromptExploderScope = appliesToScopes.some(
    (scope) => scope === 'prompt_exploder' || scope === 'global'
  );
  const isImageStudioRule = Boolean(
    rule &&
      (rule.id.toLowerCase().includes('image_studio') ||
        rule.id.toLowerCase().includes('image-studio') ||
        hasOnlyImageStudioScopes(appliesToScopes) ||
        hasOnlyImageStudioScopes(launchAppliesToScopes))
  );

  const patchRule = (patch: Partial<PromptValidationRule>): void => {
    if (!rule) return;
    handlePatchRule(draft.uid, patch);
  };

  const updateSimilar = (
    index: number,
    patch: Partial<PromptValidationSimilarPattern>
  ): void => {
    if (!rule) return;
    const next = [...(rule.similar ?? [])];
    const current = next[index];
    if (!current) return;
    next[index] = { ...current, ...patch };
    patchRule({ similar: next });
  };

  const removeSimilar = (index: number): void => {
    if (!rule) return;
    const next = (rule.similar ?? []).filter((_item, idx) => idx !== index);
    patchRule({ similar: next });
  };

  const addSimilar = (): void => {
    if (!rule) return;
    const next = [
      ...(rule.similar ?? []),
      {
        pattern: '',
        flags: '',
        suggestion: '',
        comment: null,
      },
    ];
    patchRule({ similar: next });
  };

  const updateAutofixOperation = (
    index: number,
    operation: PromptAutofixOperation
  ): void => {
    if (!rule) return;
    const currentOps = rule.autofix?.operations ?? [];
    const next = [...currentOps];
    if (!next[index]) return;
    next[index] = operation;
    patchRule({
      autofix: {
        enabled: rule.autofix?.enabled ?? true,
        operations: next,
      },
    });
  };

  const removeAutofixOperation = (index: number): void => {
    if (!rule) return;
    const currentOps = rule.autofix?.operations ?? [];
    const next = currentOps.filter((_item, idx) => idx !== index);
    patchRule({
      autofix: {
        enabled: rule.autofix?.enabled ?? true,
        operations: next,
      },
    });
  };

  const addAutofixOperation = (kind: PromptAutofixOperation['kind']): void => {
    if (!rule) return;
    const currentOps = rule.autofix?.operations ?? [];
    let nextOperation: PromptAutofixOperation;
    if (kind === 'params_json') {
      nextOperation = { kind: 'params_json', comment: null };
    } else {
      nextOperation = {
        kind: 'replace',
        pattern: '',
        flags: '',
        replacement: '',
        comment: null,
      };
    }
    patchRule({
      autofix: {
        enabled: rule.autofix?.enabled ?? true,
        operations: [...currentOps, nextOperation],
      },
    });
  };

  return (
    <SectionPanel
      className={cn(
        'space-y-3 transition-opacity',
        isDragging ? 'opacity-50' : 'opacity-100',
        isDragTarget ? 'ring-1 ring-cyan-300/55' : '',
        rule?.sequenceGroupId ? 'border-l-2 border-cyan-400/35' : ''
      )}
    >
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            draggable={draggableEnabled}
            onDragStart={(event: React.DragEvent<HTMLButtonElement>): void => {
              if (!draggableEnabled) return;
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', draft.uid);
              onDragStart?.();
            }}
            onDragEnd={(): void => {
              onDragEnd?.();
            }}
            className={cn(
              'rounded border border-slate-600/70 bg-slate-800/60 p-1 text-slate-300',
              draggableEnabled ? 'cursor-grab hover:bg-slate-700/70 active:cursor-grabbing' : 'cursor-not-allowed opacity-50'
            )}
            title='Drag and drop onto another rule to create/join a sequence group'
            aria-label='Drag and drop onto another rule to create/join a sequence group'
            disabled={!draggableEnabled}
          >
            <GripVertical className='size-3.5' />
          </button>
          <span className={cn('rounded-full border px-2 py-0.5 text-[11px]', rule ? getSeverityBadgeClasses(rule.severity) : 'border-gray-600/40 text-gray-300')}>
            {rule ? formatSeverityLabel(rule.severity) : 'Invalid'}
          </span>
          {rule ? (
            <button
              type='button'
              className={cn(
                'rounded border px-2 py-0.5 text-[10px] uppercase',
                rule.enabled
                  ? 'border-emerald-500/45 bg-emerald-500/10 text-emerald-200'
                  : 'border-red-500/45 bg-red-500/10 text-red-200'
              )}
              onClick={() => handleToggleRuleEnabled(draft.uid, !rule.enabled)}
            >
              {rule.enabled ? 'Enabled' : 'Disabled'}
            </button>
          ) : null}
          {isImageStudioRule ? (
            <span className='rounded border border-teal-500/45 bg-teal-500/10 px-2 py-0.5 text-[10px] uppercase text-teal-200'>
              Image Studio Rule
            </span>
          ) : null}
          <span className='text-sm font-medium text-gray-100'>
            {rule?.title ?? 'Invalid rule'}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <Tooltip content='Copy JSON'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => void handleCopy(draft.text, 'Rule')}
            >
              <Copy className='size-4' />
            </Button>
          </Tooltip>
          <Button type='button' variant='outline' size='sm' onClick={() => handleDuplicateRule(draft.uid)} disabled={!rule}>
            Duplicate
          </Button>
          <Button type='button' variant='outline' size='sm' onClick={() => handleRemoveRule(draft.uid)}>
            Remove
          </Button>
        </div>
      </div>

      {rule ? (
        <div className='space-y-4'>
          <div className='grid gap-3 md:grid-cols-4'>
            <div className='space-y-1 md:col-span-1'>
              <Label className='text-[11px] text-slate-300'>Kind</Label>
              <Select
                value={rule.kind}
                onValueChange={(value: string): void => {
                  const nextKind = normalizeRuleKind(value);
                  if (nextKind === rule.kind) return;
                  if (nextKind === 'regex') {
                    const nextRule: PromptValidationRule = {
                      ...rule,
                      kind: 'regex',
                      pattern: '^$',
                      flags: 'mi',
                    };
                    handleRuleTextChange(draft.uid, JSON.stringify(nextRule, null, 2));
                    return;
                  }
                  const nextRuleRecord = {
                    ...rule,
                    kind: 'params_object',
                  } as Record<string, unknown>;
                  delete nextRuleRecord['pattern'];
                  delete nextRuleRecord['flags'];
                  const nextRule = nextRuleRecord as PromptValidationRule;
                  handleRuleTextChange(draft.uid, JSON.stringify(nextRule, null, 2));
                }}
              >
                <SelectTrigger className='h-8'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='regex'>Regex</SelectItem>
                  <SelectItem value='params_object'>Params Object</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1 md:col-span-1'>
              <Label className='text-[11px] text-slate-300'>Severity</Label>
              <Select
                value={rule.severity}
                onValueChange={(value: string): void => {
                  if (value !== 'error' && value !== 'warning' && value !== 'info') return;
                  patchRule({ severity: value });
                }}
              >
                <SelectTrigger className='h-8'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='error'>Error</SelectItem>
                  <SelectItem value='warning'>Warning</SelectItem>
                  <SelectItem value='info'>Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1 md:col-span-2'>
              <Label className='text-[11px] text-slate-300'>Rule ID</Label>
              <Input
                className='h-8'
                value={rule.id}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  patchRule({ id: event.target.value });
                }}
              />
            </div>
            <div className='space-y-1 md:col-span-2'>
              <Label className='text-[11px] text-slate-300'>Title</Label>
              <Input
                className='h-8'
                value={rule.title}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  patchRule({ title: event.target.value });
                }}
              />
            </div>
            <div className='space-y-1 md:col-span-2'>
              <Label className='text-[11px] text-slate-300'>Description</Label>
              <Input
                className='h-8'
                value={rule.description ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  patchRule({ description: event.target.value.trim() || null });
                }}
              />
            </div>
            <div className='space-y-1 md:col-span-4'>
              <Label className='text-[11px] text-slate-300'>Message</Label>
              <Textarea
                className='min-h-[72px] text-[12px]'
                value={rule.message}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                  patchRule({ message: event.target.value });
                }}
              />
            </div>
            {rule.kind === 'regex' ? (
              <>
                <div className='space-y-1 md:col-span-3'>
                  <Label className='text-[11px] text-slate-300'>Pattern</Label>
                  <Input
                    className='h-8 font-mono'
                    value={rule.pattern}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      patchRule({ pattern: event.target.value });
                    }}
                  />
                </div>
                <div className='space-y-1 md:col-span-1'>
                  <Label className='text-[11px] text-slate-300'>Flags</Label>
                  <Input
                    className='h-8 font-mono'
                    value={rule.flags}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      patchRule({ flags: event.target.value });
                    }}
                  />
                </div>
              </>
            ) : null}
            {rule.kind === 'regex' && regexStatus && !regexStatus.ok ? (
              <div className='md:col-span-4 text-xs text-red-300'>
                Regex error: {regexStatus.error}
              </div>
            ) : null}
            <div className='space-y-1 md:col-span-4'>
              <Label className='text-[11px] text-slate-300'>Validation Scopes</Label>
              <MultiSelect
                options={SCOPE_OPTIONS}
                selected={appliesToScopes}
                onChange={(values: string[]): void => {
                  patchRule({
                    appliesToScopes: normalizeRuleScopes(values as PromptValidationScope[]),
                  });
                }}
                placeholder='All scopes'
                searchPlaceholder='Search scope...'
                emptyMessage='No scope found.'
              />
            </div>
            {hasPromptExploderScope ? (
              <>
                <div className='space-y-1 md:col-span-2'>
                  <Label className='text-[11px] text-slate-300'>Exploder Segment Type Hint</Label>
                  <Select
                    value={promptExploderSegmentType ?? 'none'}
                    onValueChange={(value: string): void => {
                      if (value === 'none') {
                        patchRule({ promptExploderSegmentType: null });
                        return;
                      }
                      const valid = PROMPT_EXPLODER_SEGMENT_OPTIONS.some(
                        (option) => option.value === value
                      );
                      if (!valid) return;
                      patchRule({
                        promptExploderSegmentType: value as PromptExploderRuleSegmentType,
                      });
                    }}
                  >
                    <SelectTrigger className='h-8'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>No type override</SelectItem>
                      {PROMPT_EXPLODER_SEGMENT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1 md:col-span-1'>
                  <Label className='text-[11px] text-slate-300'>Exploder Priority</Label>
                  <Input
                    type='number'
                    min={-50}
                    max={50}
                    className='h-8'
                    value={String(promptExploderPriority)}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const parsed = Number(event.target.value);
                      if (!Number.isFinite(parsed)) return;
                      patchRule({
                        promptExploderPriority: Math.min(50, Math.max(-50, Math.floor(parsed))),
                      });
                    }}
                  />
                </div>
                <div className='space-y-1 md:col-span-1'>
                  <Label className='text-[11px] text-slate-300'>Exploder Confidence Boost</Label>
                  <Input
                    type='number'
                    min={0}
                    max={0.5}
                    step={0.05}
                    className='h-8'
                    value={promptExploderConfidenceBoost.toFixed(2)}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const parsed = Number(event.target.value);
                      if (!Number.isFinite(parsed)) return;
                      patchRule({
                        promptExploderConfidenceBoost: Math.min(0.5, Math.max(0, parsed)),
                      });
                    }}
                  />
                </div>
                <div className='space-y-1 md:col-span-4'>
                  <Label className='text-[11px] text-slate-300'>Exploder: Treat Match As Heading</Label>
                  <button
                    type='button'
                    className={cn(
                      'h-8 w-full rounded border text-xs font-medium',
                      promptExploderTreatAsHeading
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                        : 'border-red-500/50 bg-red-500/10 text-red-200'
                    )}
                    onClick={() =>
                      patchRule({
                        promptExploderTreatAsHeading: !promptExploderTreatAsHeading,
                      })
                    }
                  >
                    {promptExploderTreatAsHeading ? 'ON' : 'OFF'}
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <div className='grid gap-2 rounded border border-border/40 bg-foreground/5 p-3 md:grid-cols-4'>
            <div className='space-y-1'>
              <Label className='text-[11px] text-slate-300'>Sequence</Label>
              <Input
                type='number'
                min={0}
                className='h-8'
                value={sequenceValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  const raw = event.target.value.trim();
                  if (!raw) {
                    patchRule({ sequence: null });
                    return;
                  }
                  const parsed = Number(raw);
                  if (!Number.isFinite(parsed)) return;
                  patchRule({ sequence: Math.max(0, Math.floor(parsed)) });
                }}
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-[11px] text-slate-300'>Chain Mode</Label>
              <Select
                value={chainMode}
                onValueChange={(value: string): void =>
                  patchRule({
                    chainMode:
                      value === 'stop_on_match' || value === 'stop_on_replace'
                        ? value
                        : 'continue',
                  })
                }
              >
                <SelectTrigger className='h-8'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='continue'>Continue</SelectItem>
                  <SelectItem value='stop_on_match'>Stop On Match</SelectItem>
                  <SelectItem value='stop_on_replace'>Stop On Replace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label className='text-[11px] text-slate-300'>Max Executions</Label>
              <Input
                type='number'
                min={1}
                max={20}
                className='h-8'
                value={String(maxExecutions)}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  const parsed = Number(event.target.value);
                  if (!Number.isFinite(parsed)) return;
                  patchRule({
                    maxExecutions: Math.min(20, Math.max(1, Math.floor(parsed))),
                  });
                }}
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-[11px] text-slate-300'>Pass Output To Next</Label>
              <button
                type='button'
                className={cn(
                  'h-8 w-full rounded border text-xs font-medium',
                  passOutputToNext
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                    : 'border-red-500/50 bg-red-500/10 text-red-200'
                )}
                onClick={() => patchRule({ passOutputToNext: !passOutputToNext })}
              >
                {passOutputToNext ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className='md:col-span-4 mt-1 grid gap-2 md:grid-cols-4'>
              <div className='space-y-1'>
                <Label className='text-[11px] text-slate-300'>Launch</Label>
                <button
                  type='button'
                  className={cn(
                    'h-8 w-full rounded border text-xs font-medium',
                    launchEnabled
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/50 bg-red-500/10 text-red-200'
                  )}
                  onClick={() => patchRule({ launchEnabled: !launchEnabled })}
                >
                  {launchEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className='space-y-1'>
                <Label className='text-[11px] text-slate-300'>Launch Scope Behavior</Label>
                <Select
                  value={launchScopeBehavior}
                  onValueChange={(value: string): void => {
                    patchRule({
                      launchScopeBehavior: value === 'bypass' ? 'bypass' : 'gate',
                    });
                  }}
                >
                  <SelectTrigger className='h-8'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='gate'>Gate outside scope</SelectItem>
                    <SelectItem value='bypass'>Bypass outside scope</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1 md:col-span-2'>
                <Label className='text-[11px] text-slate-300'>Launch Scopes</Label>
                <MultiSelect
                  options={SCOPE_OPTIONS}
                  selected={launchAppliesToScopes}
                  onChange={(values: string[]): void => {
                    patchRule({
                      launchAppliesToScopes: normalizeRuleScopes(
                        values as PromptValidationScope[]
                      ),
                    });
                  }}
                  placeholder='All scopes'
                  searchPlaceholder='Search scope...'
                  emptyMessage='No scope found.'
                />
              </div>
              <div className='space-y-1 md:col-span-2'>
                <Label className='text-[11px] text-slate-300'>Launch Operator</Label>
                <Select
                  value={launchOperator}
                  onValueChange={(value: string): void => {
                    const valid = LAUNCH_OPERATORS.some((op) => op.value === value);
                    patchRule({
                      launchOperator: valid
                        ? (value as PromptValidationLaunchOperator)
                        : 'contains',
                    });
                  }}
                >
                  <SelectTrigger className='h-8'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAUNCH_OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1'>
                <Label className='text-[11px] text-slate-300'>Launch Flags</Label>
                <Input
                  className='h-8'
                  value={launchFlags}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    patchRule({ launchFlags: event.target.value.trim() || null })
                  }
                  placeholder='mi'
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-[11px] text-slate-300'>Launch Value</Label>
                <Input
                  className='h-8'
                  value={launchValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    patchRule({ launchValue: event.target.value || null })
                  }
                  placeholder='contains/equals target'
                />
              </div>
            </div>

            {rule.sequenceGroupId ? (
              <div className='md:col-span-4 text-[11px] text-cyan-100/80'>
                Group:
                <span className='ml-1 font-mono'>
                  {rule.sequenceGroupLabel?.trim() || 'Sequence / Group'}
                </span>
                <span className='ml-2 text-cyan-200/70'>({rule.sequenceGroupId})</span>
              </div>
            ) : null}
          </div>

          <div className='space-y-3 rounded border border-border/40 bg-foreground/5 p-3'>
            <div className='flex items-center justify-between gap-2'>
              <div className='text-xs font-semibold uppercase tracking-wide text-gray-300'>
                Similar Patterns
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={addSimilar}
              >
                Add Similar
              </Button>
            </div>
            {rule.similar.length === 0 ? (
              <div className='text-xs text-gray-400'>No similar patterns configured.</div>
            ) : null}
            {rule.similar.map((sim, index) => (
              <div
                key={`${rule.id}-similar-${index}`}
                className='grid gap-2 rounded border border-border/40 bg-background/40 p-2 md:grid-cols-6'
              >
                <div className='space-y-1 md:col-span-3'>
                  <Label className='text-[11px] text-slate-300'>Pattern</Label>
                  <Input
                    className='h-8 font-mono'
                    value={sim.pattern}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      updateSimilar(index, { pattern: event.target.value });
                    }}
                  />
                </div>
                <div className='space-y-1 md:col-span-1'>
                  <Label className='text-[11px] text-slate-300'>Flags</Label>
                  <Input
                    className='h-8 font-mono'
                    value={sim.flags ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      updateSimilar(index, { flags: event.target.value.trim() || undefined });
                    }}
                  />
                </div>
                <div className='space-y-1 md:col-span-2'>
                  <Label className='text-[11px] text-slate-300'>Suggestion</Label>
                  <Input
                    className='h-8'
                    value={sim.suggestion}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      updateSimilar(index, { suggestion: event.target.value });
                    }}
                  />
                </div>
                <div className='space-y-1 md:col-span-5'>
                  <Label className='text-[11px] text-slate-300'>Comment</Label>
                  <Input
                    className='h-8'
                    value={sim.comment ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      updateSimilar(index, {
                        comment: event.target.value.trim() || null,
                      });
                    }}
                  />
                </div>
                <div className='flex items-end md:col-span-1'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => removeSimilar(index)}
                    className='w-full'
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className='space-y-3 rounded border border-border/40 bg-foreground/5 p-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='text-xs font-semibold uppercase tracking-wide text-gray-300'>
                Autofix Operations
              </div>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  className={cn(
                    'rounded border px-2 py-1 text-[11px]',
                    rule.autofix?.enabled !== false
                      ? 'border-emerald-500/45 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/45 bg-red-500/10 text-red-200'
                  )}
                  onClick={() =>
                    patchRule({
                      autofix: {
                        enabled: !(rule.autofix?.enabled ?? true),
                        operations: rule.autofix?.operations ?? [],
                      },
                    })
                  }
                >
                  {rule.autofix?.enabled !== false ? 'Autofix ON' : 'Autofix OFF'}
                </button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => addAutofixOperation('replace')}
                >
                  Add Replace
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => addAutofixOperation('params_json')}
                >
                  Add Params JSON
                </Button>
              </div>
            </div>
            {(rule.autofix?.operations ?? []).length === 0 ? (
              <div className='text-xs text-gray-400'>No autofix operations configured.</div>
            ) : null}
            {(rule.autofix?.operations ?? []).map((op, index) => (
              <div
                key={`${rule.id}-autofix-${index}`}
                className='space-y-2 rounded border border-border/40 bg-background/40 p-2'
              >
                <div className='flex items-center justify-between gap-2'>
                  <div className='text-xs text-gray-300'>{formatAutofixOperation(op)}</div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => removeAutofixOperation(index)}
                  >
                    Remove
                  </Button>
                </div>
                {op.kind === 'replace' ? (
                  <div className='grid gap-2 md:grid-cols-4'>
                    <div className='space-y-1 md:col-span-2'>
                      <Label className='text-[11px] text-slate-300'>Pattern</Label>
                      <Input
                        className='h-8 font-mono'
                        value={op.pattern}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateAutofixOperation(index, {
                            ...op,
                            pattern: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className='space-y-1 md:col-span-1'>
                      <Label className='text-[11px] text-slate-300'>Flags</Label>
                      <Input
                        className='h-8 font-mono'
                        value={op.flags ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateAutofixOperation(index, {
                            ...op,
                            flags: event.target.value.trim() || undefined,
                          })
                        }
                      />
                    </div>
                    <div className='space-y-1 md:col-span-1'>
                      <Label className='text-[11px] text-slate-300'>Replacement</Label>
                      <Input
                        className='h-8'
                        value={op.replacement}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateAutofixOperation(index, {
                            ...op,
                            replacement: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className='space-y-1 md:col-span-4'>
                      <Label className='text-[11px] text-slate-300'>Comment</Label>
                      <Input
                        className='h-8'
                        value={op.comment ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateAutofixOperation(index, {
                            ...op,
                            comment: event.target.value.trim() || null,
                          })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className='space-y-1'>
                    <Label className='text-[11px] text-slate-300'>Comment</Label>
                    <Input
                      className='h-8'
                      value={op.comment ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateAutofixOperation(index, {
                          ...op,
                          comment: event.target.value.trim() || null,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className='space-y-2'>
          <Textarea
            className='min-h-[180px] font-mono text-[12px]'
            value={draft.text}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleRuleTextChange(draft.uid, event.target.value)
            }
          />
          {draft.error ? (
            <div className='text-xs text-red-300'>{draft.error}</div>
          ) : (
            <div className='text-xs text-gray-400'>Fix JSON to enable visual editing.</div>
          )}
        </div>
      )}

      <details className='rounded border border-border/40 bg-foreground/5 p-3'>
        <summary className='cursor-pointer text-xs font-medium text-gray-200'>
          Raw JSON editor
        </summary>
        <div className='mt-3 space-y-2'>
          <Textarea
            className='min-h-[180px] font-mono text-[12px]'
            value={draft.text}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleRuleTextChange(draft.uid, event.target.value)
            }
          />
          {draft.error ? (
            <div className='text-xs text-red-300'>{draft.error}</div>
          ) : null}
        </div>
      </details>
    </SectionPanel>
  );
}
