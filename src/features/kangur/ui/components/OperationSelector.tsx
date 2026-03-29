'use client';

import { useLocale } from 'next-intl';
import { useId, useMemo } from 'react';

import type { KangurAssignmentSnapshot } from '@kangur/platform';
import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import { KangurSubjectGroupSection } from '@/features/kangur/ui/components/KangurSubjectGroupSection';
import { getKangurSubjectGroups } from '@/features/kangur/ui/constants/subject-groups';
import {
  KangurIconBadge,
  KangurPanelRow,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_START_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
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

type OperationSelectorState = ReturnType<typeof useKangurOperationSelectorState>;
type OperationSelectorEntry = OperationSelectorState['operations'][number];

const resolveOperationCardAriaDescribedBy = (input: {
  descriptionElementId: string;
  priorityElementId: string | null;
  recommendedElementId: string | null;
  statusElementId: string;
}): string =>
  [
    input.statusElementId,
    input.priorityElementId,
    input.recommendedElementId,
    input.descriptionElementId,
  ]
    .filter(Boolean)
    .join(' ');

const resolveOperationCardButtonClassName = (isCoarsePointer: boolean): string =>
  cn(
    'flex min-h-[160px] flex-col kangur-panel-gap rounded-[26px] p-4 sm:min-h-[180px] sm:rounded-[30px] sm:p-5',
    isCoarsePointer && 'min-h-[176px] px-5 py-5 active:scale-[0.98] sm:min-h-[196px]'
  );

const resolveOperationCardEmphasis = (
  operation: OperationSelectorEntry
): React.ComponentProps<typeof KangurAnswerChoiceCard>['emphasis'] =>
  operation.hasPriorityAssignment || operation.isRecommended ? 'accent' : 'neutral';

function OperationSelectorPriorityChip(props: {
  operation: OperationSelectorEntry;
  priorityElementId: string | null;
}): React.JSX.Element | null {
  if (!props.operation.priority) {
    return null;
  }

  return (
    <KangurAssignmentPriorityChip
      accent='rose'
      className='self-start text-[10px] uppercase tracking-[0.16em] sm:absolute sm:right-3 sm:top-3'
      id={props.priorityElementId ?? undefined}
      priority={props.operation.priority}
      size='sm'
    />
  );
}

function OperationSelectorRecommendationChip(props: {
  operation: OperationSelectorEntry;
  recommendedElementId: string | null;
}): React.JSX.Element | null {
  if (!props.operation.isRecommended) {
    return null;
  }

  return (
    <KangurStatusChip
      accent={props.operation.accent}
      className='text-[11px] font-semibold'
      data-testid={`operation-card-recommendation-${props.operation.id}`}
      id={props.recommendedElementId ?? undefined}
      size='sm'
    >
      {props.operation.recommendedLabel}
    </KangurStatusChip>
  );
}

function OperationSelectorCard(props: {
  animationIndex: number;
  isCoarsePointer: boolean;
  operation: OperationSelectorEntry;
}): React.JSX.Element {
  const { operation } = props;
  const accent = KANGUR_ACCENT_STYLES[operation.accent];
  const descriptionElementId = `operation-card-description-${operation.id}`;
  const statusElementId = `operation-card-status-${operation.id}`;
  const priorityElementId = operation.priority ? `operation-card-priority-${operation.id}` : null;
  const recommendedElementId = operation.isRecommended
    ? `operation-card-recommendation-${operation.id}`
    : null;

  return (
    <KangurAnswerChoiceCard
      accent={operation.accent}
      animate={{ opacity: 1, y: 0 }}
      aria-describedby={resolveOperationCardAriaDescribedBy({
        statusElementId,
        priorityElementId,
        recommendedElementId,
        descriptionElementId,
      })}
      buttonClassName={resolveOperationCardButtonClassName(props.isCoarsePointer)}
      data-testid={`operation-card-${operation.id}`}
      emphasis={resolveOperationCardEmphasis(operation)}
      initial={{ opacity: 0, y: 20 }}
      onClick={operation.select}
      transition={{ delay: props.animationIndex * 0.08 }}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.95 }}
      wrapperRole='listitem'
    >
      <OperationSelectorPriorityChip
        operation={operation}
        priorityElementId={priorityElementId}
      />
      <KangurPanelRow className='sm:items-start sm:justify-between'>
        <KangurIconBadge accent={operation.accent} data-testid={`operation-icon-${operation.id}`} size='xl'>
          {operation.emoji}
        </KangurIconBadge>
        <div
          className={cn(
            KANGUR_WRAP_START_ROW_CLASSNAME,
            'w-full flex-row sm:w-auto sm:flex-col sm:items-end'
          )}
        >
          <KangurStatusChip
            accent={operation.hasPriorityAssignment ? operation.accent : 'slate'}
            className='text-[11px] font-semibold'
            id={statusElementId}
            size='sm'
          >
            {operation.statusLabel}
          </KangurStatusChip>
          <OperationSelectorRecommendationChip
            operation={operation}
            recommendedElementId={recommendedElementId}
          />
        </div>
      </KangurPanelRow>
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
}

export default function OperationSelector({
  onSelect,
  priorityAssignmentsByOperation = {},
  recommendedLabel,
  recommendedOperation,
}: OperationSelectorProps): React.JSX.Element {
  const locale = useLocale();
  const isCoarsePointer = useKangurCoarsePointer();
  const { difficulty, operations, setDifficulty } = useKangurOperationSelectorState({
    onSelect,
    priorityAssignmentsByOperation,
    recommendedLabel,
    recommendedOperation,
  });
  const subjectGroups = useMemo(() => getKangurSubjectGroups(locale), [locale]);
  const headingId = useId();
  const descriptionId = useId();
  const operationsBySubject = useMemo(
    () =>
      new Map(
        subjectGroups.map((group) => [
          group.value,
          operations.filter((operation) => operation.subject === group.value),
        ])
      ),
    [operations, subjectGroups]
  );
  let animationIndex = 0;

  return (
    <section
      aria-describedby={descriptionId}
      aria-labelledby={headingId}
      className={cn('flex w-full max-w-3xl flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}
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
      <div className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
        {subjectGroups.map((group) => {
          const groupOperations = operationsBySubject.get(group.value) ?? [];
          if (groupOperations.length === 0) {
            return null;
          }

          return (
            <KangurSubjectGroupSection
              key={group.value}
              ariaLabel={`${group.label} games`}
              label={group.label}
            >
              <div
                aria-labelledby={headingId}
                className='grid w-full grid-cols-1 kangur-panel-gap sm:grid-cols-2 lg:grid-cols-3'
                role='list'
              >
                {groupOperations.map((operation) => {
                  const nextAnimationIndex = animationIndex;
                  animationIndex += 1;

                  return (
                    <OperationSelectorCard
                      key={operation.id}
                      animationIndex={nextAnimationIndex}
                      isCoarsePointer={isCoarsePointer}
                      operation={operation}
                    />
                  );
                })}
              </div>
            </KangurSubjectGroupSection>
          );
        })}
      </div>
    </section>
  );
}
