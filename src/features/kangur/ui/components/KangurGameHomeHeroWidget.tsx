'use client';

import KangurAssignmentSpotlight from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { KangurPanelIntro } from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type KangurGameHomeHeroWidgetProps = {
  hideWhenScreenMismatch?: boolean;
  showIntro?: boolean;
  showAssignmentSpotlight?: boolean;
};

const hasMeaningfulProgress = (progress: KangurProgressState): boolean =>
  progress.totalXp > 0 ||
  progress.gamesPlayed > 0 ||
  progress.lessonsCompleted > 0 ||
  (progress.dailyQuestsCompleted ?? 0) > 0;

export function KangurGameHomeHeroWidget({
  hideWhenScreenMismatch = true,
  showIntro = true,
  showAssignmentSpotlight = true,
}: KangurGameHomeHeroWidgetProps = {}): React.JSX.Element | null {
  const runtime = useKangurGameRuntime();
  const { entry: heroContent } = useKangurPageContentEntry('game-home-hero');
  const { basePath, progress, screen, user } = runtime;
  const canAccessParentAssignments =
    runtime.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);
  const shouldShowMilestones = hasMeaningfulProgress(progress);

  if (hideWhenScreenMismatch && screen !== 'home') {
    return null;
  }

  const heroTitle = heroContent?.title ?? 'Twój postęp';
  const heroSummary =
    heroContent?.summary ??
    'Sprawdź najbliższy kamień milowy i zadania, które warto domknąć dziś.';
  const intro = showIntro ? (
    <KangurPanelIntro
      className='space-y-2'
      data-testid='kangur-home-hero-copy'
      description={heroSummary}
      eyebrow={heroTitle}
    />
  ) : null;
  const assignmentSpotlight =
    showAssignmentSpotlight && canAccessParentAssignments ? (
    <KangurAssignmentSpotlight basePath={basePath} enabled={canAccessParentAssignments} />
  ) : null;
  const milestoneSummary = shouldShowMilestones ? (
    <KangurHeroMilestoneSummary
      className='w-full'
      dataTestIdPrefix='kangur-home-hero-milestone'
      progress={progress}
    />
  ) : null;

  if (shouldShowMilestones) {
    return (
      <div className='w-full space-y-4' data-testid='kangur-home-hero-shell'>
        {intro}
        {assignmentSpotlight}
        {milestoneSummary}
      </div>
    );
  }

  if (assignmentSpotlight) {
    return (
      <div className='w-full space-y-4' data-testid='kangur-home-hero-shell'>
        {intro}
        {assignmentSpotlight}
      </div>
    );
  }

  return null;
}
