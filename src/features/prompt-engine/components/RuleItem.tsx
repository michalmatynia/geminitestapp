'use client';

import { Copy, GripVertical } from 'lucide-react';
import React from 'react';

import {
  Button,
  Input,
  Label,
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

import type {
  PromptAutofixOperation,
  PromptValidationChainMode,
  PromptValidationLaunchOperator,
  PromptValidationSeverity,
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
  const launchOperator = rule?.launchOperator ?? 'contains';
  const launchValue = rule?.launchValue ?? '';
  const launchFlags = rule?.launchFlags ?? '';

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

      <div className='grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
        <div className='space-y-2'>
          <Textarea
            className='min-h-[180px] font-mono text-[12px]'
            value={draft.text}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleRuleTextChange(draft.uid, event.target.value)}
          />
          {draft.error ? (
            <div className='text-xs text-red-300'>{draft.error}</div>
          ) : null}
          {rule?.kind === 'regex' && regexStatus && !regexStatus.ok ? (
            <div className='text-xs text-red-300'>Regex error: {regexStatus.error}</div>
          ) : null}
          {rule ? (
            <div className='grid gap-2 rounded border border-slate-700/60 bg-slate-900/45 p-3 md:grid-cols-4'>
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
                      handlePatchRule(draft.uid, { sequence: null });
                      return;
                    }
                    const parsed = Number(raw);
                    if (!Number.isFinite(parsed)) return;
                    handlePatchRule(draft.uid, { sequence: Math.max(0, Math.floor(parsed)) });
                  }}
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-[11px] text-slate-300'>Chain Mode</Label>
                <Select
                  value={chainMode}
                  onValueChange={(value: string) =>
                    handlePatchRule(draft.uid, {
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
                    handlePatchRule(draft.uid, { maxExecutions: Math.min(20, Math.max(1, Math.floor(parsed))) });
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
                  onClick={() => handlePatchRule(draft.uid, { passOutputToNext: !passOutputToNext })}
                >
                  {passOutputToNext ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className='md:col-span-4'>
                <div className='grid gap-2 md:grid-cols-[120px_minmax(0,1fr)_140px_auto]'>
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
                      onClick={() => handlePatchRule(draft.uid, { launchEnabled: !launchEnabled })}
                    >
                      {launchEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[11px] text-slate-300'>Launch Operator</Label>
                    <Select
                      value={launchOperator}
                      onValueChange={(value: string) => {
                        const valid = LAUNCH_OPERATORS.some((op) => op.value === value);
                        handlePatchRule(draft.uid, { launchOperator: valid ? (value as PromptValidationLaunchOperator) : 'contains' });
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
                        handlePatchRule(draft.uid, { launchFlags: event.target.value.trim() || null })
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
                        handlePatchRule(draft.uid, { launchValue: event.target.value || null })
                      }
                      placeholder='contains/equals target'
                    />
                  </div>
                </div>
              </div>
              {rule.sequenceGroupId ? (
                <div className='md:col-span-4 text-[11px] text-cyan-100/80'>
                  Group:
                  <span className='ml-1 font-mono'>{rule.sequenceGroupLabel?.trim() || 'Sequence / Group'}</span>
                  <span className='ml-2 text-cyan-200/70'>({rule.sequenceGroupId})</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className='space-y-2 text-xs text-gray-300'>
          {rule ? (
            <>
              <div>
                <div className='text-[11px] uppercase text-gray-500'>Rule ID</div>
                <div className='break-all'>{rule.id}</div>
              </div>
              <div>
                <div className='text-[11px] uppercase text-gray-500'>Kind</div>
                <div>{rule.kind}</div>
              </div>
              {rule.kind === 'regex' ? (
                <div>
                  <div className='text-[11px] uppercase text-gray-500'>Pattern</div>
                  <div className='break-all'>/{rule.pattern}/{rule.flags}</div>
                </div>
              ) : null}
              <div>
                <div className='text-[11px] uppercase text-gray-500'>Enabled</div>
                <div>{rule.enabled ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className='text-[11px] uppercase text-gray-500'>Message</div>
                <div className='whitespace-pre-wrap'>{rule.message}</div>
              </div>
            </>
          ) : (
            <div className='text-xs text-red-300'>Invalid JSON. Fix to see summary.</div>
          )}
        </div>
      </div>

      {rule?.similar?.length ? (
        <div className='space-y-1'>
          <div className='text-[11px] uppercase text-gray-500'>Similar patterns</div>
          <div className='space-y-2'>
            {rule.similar.map((sim) => (
              <div key={`${sim.pattern}-${sim.suggestion}`} className='rounded border border-gray-700/60 bg-gray-900/40 p-2 text-xs text-gray-300'>
                <div className='font-mono'>/{sim.pattern}/{sim.flags ?? ''}</div>
                <div className='text-[11px] text-gray-400'>{sim.suggestion}</div>
                {sim.comment ? <div className='text-[11px] text-gray-500'>{sim.comment}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {rule?.autofix?.operations?.length ? (
        <div className='space-y-1'>
          <div className='text-[11px] uppercase text-gray-500'>Autofix operations</div>
          <div className='space-y-2'>
            {rule.autofix.operations.map((op, index) => (
              <div key={`${rule.id}-autofix-${index}`} className='rounded border border-gray-700/60 bg-gray-900/40 p-2 text-xs text-gray-300'>
                <div>{formatAutofixOperation(op)}</div>
                {op.comment ? <div className='text-[11px] text-gray-500'>{op.comment}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </SectionPanel>
  );
}
