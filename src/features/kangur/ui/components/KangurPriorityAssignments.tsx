'use client';

import { useMemo } from 'react';

import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import {
  buildKangurAssignmentListItems,
  selectKangurPriorityAssignments,
} from '@/features/kangur/ui/services/delegated-assignments';

type KangurPriorityAssignmentsProps = {
  basePath: string;
  enabled?: boolean;
  limit?: number;
  title?: string;
  emptyLabel?: string;
};

const PRIORITY_ASSIGNMENTS_TITLE = 'Priorytetowe zadania';
const PRIORITY_ASSIGNMENTS_EMPTY_DESCRIPTION = 'Brak aktywnych zadań od rodzica.';
const PRIORITY_ASSIGNMENTS_SECTION_ID = 'game-home-priority-assignments';

export function KangurPriorityAssignments({
  basePath,
  enabled = false,
  limit = 3,
  title,
  emptyLabel,
}: KangurPriorityAssignmentsProps): React.JSX.Element | null {
  const { entry: assignmentsContent } = useKangurPageContentEntry(PRIORITY_ASSIGNMENTS_SECTION_ID);
  const assignmentsTitle = title ?? assignmentsContent?.title ?? PRIORITY_ASSIGNMENTS_TITLE;
  const assignmentsSummary = assignmentsContent?.summary ?? undefined;
  const emptyDescription = emptyLabel ?? PRIORITY_ASSIGNMENTS_EMPTY_DESCRIPTION;
  const { assignments, isLoading, error } = useKangurAssignments({
    enabled,
    query: {
      includeArchived: false,
    },
  });

  const visibleAssignments = useMemo(
    () => selectKangurPriorityAssignments(assignments, limit),
    [assignments, limit]
  );
  const visibleItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, visibleAssignments),
    [basePath, visibleAssignments]
  );

  if (!enabled) {
    return null;
  }

  if (isLoading) {
    return (
      <KangurGlassPanel
        data-testid='kangur-priority-assignments-loading'
        padding='lg'
        surface='neutral'
        variant='soft'
      >
        <KangurEmptyState
          accent='slate'
          className='text-sm'
          description='Ładowanie priorytetowych zadań...'
          padding='lg'
          role='status'
          aria-live='polite'
          aria-atomic='true'
        />
      </KangurGlassPanel>
    );
  }

  if (error) {
    return (
      <KangurGlassPanel
        data-testid='kangur-priority-assignments-error'
        padding='lg'
        surface='rose'
        variant='soft'
      >
        <KangurSummaryPanel
          accent='rose'
          description={error}
          padding='lg'
          tone='accent'
          role='alert'
          aria-live='assertive'
          aria-atomic='true'
        />
      </KangurGlassPanel>
    );
  }

  if (visibleAssignments.length === 0) {
    return (
      <KangurGlassPanel
        data-testid='kangur-priority-assignments-empty'
        padding='lg'
        surface='mist'
        variant='soft'
      >
        <div className='mb-5 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between'>
          <div className='text-2xl font-extrabold tracking-tight [color:var(--kangur-page-text)]'>
            {assignmentsTitle}
          </div>
          <div className='text-sm font-medium [color:var(--kangur-page-muted-text)]'>0 zadań</div>
        </div>
        {assignmentsSummary ? (
          <div className='mb-4 text-sm [color:var(--kangur-page-muted-text)]'>
            {assignmentsSummary}
          </div>
        ) : null}
        <KangurEmptyState
          accent='slate'
          className='text-sm'
          description={emptyDescription}
          padding='lg'
        />
      </KangurGlassPanel>
    );
  }

  return (
    <KangurAssignmentsList
      items={visibleItems}
      title={assignmentsTitle}
      summary={assignmentsSummary}
      compact
      showTimeCountdown
    />
  );
}

export default KangurPriorityAssignments;
