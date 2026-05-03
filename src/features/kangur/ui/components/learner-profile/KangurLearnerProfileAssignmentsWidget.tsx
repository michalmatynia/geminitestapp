'use client';

import { useEffect, useState } from 'react';

import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';
import KangurLearnerAssignmentsPanel from '@/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel';
import { useKangurAuthSessionState } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

const LEARNER_PROFILE_ASSIGNMENTS_LOAD_DEFER_MS = 0;

export function KangurLearnerProfileAssignmentsWidget(): React.JSX.Element {
  const { basePath } = useKangurLearnerProfileRuntime();
  const { canAccessParentAssignments } = useKangurAuthSessionState();
  const [isAssignmentsReady, setIsAssignmentsReady] = useState(false);

  useEffect(() => {
    if (!canAccessParentAssignments) {
      setIsAssignmentsReady(false);
      return undefined;
    }

    setIsAssignmentsReady(false);
    const timeoutId = safeSetTimeout(() => {
      setIsAssignmentsReady(true);
    }, LEARNER_PROFILE_ASSIGNMENTS_LOAD_DEFER_MS);

    return (): void => {
      safeClearTimeout(timeoutId);
    };
  }, [canAccessParentAssignments]);

  return (
    <KangurLearnerAssignmentsPanel
      basePath={basePath}
      enabled={canAccessParentAssignments && isAssignmentsReady}
    />
  );
}
