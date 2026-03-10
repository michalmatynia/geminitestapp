'use client';

import React from 'react';

import type {
  PromptExploderRuleSegmentType,
  PromptExploderCaptureApplyTo,
  PromptExploderCaptureNormalize,
} from '@/shared/lib/prompt-engine/settings';
import { Input, SelectSimple, FormField } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useRuleItemContext } from '../context/RuleItemContext';
import { PROMPT_EXPLODER_SEGMENT_OPTIONS, normalizeRuleScopes } from '../rule-item-utils';

export function RuleItemExploderSettings(): React.JSX.Element | null {
  const { rule, patchRule } = useRuleItemContext();

  if (!rule) return null;

  const appliesToScopes = normalizeRuleScopes(rule.appliesToScopes);
  const hasPromptExploderScope = appliesToScopes.some(
    (scope) => scope === 'prompt_exploder' || scope === 'global'
  );

  if (!hasPromptExploderScope) return null;

  const promptExploderSegmentType = rule.promptExploderSegmentType ?? null;
  const promptExploderConfidenceBoost = Number.isFinite(rule.promptExploderConfidenceBoost)
    ? Math.min(0.5, Math.max(0, rule.promptExploderConfidenceBoost ?? 0))
    : 0;
  const promptExploderPriority = Number.isFinite(rule.promptExploderPriority)
    ? Math.min(50, Math.max(-50, Math.floor(rule.promptExploderPriority ?? 0)))
    : 0;
  const promptExploderTreatAsHeading = rule.promptExploderTreatAsHeading ?? false;
  const promptExploderCaptureTarget = rule.promptExploderCaptureTarget ?? '';
  const promptExploderCaptureGroup =
    typeof rule.promptExploderCaptureGroup === 'number' &&
    Number.isFinite(rule.promptExploderCaptureGroup)
      ? Math.max(0, Math.floor(rule.promptExploderCaptureGroup))
      : 1;
  const promptExploderCaptureApplyTo: PromptExploderCaptureApplyTo =
    rule.promptExploderCaptureApplyTo === 'line' ? 'line' : 'segment';
  const promptExploderCaptureNormalize: PromptExploderCaptureNormalize =
    rule.promptExploderCaptureNormalize === 'lower' ||
    rule.promptExploderCaptureNormalize === 'upper' ||
    rule.promptExploderCaptureNormalize === 'country' ||
    rule.promptExploderCaptureNormalize === 'day' ||
    rule.promptExploderCaptureNormalize === 'month' ||
    rule.promptExploderCaptureNormalize === 'year'
      ? rule.promptExploderCaptureNormalize
      : 'trim';
  const promptExploderCaptureOverwrite = rule.promptExploderCaptureOverwrite ?? false;

  return (
    <div className='grid gap-3 md:grid-cols-4'>
      <FormField label='Exploder Segment Type Hint' className='md:col-span-2'>
        <SelectSimple
          size='sm'
          value={promptExploderSegmentType ?? 'none'}
          onValueChange={(value: string): void => {
            if (value === 'none') {
              patchRule({ promptExploderSegmentType: null });
              return;
            }
            const valid = PROMPT_EXPLODER_SEGMENT_OPTIONS.some((option) => option.value === value);
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
    </div>
  );
}
