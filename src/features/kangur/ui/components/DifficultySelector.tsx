'use client';

import { Clock } from 'lucide-react';
import { useId } from 'react';
import { DIFFICULTY_CONFIG } from '@kangur/core';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import {
  KangurIconBadge,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KangurLessonCaption } from '@/features/kangur/ui/design/lesson-primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type { KangurDifficulty } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type DifficultySelectorProps = {
  selected: KangurDifficulty;
  onSelect: (difficulty: KangurDifficulty) => void;
  showHeading?: boolean;
};

const DIFFICULTIES: Array<{
  id: KangurDifficulty;
  accent: KangurAccent;
}> = [
  { id: 'easy', accent: 'emerald' },
  { id: 'medium', accent: 'amber' },
  { id: 'hard', accent: 'rose' },
];

export default function DifficultySelector({
  selected,
  onSelect,
  showHeading = true,
}: DifficultySelectorProps): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const headingId = useId();
  const descriptionId = useId();
  const groupLabelId = showHeading ? headingId : undefined;
  const groupAriaLabel = showHeading ? undefined : 'Poziom trudności';
  const handleDifficultySelect = (difficulty: KangurDifficulty): void => {
    onSelect(difficulty);
  };

  return (
    <section
      aria-describedby={showHeading ? descriptionId : undefined}
      aria-labelledby={showHeading ? headingId : undefined}
      className={cn('flex w-full flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}
    >
      {showHeading ? (
        <KangurSectionHeading
          data-testid='difficulty-selector-heading'
          description='Ten sam układ, tylko rosnący poziom wyzwania.'
          descriptionId={descriptionId}
          headingAs='h3'
          headingSize='sm'
          title='Wybierz poziom trudności'
          titleId={headingId}
        />
      ) : null}
      {isCoarsePointer ? (
        <KangurLessonCaption className='text-center' data-testid='difficulty-selector-touch-hint'>
          Dotknij kartę z poziomem, który chcesz uruchomić.
        </KangurLessonCaption>
      ) : null}
      <div
        aria-label={groupAriaLabel}
        aria-labelledby={groupLabelId}
        className='grid w-full max-w-3xl grid-cols-1 kangur-panel-gap sm:grid-cols-2 lg:grid-cols-3'
        role='group'
      >
        {DIFFICULTIES.map((difficulty, index) => {
          const config = DIFFICULTY_CONFIG[difficulty.id];
          const isSelected = selected === difficulty.id;
          const accent = KANGUR_ACCENT_STYLES[difficulty.accent];
          return (
            <KangurAnswerChoiceCard
              key={difficulty.id}
              accent={difficulty.accent}
              animate={{ opacity: 1, y: 0 }}
              aria-label={`${config.label}. Limit ${config.timeLimit} sekund. Zakres od 1 do ${config.range}.`}
              aria-pressed={isSelected}
              buttonClassName={cn(
                'flex w-full flex-col items-center kangur-panel-gap kangur-card-padding-lg text-center',
                isCoarsePointer ? 'min-h-[10.5rem] touch-manipulation select-none active:scale-[0.98]' : null
              )}
              data-testid={`difficulty-option-${difficulty.id}`}
              emphasis={isSelected ? 'accent' : 'neutral'}
              initial={{ opacity: 0, y: 10 }}
              transition={{ delay: index * 0.07 }}
              onClick={() => handleDifficultySelect(difficulty.id)}
              type='button'
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              wrapperClassName='w-full'
            >
              <KangurIconBadge
                accent={difficulty.accent}
                data-testid={`difficulty-icon-${difficulty.id}`}
                size='xl'
              >
                {config.emoji}
              </KangurIconBadge>
              <span
                className={cn(
                  'text-lg font-extrabold',
                  isSelected ? accent.activeText : '[color:var(--kangur-page-text)]'
                )}
              >
                {config.label}
              </span>
              <KangurStatusChip accent={difficulty.accent} className='gap-1' size='sm'>
                <Clock aria-hidden='true' className='h-3 w-3' /> {config.timeLimit}s
              </KangurStatusChip>
              <span
                className={cn(
                  'text-xs',
                  isSelected ? accent.mutedText : '[color:var(--kangur-page-muted-text)]'
                )}
              >
                Zakres 1-{config.range}
              </span>
            </KangurAnswerChoiceCard>
          );
        })}
      </div>
    </section>
  );
}
