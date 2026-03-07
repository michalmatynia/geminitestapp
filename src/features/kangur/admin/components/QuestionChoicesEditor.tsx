import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button, Input } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { KangurTestChoice } from '@/shared/contracts/kangur-tests';
import { nextChoiceLabel } from '../../test-questions';
import { moveItem } from '../utils';

type Props = {
  choices: KangurTestChoice[];
  correctChoiceLabel: string;
  onChange: (choices: KangurTestChoice[]) => void;
  onCorrectChange: (label: string) => void;
};

export function QuestionChoicesEditor({
  choices,
  correctChoiceLabel,
  onChange,
  onCorrectChange,
}: Props): React.JSX.Element {
  const addChoice = (): void => {
    const label = nextChoiceLabel(choices.map((c) => c.label));
    onChange([...choices, { label, text: '' }]);
  };

  const removeChoice = (index: number): void => {
    const next = choices.filter((_, i) => i !== index);
    onChange(next);
    if (choices[index]?.label === correctChoiceLabel && next.length > 0) {
      onCorrectChange(next[0]?.label ?? '');
    }
  };

  const updateText = (index: number, text: string): void => {
    onChange(choices.map((c, i) => (i === index ? { ...c, text } : c)));
  };

  const updateLabel = (index: number, label: string): void => {
    const old = choices[index]?.label ?? '';
    const next = choices.map((c, i) => (i === index ? { ...c, label } : c));
    onChange(next);
    if (correctChoiceLabel === old) onCorrectChange(label);
  };

  const move = (from: number, to: number): void => {
    onChange(moveItem(choices, from, to));
  };

  const autoRelabel = (): void => {
    const labels = 'ABCDEFGHIJ'.split('');
    const next = choices.map((c, i) => ({ ...c, label: labels[i] ?? String.fromCharCode(65 + i) }));
    onChange(next);
    const oldCorrectIndex = choices.findIndex((c) => c.label === correctChoiceLabel);
    if (oldCorrectIndex >= 0) {
      onCorrectChange(next[oldCorrectIndex]?.label ?? correctChoiceLabel);
    }
  };

  return (
    <div className='space-y-2'>
      <div className='mb-1 flex items-center justify-between gap-2'>
        <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Choices
        </div>
        <Button type='button' size='sm' variant='outline' className='h-7 px-2 text-[11px]' onClick={autoRelabel}>
          Auto-label A–E
        </Button>
      </div>

      {choices.map((choice, index) => {
        const isCorrect = choice.label === correctChoiceLabel;
        return (
          <div
            key={index}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2',
              isCorrect ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-border/50 bg-card/30'
            )}
          >
            <button
              type='button'
              title={isCorrect ? 'Correct answer' : 'Mark as correct'}
              onClick={(): void => onCorrectChange(choice.label)}
              className={cn(
                'size-5 shrink-0 rounded-full border-2 transition-colors',
                isCorrect
                  ? 'border-emerald-400 bg-emerald-400'
                  : 'border-gray-500 bg-transparent hover:border-emerald-400/60'
              )}
              aria-label={isCorrect ? 'Correct answer' : `Mark ${choice.label} as correct`}
            />

            <Input
              value={choice.label}
              onChange={(e): void => updateLabel(index, e.target.value)}
              className='h-7 w-10 shrink-0 px-1 text-center text-sm font-bold'
              maxLength={4}
              aria-label='Choice label'
            />

            <Input
              value={choice.text}
              onChange={(e): void => updateText(index, e.target.value)}
              placeholder={`Choice ${choice.label} text`}
              className='h-7 flex-1 text-sm'
            />

            <div className='flex shrink-0 items-center gap-0.5'>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                className='h-6 px-1'
                onClick={(): void => move(index, index - 1)}
                disabled={index === 0}
                aria-label='Move up'
              >
                <ArrowUp className='size-3' />
              </Button>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                className='h-6 px-1'
                onClick={(): void => move(index, index + 1)}
                disabled={index === choices.length - 1}
                aria-label='Move down'
              >
                <ArrowDown className='size-3' />
              </Button>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                className='h-6 px-1 text-rose-400 hover:text-rose-300'
                onClick={(): void => removeChoice(index)}
                disabled={choices.length <= 1}
                aria-label='Delete choice'
              >
                <Trash2 className='size-3' />
              </Button>
            </div>
          </div>
        );
      })}

      {choices.length < 10 ? (
        <Button type='button' size='sm' variant='outline' className='h-8 w-full' onClick={addChoice}>
          <Plus className='mr-1 size-3.5' />
          Add choice
        </Button>
      ) : null}
    </div>
  );
}
