import React from 'react';

import { Button, Input, Label, Hint } from '@/shared/ui';

import type {
  PromptValidationRule,
  PromptValidationSimilarPattern,
} from '../settings';

import { useRuleItemContext } from './context/RuleItemContext';

export function RuleItemSimilarPatternsSection(): React.JSX.Element | null {
  const { rule, addSimilar, updateSimilar, removeSimilar } = useRuleItemContext();

  if (!rule) return null;

  return (
    <div className='space-y-3 rounded border border-border/40 bg-foreground/5 p-3'>
      <div className='flex items-center justify-between gap-2'>
        <Hint size='xs' uppercase className='font-semibold text-gray-300'>
          Similar Patterns
        </Hint>
        <Button type='button' variant='outline' size='sm' onClick={addSimilar}>
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
                updateSimilar(index, {
                  flags: event.target.value.trim() || undefined,
                });
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
  );
}
