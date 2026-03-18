import React from 'react';

import type { PromptAutofixOperation } from '@/shared/lib/prompt-engine/settings';
import { Button, Card, FormField, Hint, Input, StatusBadge } from '@/shared/ui';

import { useRuleItemContext } from './context/RuleItemContext';
import { formatAutofixOperation } from './rule-item-utils';

export function RuleItemAutofixSettings(): React.JSX.Element | null {
  const { rule, patchRule, addAutofixOperation, updateAutofixOperation, removeAutofixOperation } =
    useRuleItemContext();

  if (!rule) return null;

  return (
    <Card
      variant='subtle-compact'
      padding='sm'
      className='space-y-3 border-border/40 bg-foreground/5'
    >
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
            aria-label={rule.autofix?.enabled !== false ? 'Disable autofix' : 'Enable autofix'}
            title='Toggle autofix'
            aria-pressed={rule.autofix?.enabled !== false}
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
      {(rule.autofix?.operations ?? []).map((op: PromptAutofixOperation, index: number) => (
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
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    updateAutofixOperation(index, {
                      ...op,
                      pattern: event.target.value,
                    });
                  }}
                  aria-label='Pattern'
                  title='Pattern'
                />
              </FormField>
              <FormField label='Flags'>
                <Input
                  className='h-8 font-mono'
                  value={op.flags ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    updateAutofixOperation(index, {
                      ...op,
                      flags: event.target.value.trim() || undefined,
                    });
                  }}
                  aria-label='Flags'
                  title='Flags'
                />
              </FormField>
              <FormField label='Replacement'>
                <Input
                  className='h-8'
                  value={op.replacement}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    updateAutofixOperation(index, {
                      ...op,
                      replacement: event.target.value,
                    });
                  }}
                  aria-label='Replacement'
                  title='Replacement'
                />
              </FormField>
              <FormField label='Comment' className='md:col-span-4'>
                <Input
                  className='h-8'
                  value={op.comment ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    updateAutofixOperation(index, {
                      ...op,
                      comment: event.target.value.trim() || null,
                    });
                  }}
                  aria-label='Comment'
                  title='Comment'
                />
              </FormField>
            </div>
          ) : (
            <FormField label='Comment'>
              <Input
                className='h-8'
                value={op.comment ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  updateAutofixOperation(index, {
                    ...op,
                    comment: event.target.value.trim() || null,
                  });
                }}
                aria-label='Comment'
                title='Comment'
              />
            </FormField>
          )}
        </Card>
      ))}
    </Card>
  );
}
