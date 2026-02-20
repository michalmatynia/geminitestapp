'use client';

import { Copy, GripVertical } from 'lucide-react';
import React from 'react';

import { DOCUMENTATION_MODULE_IDS } from '@/features/documentation';
import { getDocumentationTooltip } from '@/features/tooltip-engine';
import {
  Button,
  Input,
  MultiSelect,
  SelectSimple,
  Textarea,
  Tooltip,
  FormField,
  CollapsibleSection,
  Card,
  Badge,
  StatusBadge,
  Hint,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useRuleItemDragState } from './context/RuleListDragContext';
import {
  addAutofixOperationToRule,
  addSimilarToRule,
  removeAutofixOperationFromRule,
  removeSimilarFromRule,
  updateAutofixOperationInRule,
  updateSimilarInRule,
} from './rule-item-mutations';
import {
  LAUNCH_OPERATORS,
  PROMPT_EXPLODER_SEGMENT_OPTIONS,
  SCOPE_OPTIONS,
  compileRegex,
  formatAutofixOperation,
  formatSeverityLabel,
  getSeverityBadgeClasses,
  isImageStudioRuleFromScopes,
  normalizeRuleKind,
  normalizeRuleScopes,
} from './rule-item-utils';
import { RuleItemSimilarPatternsSection } from './RuleItemSimilarPatternsSection';
import { usePromptEngine, type RuleDraft } from '../context/PromptEngineContext';
import {
  type PromptExploderRuleSegmentType,
  type PromptExploderCaptureApplyTo,
  type PromptExploderCaptureNormalize,
  type PromptValidationScope,
  type PromptValidationSimilarPattern,
  type PromptAutofixOperation,
  type PromptValidationChainMode,
  type PromptValidationLaunchScopeBehavior,
  type PromptValidationLaunchOperator,
  type PromptValidationRule,
} from '../settings';

type RuleItemProps = {
  draft: RuleDraft;
};

export function RuleItem({
  draft,
}: RuleItemProps): React.JSX.Element {
  const {
    draggableEnabled,
    isDragging,
    isDragTarget,
    onDragStart,
    onDragEnd,
  } = useRuleItemDragState(draft.uid);
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
  const promptExploderCaptureTarget = rule?.promptExploderCaptureTarget ?? '';
  const promptExploderCaptureGroup =
    typeof rule?.promptExploderCaptureGroup === 'number' &&
    Number.isFinite(rule.promptExploderCaptureGroup)
      ? Math.max(0, Math.floor(rule.promptExploderCaptureGroup))
      : 1;
  const promptExploderCaptureApplyTo: PromptExploderCaptureApplyTo =
    rule?.promptExploderCaptureApplyTo === 'line' ? 'line' : 'segment';
  const promptExploderCaptureNormalize: PromptExploderCaptureNormalize =
    rule?.promptExploderCaptureNormalize === 'lower' ||
    rule?.promptExploderCaptureNormalize === 'upper' ||
    rule?.promptExploderCaptureNormalize === 'country' ||
    rule?.promptExploderCaptureNormalize === 'day' ||
    rule?.promptExploderCaptureNormalize === 'month' ||
    rule?.promptExploderCaptureNormalize === 'year'
      ? rule.promptExploderCaptureNormalize
      : 'trim';
  const copyJsonTooltip = getDocumentationTooltip(
    DOCUMENTATION_MODULE_IDS.promptEngine,
    'rule_item_copy_json'
  ) ?? 'Copy JSON';
  const promptExploderCaptureOverwrite = rule?.promptExploderCaptureOverwrite ?? false;
  const hasPromptExploderScope = appliesToScopes.some(
    (scope) => scope === 'prompt_exploder' || scope === 'global'
  );
  const isImageStudioRule = isImageStudioRuleFromScopes(
    rule,
    appliesToScopes,
    launchAppliesToScopes
  );

  const patchRule = (patch: Partial<PromptValidationRule>): void => {
    if (!rule) return;
    handlePatchRule(draft.uid, patch);
  };

  const updateSimilar = (
    index: number,
    patch: Partial<PromptValidationSimilarPattern>,
  ): void => updateSimilarInRule(rule, patchRule, index, patch);

  const removeSimilar = (index: number): void =>
    removeSimilarFromRule(rule, patchRule, index);

  const addSimilar = (): void => addSimilarToRule(rule, patchRule);

  const updateAutofixOperation = (
    index: number,
    operation: PromptAutofixOperation,
  ): void => updateAutofixOperationInRule(rule, patchRule, index, operation);

  const removeAutofixOperation = (index: number): void =>
    removeAutofixOperationFromRule(rule, patchRule, index);

  const addAutofixOperation = (kind: PromptAutofixOperation['kind']): void =>
    addAutofixOperationToRule(rule, patchRule, kind);

  return (
    <Card
      variant='subtle'
      padding='md'
      className={cn(
        'space-y-3 border-border/60 bg-card/40 transition-opacity',
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
              'rounded border p-1',
              draggableEnabled ? 'cursor-grab border-border/60 bg-card/50 text-slate-300 hover:bg-card/70 active:cursor-grabbing' : 'cursor-not-allowed border-slate-600/70 bg-slate-800/60 text-slate-300 opacity-50'
            )}
            title='Drag and drop onto another rule to create/join a sequence group'
            aria-label='Drag and drop onto another rule to create/join a sequence group'
            disabled={!draggableEnabled}
          >
            <GripVertical className='size-3.5' />
          </button>
          {rule ? (
            <Badge variant={rule.severity === 'error' ? 'error' : rule.severity === 'warning' ? 'warning' : 'info'} size='sm' className='font-bold uppercase'>
              {formatSeverityLabel(rule.severity)}
            </Badge>
          ) : (
            <Badge variant='neutral' size='sm' className='font-bold uppercase'>Invalid</Badge>
          )}
          {rule ? (
            <button
              type='button'
              onClick={() => handleToggleRuleEnabled(draft.uid, !rule.enabled)}
            >
              <StatusBadge
                status={rule.enabled ? 'Enabled' : 'Disabled'}
                variant={rule.enabled ? 'active' : 'neutral'}
                size='sm'
                className='font-bold uppercase'
              />
            </button>
          ) : null}
          {isImageStudioRule ? (
            <Badge variant='info' size='sm' className='border-teal-500/45 bg-teal-500/10 text-teal-200 font-bold uppercase'>
              Image Studio Rule
            </Badge>
          ) : null}
          <span className='text-sm font-medium text-gray-100'>
            {rule?.title ?? 'Invalid rule'}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <Tooltip content={copyJsonTooltip}>
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
            <FormField label='Kind'>
              <SelectSimple
                size='sm'
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
                options={[
                  { value: 'regex', label: 'Regex' },
                  { value: 'params_object', label: 'Params Object' },
                ]}
              />
            </FormField>
            <FormField label='Severity'>
              <SelectSimple
                size='sm'
                value={rule.severity}
                onValueChange={(value: string): void => {
                  if (value !== 'error' && value !== 'warning' && value !== 'info') return;
                  patchRule({ severity: value });
                }}
                options={[
                  { value: 'error', label: 'Error' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'info', label: 'Info' },
                ]}
              />
            </FormField>
            <FormField label='Rule ID' className='md:col-span-2'>
              <Input
                className='h-8'
                value={rule.id}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  patchRule({ id: event.target.value });
                }}
              />
            </FormField>
            <FormField label='Title' className='md:col-span-2'>
              <Input
                className='h-8'
                value={rule.title}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  patchRule({ title: event.target.value });
                }}
              />
            </FormField>
            <FormField label='Description' className='md:col-span-2'>
              <Input
                className='h-8'
                value={rule.description ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  patchRule({ description: event.target.value.trim() || null });
                }}
              />
            </FormField>
            <FormField label='Message' className='md:col-span-4'>
              <Textarea
                className='min-h-[72px] text-[12px]'
                value={rule.message}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                  patchRule({ message: event.target.value });
                }}
              />
            </FormField>
            {rule.kind === 'regex' ? (
              <>
                <FormField label='Pattern' className='md:col-span-3'>
                  <Input
                    className='h-8 font-mono'
                    value={rule.pattern}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      patchRule({ pattern: event.target.value });
                    }}
                  />
                </FormField>
                <FormField label='Flags'>
                  <Input
                    className='h-8 font-mono'
                    value={rule.flags}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      patchRule({ flags: event.target.value });
                    }}
                  />
                </FormField>
              </>
            ) : null}
            {rule.kind === 'regex' && regexStatus && !regexStatus.ok ? (
              <div className='md:col-span-4 text-xs text-red-300'>
                Regex error: {regexStatus.error}
              </div>
            ) : null}
            <FormField label='Validation Scopes' className='md:col-span-4'>
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
            </FormField>
            {hasPromptExploderScope ? (
              <>
                <FormField label='Exploder Segment Type Hint' className='md:col-span-2'>
                  <SelectSimple
                    size='sm'
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
                    options={[
                      { value: 'none', label: 'No type override' },
                      ...PROMPT_EXPLODER_SEGMENT_OPTIONS,
                    ]}
                  />
                </FormField>
                <FormField label='Exploder Priority'>
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
                </FormField>
                <FormField label='Exploder Confidence Boost'>
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
                </FormField>
                <FormField label='Exploder: Treat Match As Heading' className='md:col-span-4'>
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
                </FormField>
                <FormField
                  label='Exploder Capture Target'
                  description='Optional. If set, regex captures can populate Case Resolver fields (for example: case_resolver.addresser.street, case_resolver.addressee.organizationName, case_resolver.place_date.year).'
                  className='md:col-span-4'
                >
                  <Input
                    className='h-8 font-mono'
                    value={promptExploderCaptureTarget}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      patchRule({
                        promptExploderCaptureTarget: event.target.value.trim() || null,
                      });
                    }}
                    placeholder='case_resolver.addresser.firstName'
                  />
                </FormField>
                <FormField label='Capture Group'>
                  <Input
                    type='number'
                    min={0}
                    max={20}
                    className='h-8'
                    value={String(promptExploderCaptureGroup)}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const raw = event.target.value.trim();
                      if (!raw) {
                        patchRule({ promptExploderCaptureGroup: null });
                        return;
                      }
                      const parsed = Number(raw);
                      if (!Number.isFinite(parsed)) return;
                      patchRule({
                        promptExploderCaptureGroup: Math.min(20, Math.max(0, Math.floor(parsed))),
                      });
                    }}
                  />
                </FormField>
                <FormField label='Capture Apply To'>
                  <SelectSimple
                    size='sm'
                    value={promptExploderCaptureApplyTo}
                    onValueChange={(value: string): void => {
                      patchRule({
                        promptExploderCaptureApplyTo: value === 'line' ? 'line' : 'segment',
                      });
                    }}
                    options={[
                      { value: 'segment', label: 'Whole segment' },
                      { value: 'line', label: 'Each line' },
                    ]}
                  />
                </FormField>
                <FormField label='Capture Normalize'>
                  <SelectSimple
                    size='sm'
                    value={promptExploderCaptureNormalize}
                    onValueChange={(value: string): void => {
                      if (
                        value !== 'trim' &&
                        value !== 'lower' &&
                        value !== 'upper' &&
                        value !== 'country' &&
                        value !== 'day' &&
                        value !== 'month' &&
                        value !== 'year'
                      ) {
                        return;
                      }
                      patchRule({
                        promptExploderCaptureNormalize: value,
                      });
                    }}
                    options={[
                      { value: 'trim', label: 'Trim' },
                      { value: 'lower', label: 'Lower' },
                      { value: 'upper', label: 'Upper' },
                      { value: 'country', label: 'Country Name' },
                      { value: 'day', label: 'Day' },
                      { value: 'month', label: 'Month' },
                      { value: 'year', label: 'Year' },
                    ]}
                  />
                </FormField>
                <FormField label='Capture Overwrite'>
                  <button
                    type='button'
                    className={cn(
                      'h-8 w-full rounded border text-xs font-medium',
                      promptExploderCaptureOverwrite
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                        : 'border-red-500/50 bg-red-500/10 text-red-200'
                    )}
                    onClick={() =>
                      patchRule({
                        promptExploderCaptureOverwrite: !promptExploderCaptureOverwrite,
                      })
                    }
                  >
                    {promptExploderCaptureOverwrite ? 'ON' : 'OFF'}
                  </button>
                </FormField>
              </>
            ) : null}
          </div>

          <Card variant='subtle-compact' padding='sm' className='grid gap-2 border-border/40 bg-foreground/5 md:grid-cols-4'>
            <FormField label='Sequence'>
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
            </FormField>
            <FormField label='Chain Mode'>
              <SelectSimple
                size='sm'
                value={chainMode}
                onValueChange={(value: string): void =>
                  patchRule({
                    chainMode:
                      value === 'stop_on_match' || value === 'stop_on_replace'
                        ? value
                        : 'continue',
                  })
                }
                options={[
                  { value: 'continue', label: 'Continue' },
                  { value: 'stop_on_match', label: 'Stop On Match' },
                  { value: 'stop_on_replace', label: 'Stop On Replace' },
                ]}
              />
            </FormField>
            <FormField label='Max Executions'>
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
            </FormField>
            <FormField label='Pass Output To Next'>
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
            </FormField>

            <div className='md:col-span-4 mt-1 grid gap-2 md:grid-cols-4'>
              <FormField label='Launch'>
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
              </FormField>
              <FormField label='Launch Scope Behavior'>
                <SelectSimple
                  size='sm'
                  value={launchScopeBehavior}
                  onValueChange={(value: string): void => {
                    patchRule({
                      launchScopeBehavior: value === 'bypass' ? 'bypass' : 'gate',
                    });
                  }}
                  options={[
                    { value: 'gate', label: 'Gate outside scope' },
                    { value: 'bypass', label: 'Bypass outside scope' },
                  ]}
                />
              </FormField>
              <FormField label='Launch Scopes' className='md:col-span-2'>
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
              </FormField>
              <FormField label='Launch Operator' className='md:col-span-2'>
                <SelectSimple
                  size='sm'
                  value={launchOperator}
                  onValueChange={(value: string): void => {
                    const valid = LAUNCH_OPERATORS.some((op) => op.value === value);
                    patchRule({
                      launchOperator: valid
                        ? (value as PromptValidationLaunchOperator)
                        : 'contains',
                    });
                  }}
                  options={LAUNCH_OPERATORS}
                />
              </FormField>
              <FormField label='Launch Flags'>
                <Input
                  className='h-8'
                  value={launchFlags}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    patchRule({ launchFlags: event.target.value.trim() || null })
                  }
                  placeholder='mi'
                />
              </FormField>
              <FormField label='Launch Value'>
                <Input
                  className='h-8'
                  value={launchValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    patchRule({ launchValue: event.target.value || null })
                  }
                  placeholder='contains/equals target'
                />
              </FormField>
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
          </Card>

          <RuleItemSimilarPatternsSection
            rule={rule}
            onAddSimilar={addSimilar}
            onUpdateSimilar={updateSimilar}
            onRemoveSimilar={removeSimilar}
          />

          <Card variant='subtle-compact' padding='sm' className='space-y-3 border-border/40 bg-foreground/5'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <Hint size='xs' uppercase className='font-semibold text-gray-300'>
                Autofix Operations
              </Hint>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() =>
                    patchRule({
                      autofix: {
                        enabled: !(rule.autofix?.enabled ?? true),
                        operations: rule.autofix?.operations ?? [],
                      },
                    })
                  }
                >
                  <StatusBadge
                    status={rule.autofix?.enabled !== false ? 'Autofix ON' : 'Autofix OFF'}
                    variant={rule.autofix?.enabled !== false ? 'active' : 'neutral'}
                    size='sm'
                    className='font-bold uppercase'
                  />
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
              <Card
                key={`${rule.id}-autofix-${index}`}
                variant='subtle-compact'
                padding='sm'
                className='space-y-2 border-border/40 bg-background/40'
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
                    <FormField label='Pattern' className='md:col-span-2'>
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
                    </FormField>
                    <FormField label='Flags'>
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
                    </FormField>
                    <FormField label='Replacement'>
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
                    </FormField>
                    <FormField label='Comment' className='md:col-span-4'>
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
                    </FormField>
                  </div>
                ) : (
                  <FormField label='Comment'>
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
                  </FormField>
                )}
              </Card>
            ))}
          </Card>
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

      <CollapsibleSection
        title={<Hint size='xs' uppercase={false} className='font-medium text-gray-200'>Raw JSON editor</Hint>}
        variant='subtle'
        className='mt-2'
      >
        <div className='mt-1 space-y-2'>
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
      </CollapsibleSection>
    </Card>
  );
}
