import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button, FormField, Input, Textarea } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { nextChoiceLabel } from '../../test-questions';
import { useKangurTestQuestionEditorContext } from '../context/KangurTestQuestionEditorContext';
import { moveItem } from '../utils';
import { SvgCodeEditor } from './SvgCodeEditor';

export function QuestionChoicesEditor(): React.JSX.Element {
  const { choices, correctChoiceLabel, setChoices, setCorrectChoiceLabel, updateFormData } =
    useKangurTestQuestionEditorContext();

  const addChoice = (): void => {
    const label = nextChoiceLabel(choices.map((c) => c.label));
    setChoices([...choices, { label, text: '', svgContent: '' }]);
  };

  const removeChoice = (index: number): void => {
    const next = choices.filter((_, i) => i !== index);
    if (choices[index]?.label === correctChoiceLabel && next.length > 0) {
      updateFormData({
        choices: next,
        correctChoiceLabel: next[0]?.label ?? '',
      });
      return;
    }
    setChoices(next);
  };

  const updateText = (index: number, text: string): void => {
    setChoices(choices.map((c, i) => (i === index ? { ...c, text } : c)));
  };

  const updateDescription = (index: number, description: string): void => {
    setChoices(
      choices.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, description } : choice
      )
    );
  };

  const updateSvgContent = (index: number, svgContent: string): void => {
    setChoices(
      choices.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, svgContent } : choice
      )
    );
  };

  const updateLabel = (index: number, label: string): void => {
    const old = choices[index]?.label ?? '';
    const next = choices.map((c, i) => (i === index ? { ...c, label } : c));
    if (correctChoiceLabel === old) {
      updateFormData({
        choices: next,
        correctChoiceLabel: label,
      });
      return;
    }
    setChoices(next);
  };

  const move = (from: number, to: number): void => {
    setChoices(moveItem(choices, from, to));
  };

  const autoRelabel = (): void => {
    const labels = 'ABCDEFGHIJ'.split('');
    const next = choices.map((c, i) => ({ ...c, label: labels[i] ?? String.fromCharCode(65 + i) }));
    const oldCorrectIndex = choices.findIndex((c) => c.label === correctChoiceLabel);
    if (oldCorrectIndex >= 0) {
      updateFormData({
        choices: next,
        correctChoiceLabel: next[oldCorrectIndex]?.label ?? correctChoiceLabel,
      });
      return;
    }
    setChoices(next);
  };

  return (
    <div className='space-y-2'>
      <div className='mb-1 flex items-center justify-between gap-2'>
        <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Choices
        </div>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='h-7 px-2 text-[11px]'
          onClick={autoRelabel}
        >
          Auto-label A–E
        </Button>
      </div>

      {choices.map((choice, index) => {
        const isCorrect = choice.label === correctChoiceLabel;
        const hasRichDetails = Boolean(choice.description?.trim()) || Boolean(choice.svgContent?.trim());
        return (
          <div
            key={index}
            className={cn(
              'rounded-xl border px-3 py-2',
              isCorrect ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-border/50 bg-card/30'
            )}
          >
            <div className='flex items-center gap-2'>
              <button
                type='button'
                title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                onClick={(): void => setCorrectChoiceLabel(choice.label)}
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

            <details className='mt-3 rounded-lg border border-border/40 bg-background/30 px-3 py-2' open={hasRichDetails}>
              <summary className='cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                Rich choice details
              </summary>
              <div className='mt-3 space-y-3'>
                <FormField label='Choice note / visual description'>
                  <Textarea
                    value={choice.description ?? ''}
                    onChange={(event): void => updateDescription(index, event.target.value)}
                    placeholder='Optional learner-facing note or visual description'
                    className='min-h-[72px] text-sm'
                  />
                </FormField>
                <div className='space-y-1'>
                  <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                    Choice SVG
                  </div>
                  <SvgCodeEditor
                    value={choice.svgContent ?? ''}
                    onChange={(next): void => updateSvgContent(index, next)}
                    previewSize='sm'
                    placeholder={`<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">\n  <!-- optional SVG for choice ${choice.label} -->\n</svg>`}
                  />
                </div>
              </div>
            </details>
          </div>
        );
      })}

      {choices.length < 10 ? (
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='h-8 w-full'
          onClick={addChoice}
        >
          <Plus className='mr-1 size-3.5' />
          Add choice
        </Button>
      ) : null}
    </div>
  );
}
