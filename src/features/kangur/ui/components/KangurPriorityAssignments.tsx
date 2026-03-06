import { useMemo } from 'react';

import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { selectKangurPriorityAssignments } from '@/features/kangur/ui/services/delegated-assignments';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import { KangurPanel } from '@/features/kangur/ui/design/primitives';

type KangurPriorityAssignmentsProps = {
  basePath: string;
  enabled?: boolean;
  title: string;
  emptyLabel: string;
  limit?: number;
};

export function KangurPriorityAssignments({
  basePath,
  enabled = true,
  title,
  emptyLabel,
  limit = 3,
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
      <KangurPanel className='border-slate-200/70 bg-white/88' padding='lg' variant='soft'>
        <KangurLessonCallout accent='slate' className='text-sm text-slate-500' padding='lg'>
          Ładowanie priorytetowych zadań...
        </KangurLessonCallout>
      </KangurPanel>
    );
  }

  if (error) {
    return (
      <KangurPanel className='border-rose-200/70 bg-white/88' padding='lg' variant='soft'>
        <KangurLessonCallout accent='rose' className='text-sm text-rose-700' padding='lg'>
          {error}
        </KangurLessonCallout>
      </KangurPanel>
    );
  }

  return (
    <KangurAssignmentsList
      assignments={visibleAssignments}
      basePath={basePath}
      title={title}
      emptyLabel={emptyLabel}
      compact
    />
  );
}

export default KangurPriorityAssignments;
