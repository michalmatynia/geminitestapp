import React from 'react';

import type { PromptValidationRule, PromptValidationScope } from '@/shared/lib/prompt-engine/settings';
import { FormField, Input, MultiSelect, SelectSimple, Textarea } from '@/shared/ui';

import {
  compileRegex,
  normalizeRuleKind,
  normalizeRuleScopes,
  SCOPE_OPTIONS,
} from './rule-item-utils';
import { useRuleItemContext } from './context/RuleItemContext';
import { usePromptEngineActions } from '../context/PromptEngineContext';
import { RULE_KIND_OPTIONS, RULE_SEVERITY_OPTIONS } from './RuleItem.constants';

export function RuleItemBasicSettings(): React.JSX.Element | null {
  const { draft, rule, patchRule } = useRuleItemContext();
  const { handleRuleTextChange } = usePromptEngineActions();

  if (!rule) return null;

  const regexStatus = rule.kind === 'regex' ? compileRegex(rule.pattern, rule.flags) : null;
  const appliesToScopes = normalizeRuleScopes(rule.appliesToScopes);

  return (
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
          options={RULE_KIND_OPTIONS}
          ariaLabel='Kind'
          title='Kind'
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
          options={RULE_SEVERITY_OPTIONS}
          ariaLabel='Severity'
          title='Severity'
        />
      </FormField>
      <FormField label='Rule ID' className='md:col-span-2'>
        <Input
          className='h-8'
          value={rule.id}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            patchRule({ id: event.target.value });
          }}
          aria-label='Rule ID'
          title='Rule ID'
        />
      </FormField>
      <FormField label='Title' className='md:col-span-2'>
        <Input
          className='h-8'
          value={rule.title}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            patchRule({ title: event.target.value });
          }}
          aria-label='Title'
          title='Title'
        />
      </FormField>
      <FormField label='Description' className='md:col-span-2'>
        <Input
          className='h-8'
          value={rule.description ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            patchRule({ description: event.target.value.trim() || null });
          }}
          aria-label='Description'
          title='Description'
        />
      </FormField>
      <FormField label='Message' className='md:col-span-4'>
        <Textarea
          className='min-h-[72px] text-[12px]'
          value={rule.message}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            patchRule({ message: event.target.value });
          }}
          aria-label='Message'
          title='Message'
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
              aria-label='Pattern'
              title='Pattern'
            />
          </FormField>
          <FormField label='Flags'>
            <Input
              className='h-8 font-mono'
              value={rule.flags}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                patchRule({ flags: event.target.value });
              }}
              aria-label='Flags'
              title='Flags'
            />
          </FormField>
        </>
      ) : null}
      {rule.kind === 'regex' && regexStatus && !regexStatus.ok ? (
        <div className='md:col-span-4 text-xs text-red-300'>Regex error: {regexStatus.error}</div>
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
    </div>
  );
}
