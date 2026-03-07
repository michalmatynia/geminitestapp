'use client';

import KangurLearnerAssignmentsPanel from '@/features/kangur/ui/components/KangurLearnerAssignmentsPanel';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfileAssignmentsWidget(): React.JSX.Element {
  const { basePath, user } = useKangurLearnerProfileRuntime();

  return <KangurLearnerAssignmentsPanel basePath={basePath} enabled={Boolean(user)} />;
}
