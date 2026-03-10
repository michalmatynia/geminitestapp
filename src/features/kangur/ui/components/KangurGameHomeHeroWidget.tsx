'use client';

import KangurAssignmentSpotlight from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import KangurGameHomeMomentumWidget from '@/features/kangur/ui/components/KangurGameHomeMomentumWidget';
import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type KangurGameHomeHeroWidgetProps = {
  hideWhenScreenMismatch?: boolean;
};

const hasMeaningfulProgress = (progress: KangurProgressState): boolean =>
  progress.totalXp > 0 ||
  progress.gamesPlayed > 0 ||
  progress.lessonsCompleted > 0 ||
  (progress.dailyQuestsCompleted ?? 0) > 0;

export function KangurGameHomeHeroWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeHeroWidgetProps = {}): React.JSX.Element | null {
  const runtime = useKangurGameRuntime();
  const { basePath, progress, screen, user } = runtime;
  const canAccessParentAssignments =
    runtime.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);
  const shouldShowMilestones = hasMeaningfulProgress(progress);

  if (hideWhenScreenMismatch && screen !== 'home') {
    return null;
  }

  if (shouldShowMilestones) {
    return (
      <div className='w-full space-y-4' data-testid='kangur-home-hero-shell'>
        <KangurHeroMilestoneSummary
          className='w-full'
          dataTestIdPrefix='kangur-home-hero-milestone'
          progress={progress}
        />
        <KangurGameHomeMomentumWidget basePath={basePath} progress={progress} />
        {canAccessParentAssignments ? (
          <KangurAssignmentSpotlight basePath={basePath} enabled={canAccessParentAssignments} />
        ) : null}
      </div>
    );
  }

  if (canAccessParentAssignments) {
    return <KangurAssignmentSpotlight basePath={basePath} enabled={canAccessParentAssignments} />;
  }

  return null;
}
