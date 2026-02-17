'use client';

import { Copy, GripVertical } from 'lucide-react';
import React from 'react';

import {
  Button,
  Input,
  Label,
  MultiSelect,
  
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
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
    <div
      className={cn(
        'space-y-3 rounded-lg border border-border/60 bg-card/40 p-4 transition-opacity',
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
                <div className='space-y-1 md:col-span-4'>
                  <Label className='text-[11px] text-slate-300'>Exploder Capture Target</Label>
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
                  <div className='text-[10px] text-slate-400'>
                    Optional. If set, regex captures can populate Case Resolver fields (for example:
                    `case_resolver.addresser.street`, `case_resolver.addressee.organizationName`,
                    `case_resolver.place_date.year`).
                  </div>
                </div>
                <div className='space-y-1 md:col-span-1'>
                  <Label className='text-[11px] text-slate-300'>Capture Group</Label>
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
                </div>
                <div className='space-y-1 md:col-span-1'>
                  <Label className='text-[11px] text-slate-300'>Capture Apply To</Label>
                  <Select
                    value={promptExploderCaptureApplyTo}
                    onValueChange={(value: string): void => {
                      patchRule({
                        promptExploderCaptureApplyTo: value === 'line' ? 'line' : 'segment',
                      });
                    }}
                  >
                    <SelectTrigger className='h-8'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='segment'>Whole segment</SelectItem>
                      <SelectItem value='line'>Each line</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1 md:col-span-1'>
                  <Label className='text-[11px] text-slate-300'>Capture Normalize</Label>
                  <Select
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
                  >
                    <SelectTrigger className='h-8'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='trim'>Trim</SelectItem>
                      <SelectItem value='lower'>Lower</SelectItem>
                      <SelectItem value='upper'>Upper</SelectItem>
                      <SelectItem value='country'>Country Name</SelectItem>
                      <SelectItem value='day'>Day</SelectItem>
                      <SelectItem value='month'>Month</SelectItem>
                      <SelectItem value='year'>Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1 md:col-span-1'>
                  <Label className='text-[11px] text-slate-300'>Capture Overwrite</Label>
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

          <RuleItemSimilarPatternsSection
            rule={rule}
            onAddSimilar={addSimilar}
            onUpdateSimilar={updateSimilar}
            onRemoveSimilar={removeSimilar}
          />

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
    </div>
  );
}
