'use client';

import React from 'react';

import { Badge, SelectSimple, Textarea } from '@/shared/ui';
import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';
import type { QuestionFormData } from '../test-questions';
import { hasIllustration } from '../test-questions';
import { QuestionChoicesEditor } from './components/QuestionChoicesEditor';
import { QuestionIllustrationEditor } from './components/QuestionIllustrationEditor';
import { KangurTestQuestionRenderer } from '../ui/components/KangurTestQuestionRenderer';
import {
  KangurTestQuestionEditorProvider,
  useKangurTestQuestionEditorContext,
} from './context/KangurTestQuestionEditorContext';
import { useOptionalKangurQuestionsManagerRuntimeContext } from './context/KangurQuestionsManagerRuntimeContext';

const POINT_VALUE_OPTIONS = [
  { value: '1', label: '1 pt' },
  { value: '2', label: '2 pts' },
  { value: '3', label: '3 pts' },
  { value: '4', label: '4 pts' },
  { value: '5', label: '5 pts' },
];

type Props = {
  formData: QuestionFormData;
  onChange: (next: QuestionFormData) => void;
  suiteTitle?: string;
};

export function KangurTestQuestionEditor(props: Props): React.JSX.Element {
  const runtime = useOptionalKangurQuestionsManagerRuntimeContext();
  const resolvedSuiteTitle = props.suiteTitle ?? runtime?.suite.title;

  return (
    <KangurTestQuestionEditorProvider {...props} suiteTitle={resolvedSuiteTitle}>
      <KangurTestQuestionEditorContent />
    </KangurTestQuestionEditorProvider>
  );
}

function KangurTestQuestionEditorContent(): React.JSX.Element {
  const { formData, suiteTitle, updateFormData } = useKangurTestQuestionEditorContext();

  const previewQuestion: KangurTestQuestion = {
    id: 'preview',
    suiteId: '',
    sortOrder: 0,
    prompt: formData.prompt,
    choices: formData.choices,
    correctChoiceLabel: formData.correctChoiceLabel,
    pointValue: formData.pointValue,
    explanation: formData.explanation || undefined,
    illustration: formData.illustration,
  };

  return (
    <div className='grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]'>
      {/* ── Editor column ───────────────────────────────────────────────── */}
      <div className='space-y-5'>
        {/* Metadata strip */}
        <div className='flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card/30 px-4 py-2'>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-muted-foreground'>Points:</span>
            <div className='w-24'>
              <SelectSimple
                size='sm'
                value={String(formData.pointValue)}
                onValueChange={(v): void => {
                  const n = parseInt(v, 10);
                  if (Number.isFinite(n)) updateFormData({ pointValue: n });
                }}
                options={POINT_VALUE_OPTIONS}
                triggerClassName='h-7'
              />
            </div>
          </div>
          {suiteTitle ? (
            <Badge variant='outline' className='text-[10px]'>
              {suiteTitle}
            </Badge>
          ) : null}
          {hasIllustration(previewQuestion) ? (
            <Badge variant='outline' className='border-violet-400/40 text-[10px] text-violet-300'>
              Has illustration
            </Badge>
          ) : null}
        </div>

        {/* Prompt */}
        <div className='space-y-1'>
          <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Question prompt
          </div>
          <Textarea
            value={formData.prompt}
            onChange={(e): void => updateFormData({ prompt: e.target.value })}
            placeholder='Enter the question text. You can use $$formula$$ markers for math expressions.'
            className='min-h-[100px]'
          />
        </div>

        {/* Choices */}
        <QuestionChoicesEditor />

        {/* Illustration */}
        <div className='space-y-2'>
          <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Illustration
          </div>
          <QuestionIllustrationEditor />
        </div>

        {/* Explanation */}
        <div className='space-y-1'>
          <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Explanation (shown after answer)
          </div>
          <Textarea
            value={formData.explanation}
            onChange={(e): void => updateFormData({ explanation: e.target.value })}
            placeholder='Step-by-step explanation of why the correct answer is correct.'
            className='min-h-[80px]'
          />
        </div>
      </div>

      {/* ── Preview column ──────────────────────────────────────────────── */}
      <div className='sticky top-4 hidden h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/20 xl:flex'>
        <div className='flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-3 backdrop-blur-md'>
          <div className='text-sm font-semibold text-white'>Preview</div>
          <div className='text-xs text-muted-foreground'>Live learner view</div>
        </div>
        <div className='flex-1 overflow-y-auto p-4 scrollbar-thin'>
          <div className='mx-auto max-w-xl rounded-xl border border-border/40 bg-white p-4 shadow-sm'>
            <KangurTestQuestionRenderer
              question={previewQuestion}
              selectedLabel={null}
              onSelect={(): void => {}}
              showAnswer={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
