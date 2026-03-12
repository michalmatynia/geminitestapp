import { Clock } from 'lucide-react';
import { useId } from 'react';

import KangurAnimatedOptionCard from '@/features/kangur/ui/components/KangurAnimatedOptionCard';
import {
  KangurIconBadge,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { DIFFICULTY_CONFIG } from '@/features/kangur/ui/services/math-questions';
import type { KangurDifficulty } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

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
      className='flex w-full flex-col items-center gap-4'
    >
      {showHeading ? (
        <KangurSectionHeading
          data-testid='difficulty-selector-heading'
          description='Ten sam uklad, tylko rosnacy poziom wyzwania.'
          descriptionId={descriptionId}
          headingAs='h3'
          headingSize='sm'
          title='Wybierz poziom trudności'
          titleId={headingId}
        />
      ) : null}
      <div
        aria-label={groupAriaLabel}
        aria-labelledby={groupLabelId}
        className='grid w-full max-w-3xl grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3'
        role='group'
      >
        {DIFFICULTIES.map((difficulty, index) => {
          const config = DIFFICULTY_CONFIG[difficulty.id];
          const isSelected = selected === difficulty.id;
          const accent = KANGUR_ACCENT_STYLES[difficulty.accent];
          return (
            <KangurAnimatedOptionCard
              key={difficulty.id}
              accent={difficulty.accent}
              animate={{ opacity: 1, y: 0 }}
              aria-label={`${config.label}. Limit ${config.timeLimit} sekund. Zakres od 1 do ${config.range}.`}
              aria-pressed={isSelected}
              buttonClassName='flex w-full flex-col items-center gap-3 kangur-card-padding-lg text-center'
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
                <Clock className='h-3 w-3' /> {config.timeLimit}s
              </KangurStatusChip>
              <span
                className={cn(
                  'text-xs',
                  isSelected ? accent.mutedText : '[color:var(--kangur-page-muted-text)]'
                )}
              >
                Zakres 1-{config.range}
              </span>
            </KangurAnimatedOptionCard>
          );
        })}
      </div>
    </section>
  );
}
