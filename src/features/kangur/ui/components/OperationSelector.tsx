import { useId } from 'react';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import {
  KangurIconBadge,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';
import { useKangurOperationSelectorState } from '@/features/kangur/ui/hooks/useKangurOperationSelectorState';
import type { KangurDifficulty, KangurOperation } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

export type OperationSelectorProps = {
  onSelect: (operation: KangurOperation, difficulty: KangurDifficulty) => void;
  priorityAssignmentsByOperation?: Partial<
    Record<KangurOperation, KangurAssignmentSnapshot & { target: { type: 'practice' } }>
  >;
  recommendedLabel?: string;
  recommendedOperation?: KangurOperation | null;
};

export default function OperationSelector({
  onSelect,
  priorityAssignmentsByOperation = {},
  recommendedLabel,
  recommendedOperation,
}: OperationSelectorProps): React.JSX.Element {
  const { difficulty, operations, setDifficulty } = useKangurOperationSelectorState({
    onSelect,
    priorityAssignmentsByOperation,
    recommendedLabel,
    recommendedOperation,
  });
  const headingId = useId();
  const descriptionId = useId();

  return (
    <section
      aria-describedby={descriptionId}
      aria-labelledby={headingId}
      className='flex w-full max-w-3xl flex-col items-center gap-6'
    >
      <DifficultySelector selected={difficulty} onSelect={setDifficulty} showHeading={false} />
      <KangurSectionHeading
        accent='indigo'
        data-testid='operation-selector-heading'
        description='Każda kategoria ma ten sam układ. Kolor tylko podpowiada temat.'
        descriptionId={descriptionId}
        headingAs='h3'
        headingSize='md'
        title='Wybierz swoje wyzwanie'
        titleId={headingId}
      />
      <div
        aria-labelledby={headingId}
        className='grid w-full grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-3'
        role='list'
      >
        {operations.map((operation, index) => {
          const accent = KANGUR_ACCENT_STYLES[operation.accent];
          const descriptionElementId = `operation-card-description-${operation.id}`;
          const statusElementId = `operation-card-status-${operation.id}`;
          const priorityElementId = operation.priority ? `operation-card-priority-${operation.id}` : null;
          const recommendedElementId = operation.isRecommended
            ? `operation-card-recommendation-${operation.id}`
            : null;

          return (
            <KangurAnswerChoiceCard
              key={operation.id}
              accent={operation.accent}
              animate={{ opacity: 1, y: 0 }}
              aria-describedby={
                [
                  statusElementId,
                  priorityElementId,
                  recommendedElementId,
                  descriptionElementId,
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              buttonClassName='flex min-h-[180px] flex-col gap-4 rounded-[30px] p-5'
              data-testid={`operation-card-${operation.id}`}
              emphasis={operation.hasPriorityAssignment || operation.isRecommended ? 'accent' : 'neutral'}
              initial={{ opacity: 0, y: 20 }}
              onClick={operation.select}
              wrapperRole='listitem'
              transition={{ delay: index * 0.08 }}
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.95 }}
            >
              {operation.priority ? (
                <KangurAssignmentPriorityChip
                  accent='rose'
                  className='self-start text-[10px] uppercase tracking-[0.16em] sm:absolute sm:right-3 sm:top-3'
                  id={priorityElementId ?? undefined}
                  priority={operation.priority}
                  size='sm'
                />
              ) : null}
              <div className='flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between'>
                <KangurIconBadge
                  accent={operation.accent}
                  data-testid={`operation-icon-${operation.id}`}
                  size='xl'
                >
                  {operation.emoji}
                </KangurIconBadge>
                <div className='flex w-full flex-row flex-wrap items-start gap-2 min-[420px]:w-auto min-[420px]:flex-col min-[420px]:items-end'>
                  <KangurStatusChip
                    accent={operation.hasPriorityAssignment ? operation.accent : 'slate'}
                    className='text-[11px] font-semibold'
                    id={statusElementId}
                    size='sm'
                  >
                    {operation.statusLabel}
                  </KangurStatusChip>
                  {operation.isRecommended ? (
                    <KangurStatusChip
                      accent={operation.accent}
                      className='text-[11px] font-semibold'
                      data-testid={`operation-card-recommendation-${operation.id}`}
                      id={recommendedElementId ?? undefined}
                      size='sm'
                    >
                      {operation.recommendedLabel}
                    </KangurStatusChip>
                  ) : null}
                </div>
              </div>
              <div className='space-y-1 text-left'>
                <span className='block text-lg font-extrabold [color:var(--kangur-page-text)]'>
                  {operation.label}
                </span>
                <span
                  id={descriptionElementId}
                  className='block text-sm [color:var(--kangur-page-muted-text)]'
                >
                  {operation.description}
                </span>
              </div>
              <span className={cn('mt-auto text-sm font-semibold', accent.activeText)}>
                {operation.actionLabel}
              </span>
            </KangurAnswerChoiceCard>
          );
        })}
      </div>
    </section>
  );
}
