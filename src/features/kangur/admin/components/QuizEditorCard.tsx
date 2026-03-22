import React from 'react';
import { createKangurLessonBlockId } from '@/features/kangur/lesson-documents';
import type {
  KangurLessonQuizBlock,
  KangurLessonQuizChoice,
} from '@/features/kangur/shared/contracts/kangur';
import { Button, FormField, Input, Textarea } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';

const LazyDocumentWysiwygEditor = React.lazy(() =>
  import('@/features/document-editor/public').then((mod) => ({
    default: mod.DocumentWysiwygEditor,
  }))
);

export function QuizEditorCard(props: {
  block: KangurLessonQuizBlock;
  onChange: (nextBlock: KangurLessonQuizBlock) => void;
}): React.JSX.Element {
  const { block, onChange } = props;

  const updateChoice = (choiceId: string, text: string): void => {
    onChange({
      ...block,
      choices: block.choices.map((c) => (c.id === choiceId ? { ...c, text } : c)),
    });
  };

  const markCorrect = (choiceId: string): void => {
    onChange({ ...block, correctChoiceId: choiceId });
  };

  const removeChoice = (choiceId: string): void => {
    if (block.choices.length <= 2) return;
    onChange({
      ...block,
      choices: block.choices.filter((c) => c.id !== choiceId),
      correctChoiceId: block.correctChoiceId === choiceId ? '' : block.correctChoiceId,
    });
  };

  const addChoice = (): void => {
    if (block.choices.length >= 4) return;
    const newChoice: KangurLessonQuizChoice = {
      id: createKangurLessonBlockId('quiz-choice'),
      text: '',
    };
    onChange({ ...block, choices: [...block.choices, newChoice] });
  };

  return (
    <div className='space-y-4'>
      <FormField label='Question'>
        <React.Suspense
          fallback={
            <div className='min-h-[220px] rounded-lg border border-border/40 bg-card/20 p-4 text-sm text-muted-foreground'>
              Loading editor...
            </div>
          }
        >
          <LazyDocumentWysiwygEditor
            value={block.question}
            onChange={(nextHtml): void => onChange({ ...block, question: nextHtml })}
          />
        </React.Suspense>
      </FormField>

      <div>
        <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Choices (2–4)
        </div>
        <div className='space-y-2'>
          {block.choices.map((choice, index) => {
            const isCorrect = choice.id === block.correctChoiceId;
            return (
              <div
                key={choice.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-2 transition',
                  isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-border/60 bg-card/30'
                )}
              >
                <button
                  type='button'
                  onClick={(): void => markCorrect(choice.id)}
                  title='Mark as correct'
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background',
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-border/60 bg-card/20 text-muted-foreground hover:border-emerald-400'
                  )}
                  aria-label={isCorrect ? 'Correct answer' : `Mark choice ${index + 1} as correct`}
                >
                  {isCorrect ? '✓' : index + 1}
                </button>
                <Input
                  value={choice.text}
                  onChange={(e): void => updateChoice(choice.id, e.target.value)}
                  placeholder={`Choice ${index + 1}`}
                  className='h-8 flex-1'
                 aria-label={`Choice ${index + 1}`} title={`Choice ${index + 1}`}/>
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  className='h-7 px-2 text-rose-500'
                  onClick={(): void => removeChoice(choice.id)}
                  disabled={block.choices.length <= 2}
                  aria-label={`Remove choice ${index + 1}`}
                >
                  ×
                </Button>
              </div>
            );
          })}
        </div>
        {block.choices.length < 4 ? (
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='mt-2 h-8 px-3'
            onClick={addChoice}
          >
            + Add choice
          </Button>
        ) : null}
      </div>

      <FormField label='Explanation (optional, shown after answer)'>
        <React.Suspense
          fallback={
            <div className='min-h-[220px] rounded-lg border border-border/40 bg-card/20 p-4 text-sm text-muted-foreground'>
              Loading editor...
            </div>
          }
        >
          <LazyDocumentWysiwygEditor
            value={block.explanation ?? ''}
            onChange={(nextHtml): void => onChange({ ...block, explanation: nextHtml })}
          />
        </React.Suspense>
      </FormField>

      <FormField label='TTS narration override (optional)'>
        <Textarea
          value={block.ttsText ?? ''}
          onChange={(e): void => onChange({ ...block, ttsText: e.target.value })}
          placeholder='Spoken text override for screen readers and narration'
          className='min-h-[72px]'
         aria-label='Spoken text override for screen readers and narration' title='Spoken text override for screen readers and narration'/>
      </FormField>
    </div>
  );
}
