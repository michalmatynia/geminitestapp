import { useState, useMemo } from 'react';
import type { KangurTestQuestion } from '@/features/kangur/shared/contracts/kangur-tests';
import type { QuestionFormData } from '../test-suites/questions';

export function useQuestionEditorController(formData: QuestionFormData, locale: string) {
  const [previewMode, setPreviewMode] = useState<'learner' | 'correct' | 'incorrect'>('learner');
  const [previewFrame, setPreviewFrame] = useState<'desktop' | 'compact'>('desktop');

  const previewQuestion = useMemo((): KangurTestQuestion => ({
    id: 'preview',
    suiteId: '',
    sortOrder: 0,
    prompt: formData.prompt,
    choices: formData.choices,
    correctChoiceLabel: formData.correctChoiceLabel,
    pointValue: formData.pointValue,
    explanation: formData.explanation || undefined,
    illustration: formData.illustration,
    stemDocument: formData.stemDocument ?? undefined,
    explanationDocument: formData.explanationDocument ?? undefined,
    hintDocument: formData.hintDocument ?? undefined,
    presentation: formData.presentation,
    editorial: formData.editorial,
  }), [formData]);

  const previewSelectedLabel = useMemo(() => 
    previewMode === 'learner' ? null : 
    previewMode === 'correct' ? formData.correctChoiceLabel : 
    formData.choices.find((c) => c.label !== formData.correctChoiceLabel)?.label ?? formData.correctChoiceLabel
  , [previewMode, formData.choices, formData.correctChoiceLabel]);

  return {
    previewMode, setPreviewMode,
    previewFrame, setPreviewFrame,
    previewQuestion,
    previewSelectedLabel,
    previewShowAnswer: previewMode !== 'learner',
  };
}
