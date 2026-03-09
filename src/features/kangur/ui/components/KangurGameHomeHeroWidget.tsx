'use client';

import KangurAssignmentSpotlight from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

type KangurGameHomeHeroWidgetProps = {
  hideWhenScreenMismatch?: boolean;
};

export function KangurGameHomeHeroWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeHeroWidgetProps = {}): React.JSX.Element | null {
  const runtime = useKangurGameRuntime();
  const { basePath, screen, user } = runtime;
  const canAccessParentAssignments =
    runtime.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);

  if (hideWhenScreenMismatch && screen !== 'home') {
    return null;
  }

  if (canAccessParentAssignments) {
    return <KangurAssignmentSpotlight basePath={basePath} enabled={canAccessParentAssignments} />;
  }

  return null;
}
