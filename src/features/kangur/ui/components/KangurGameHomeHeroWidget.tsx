'use client';

import KangurAssignmentSpotlight from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import KangurGameHomeMomentumWidget from '@/features/kangur/ui/components/KangurGameHomeMomentumWidget';
import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { KangurCardDescription, KangurSectionEyebrow } from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
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
  const { entry: heroContent } = useKangurPageContentEntry('game-home-hero');
  const { basePath, progress, screen, user } = runtime;
  const canAccessParentAssignments =
    runtime.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);
  const shouldShowMilestones = hasMeaningfulProgress(progress);

  if (hideWhenScreenMismatch && screen !== 'home') {
    return null;
  }

  const heroTitle = heroContent?.title ?? 'Twoj postep';
  const heroSummary =
    heroContent?.summary ??
    'Sprawdz najblizszy kamien milowy, polecony kierunek i zadania, ktore warto domknac dzisiaj.';

  if (shouldShowMilestones) {
    return (
      <div className='w-full space-y-4' data-testid='kangur-home-hero-shell'>
        <div className='space-y-2' data-testid='kangur-home-hero-copy'>
          <KangurSectionEyebrow as='p'>{heroTitle}</KangurSectionEyebrow>
          <KangurCardDescription as='p' size='sm'>
            {heroSummary}
          </KangurCardDescription>
        </div>
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
    return (
      <div className='w-full space-y-4' data-testid='kangur-home-hero-shell'>
        <div className='space-y-2' data-testid='kangur-home-hero-copy'>
          <KangurSectionEyebrow as='p'>{heroTitle}</KangurSectionEyebrow>
          <KangurCardDescription as='p' size='sm'>
            {heroSummary}
          </KangurCardDescription>
        </div>
        <KangurAssignmentSpotlight basePath={basePath} enabled={canAccessParentAssignments} />
      </div>
    );
  }

  return null;
}
