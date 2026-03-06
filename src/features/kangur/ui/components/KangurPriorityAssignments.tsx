import { useMemo } from 'react';

import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { selectKangurPriorityAssignments } from '@/features/kangur/ui/services/delegated-assignments';

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
      <section className='bg-white/85 backdrop-blur rounded-2xl shadow p-5 text-sm text-slate-400'>
        Ladowanie priorytetowych zadan...
      </section>
    );
  }

  if (error) {
    return (
      <section className='bg-white/85 backdrop-blur rounded-2xl shadow p-5 text-sm text-rose-500'>
        {error}
      </section>
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
