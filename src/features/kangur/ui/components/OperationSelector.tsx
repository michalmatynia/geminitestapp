import { motion } from 'framer-motion';
import { useId } from 'react';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';
import {
  KangurIconBadge,
  KangurOptionCardButton,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';
import { useKangurOperationSelectorState } from '@/features/kangur/ui/hooks/useKangurOperationSelectorState';
import type { KangurDifficulty, KangurOperation } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

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
        description='Kazda kategoria ma ten sam uklad. Kolor tylko podpowiada temat.'
        descriptionId={descriptionId}
        headingAs='h3'
        headingSize='md'
        title='Wybierz swoje wyzwanie'
        titleId={headingId}
      />
      <div
        aria-labelledby={headingId}
        className='grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'
        role='list'
      >
        {operations.map((operation, index) => {
          const accent = KANGUR_ACCENT_STYLES[operation.accent];
          const descriptionElementId = `operation-card-description-${operation.id}`;
          const statusElementId = `operation-card-status-${operation.id}`;
          const priorityElementId = operation.hasPriorityAssignment
            ? `operation-card-priority-${operation.id}`
            : null;
          const recommendedElementId = operation.isRecommended
            ? `operation-card-recommendation-${operation.id}`
            : null;

          return (
            <motion.div
              key={operation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.95 }}
              role='listitem'
            >
              <KangurOptionCardButton
                accent={operation.accent}
                className='flex min-h-[180px] flex-col gap-4 rounded-[30px] p-5'
                data-testid={`operation-card-${operation.id}`}
                emphasis={operation.hasPriorityAssignment || operation.isRecommended ? 'accent' : 'neutral'}
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
                onClick={operation.select}
              >
                {operation.hasPriorityAssignment ? (
                  <KangurStatusChip
                    accent='rose'
                    className='absolute right-3 top-3 text-[10px] uppercase tracking-[0.16em]'
                    id={priorityElementId ?? undefined}
                    size='sm'
                  >
                    {operation.priorityLabel}
                  </KangurStatusChip>
                ) : null}
                <div className='flex items-start justify-between gap-3'>
                  <KangurIconBadge
                    accent={operation.accent}
                    data-testid={`operation-icon-${operation.id}`}
                    size='xl'
                  >
                    {operation.emoji}
                  </KangurIconBadge>
                  <div className='flex flex-col items-end gap-2'>
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
              </KangurOptionCardButton>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
