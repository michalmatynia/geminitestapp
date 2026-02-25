'use client';

import React from 'react';
import {
  Input,
  MultiSelect,
  SelectSimple,
  FormField,
  Card,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useRuleItemContext } from '../context/RuleItemContext';
import {
  LAUNCH_OPERATORS,
  SCOPE_OPTIONS,
  normalizeRuleScopes,
} from '../rule-item-utils';
import type { 
  PromptValidationChainMode, 
  PromptValidationLaunchScopeBehavior, 
  PromptValidationLaunchOperator, 
  PromptValidationScope 
} from '../../settings';

export function RuleItemExecutionSettings(): React.JSX.Element | null {
  const { rule, patchRule } = useRuleItemContext();

  if (!rule) return null;

  const sequenceValue =
    typeof rule.sequence === 'number' && Number.isFinite(rule.sequence)
      ? String(Math.max(0, Math.floor(rule.sequence)))
      : '';
  const chainMode: PromptValidationChainMode = rule.chainMode ?? 'continue';
  const maxExecutions =
    typeof rule.maxExecutions === 'number' && Number.isFinite(rule.maxExecutions)
      ? Math.max(1, Math.floor(rule.maxExecutions))
      : 1;
  const passOutputToNext = rule.passOutputToNext ?? true;
  const launchEnabled = rule.launchEnabled ?? false;
  const launchAppliesToScopes = normalizeRuleScopes(rule.launchAppliesToScopes);
  const launchScopeBehavior: PromptValidationLaunchScopeBehavior =
    rule.launchScopeBehavior === 'bypass' ? 'bypass' : 'gate';
  const launchOperator = rule.launchOperator ?? 'contains';
  const launchValue = rule.launchValue ?? '';
  const launchFlags = rule.launchFlags ?? '';

  return (
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
  );
}
