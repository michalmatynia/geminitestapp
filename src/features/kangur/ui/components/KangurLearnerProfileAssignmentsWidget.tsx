import KangurLearnerAssignmentsPanel from '@/features/kangur/ui/components/KangurLearnerAssignmentsPanel';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfileAssignmentsWidget(): React.JSX.Element {
  const { basePath } = useKangurLearnerProfileRuntime();
  const auth = useKangurAuth();
  const canAccessParentAssignments =
    auth.canAccessParentAssignments ?? Boolean(auth.user?.activeLearner?.id);

  return (
    <KangurLearnerAssignmentsPanel
      basePath={basePath}
      enabled={canAccessParentAssignments}
    />
  );
}
