'use client';

import { useEffect, useState } from 'react';

import KangurLearnerAssignmentsPanel from '@/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

const LEARNER_PROFILE_ASSIGNMENTS_LOAD_DEFER_MS = 0;

export function KangurLearnerProfileAssignmentsWidget(): React.JSX.Element {
  const { basePath } = useKangurLearnerProfileRuntime();
  const auth = useKangurAuth();
  const canAccessParentAssignments =
    auth.canAccessParentAssignments ?? Boolean(auth.user?.activeLearner?.id);
  const [isAssignmentsReady, setIsAssignmentsReady] = useState(false);

  useEffect(() => {
    if (!canAccessParentAssignments) {
      setIsAssignmentsReady(false);
      return;
    }

    setIsAssignmentsReady(false);
    const timeoutId = globalThis.setTimeout(() => {
      setIsAssignmentsReady(true);
    }, LEARNER_PROFILE_ASSIGNMENTS_LOAD_DEFER_MS);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [canAccessParentAssignments]);

  return (
    <KangurLearnerAssignmentsPanel
      basePath={basePath}
      enabled={canAccessParentAssignments && isAssignmentsReady}
    />
  );
}
