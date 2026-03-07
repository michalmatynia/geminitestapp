import { useMemo } from 'react';

import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { selectKangurPriorityAssignments } from '@/features/kangur/ui/services/delegated-assignments';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';

type KangurPriorityAssignmentsProps = {
  basePath: string;
  enabled?: boolean;
  limit?: number;
  title?: string;
  emptyLabel?: string;
};

const PRIORITY_ASSIGNMENTS_TITLE = 'Priorytetowe zadania';
const PRIORITY_ASSIGNMENTS_EMPTY_DESCRIPTION = 'Brak aktywnych zadan od rodzica.';

export function KangurPriorityAssignments({
  basePath,
  enabled = true,
  limit = 3,
  title,
  emptyLabel,
}: KangurPriorityAssignmentsProps): React.JSX.Element | null {
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
        <div className='mb-5 flex items-center justify-between gap-3'>
          <div className='text-2xl font-extrabold tracking-tight text-[#7a86b0]'>
            {title ?? PRIORITY_ASSIGNMENTS_TITLE}
          </div>
          <div className='text-sm font-medium text-[#96a0be]'>0 zadan</div>
        </div>
        <KangurEmptyState
          accent='slate'
          className='text-sm'
          description={emptyLabel ?? PRIORITY_ASSIGNMENTS_EMPTY_DESCRIPTION}
          padding='lg'
        />
      </KangurGlassPanel>
    );
  }

  return (
    <KangurAssignmentsList
      assignments={visibleAssignments}
      basePath={basePath}
      title={title ?? PRIORITY_ASSIGNMENTS_TITLE}
      emptyLabel={emptyLabel ?? PRIORITY_ASSIGNMENTS_EMPTY_DESCRIPTION}
      compact
    />
  );
}

export default KangurPriorityAssignments;
