'use client';

import { useMemo, useState } from 'react';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  KangurLessonCallout,
  KangurLessonCaption,
} from '@/features/kangur/ui/design/lesson-primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

type QuickCheckChoice = {
  id: string;
  label: string;
  correct?: boolean;
};

type AgenticLessonQuickCheckProps = {
  accent?: KangurAccent;
  question: string;
  choices: QuickCheckChoice[];
  correctNote?: string;
  incorrectNote?: string;
};

export default function AgenticLessonQuickCheck({
  accent = 'slate',
  question,
  choices,
  correctNote = 'Świetnie! To jest poprawna odpowiedź.',
  incorrectNote = 'Spróbuj jeszcze raz lub wróć do slajdu powyżej.',
}: AgenticLessonQuickCheckProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isCoarsePointer = useKangurCoarsePointer();

  const selectedChoice = useMemo(
    () => choices.find((choice) => choice.id === selectedId) ?? null,
    [choices, selectedId]
  );

  const isCorrect = Boolean(selectedChoice?.correct);

  const getVariant = (choice: QuickCheckChoice): 'success' | 'warning' | 'surface' => {
    if (!selectedChoice) {
      return 'surface';
    }
    if (choice.correct) {
      return 'success';
    }
    if (choice.id === selectedChoice.id) {
      return 'warning';
    }
    return 'surface';
  };

  return (
    <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
      <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>{question}</div>
      {isCoarsePointer ? (
        <KangurLessonCaption
          className='mt-2 text-left'
          data-testid='agentic-lesson-quick-check-touch-hint'
        >
          Dotknij odpowiedź, aby ją wybrać.
        </KangurLessonCaption>
      ) : null}
      <div className='mt-3 grid gap-2'>
        {choices.map((choice) => (
          <KangurButton
            key={choice.id}
            size='sm'
            variant={getVariant(choice)}
            fullWidth
            onClick={(): void => setSelectedId(choice.id)}
            className={cn(
              selectedChoice ? 'pointer-events-none' : null,
              isCoarsePointer ? 'touch-manipulation select-none min-h-[3.5rem] active:scale-[0.98]' : null
            )}
          >
            {choice.label}
          </KangurButton>
        ))}
      </div>
      {selectedChoice ? (
        <KangurLessonCaption className='mt-3 text-left'>
          {isCorrect ? correctNote : incorrectNote}
        </KangurLessonCaption>
      ) : null}
    </KangurLessonCallout>
  );
}
