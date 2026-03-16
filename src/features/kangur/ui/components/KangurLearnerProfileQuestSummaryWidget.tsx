'use client';

import { useMemo } from 'react';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/KangurBadgeTrackHighlights';
import KangurDailyQuestHighlightCardContent from '@/features/kangur/ui/components/KangurDailyQuestHighlightCardContent';
import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurButton,
  KangurSectionEyebrow,
} from '@/features/kangur/ui/design/primitives';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import type { KangurRouteAction } from '@/features/kangur/shared/contracts/kangur';

const PROFILE_ROUTE_ACKNOWLEDGE_MS = 110;

const buildAssignmentHref = (
  basePath: string,
  action: KangurRouteAction
): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
};

export function KangurLearnerProfileQuestSummaryWidget(): React.JSX.Element {
  const { basePath, progress, user } = useKangurLearnerProfileRuntime();
  const activeLearner = user?.activeLearner ?? null;
  const dailyQuest = useMemo(() => getCurrentKangurDailyQuest(progress), [progress]);
  const dailyQuestAccent =
    dailyQuest?.reward.status === 'claimed'
      ? 'emerald'
      : dailyQuest?.progress.status === 'completed'
        ? 'amber'
        : dailyQuest?.progress.status === 'in_progress'
          ? 'indigo'
          : 'slate';

  return (
    <section className='flex flex-col gap-4'>
      {dailyQuest ? (
        <div
          className='soft-card rounded-[28px] border border-indigo-200/80 px-4 py-4 text-left shadow-[0_18px_40px_-32px_rgba(79,99,216,0.35)]'
          data-testid='kangur-learner-profile-daily-quest'
          style={{
            background:
              'color-mix(in srgb, var(--kangur-soft-card-background) 88%, rgba(224,231,255,0.92))',
          }}
        >
          <KangurDailyQuestHighlightCardContent
            action={
              <KangurButton
                asChild
                className='w-full sm:w-auto sm:shrink-0'
                size='sm'
                variant='surface'
              >
                <Link
                  href={buildAssignmentHref(basePath, dailyQuest.assignment.action)}
                  targetPageKey={dailyQuest.assignment.action.page}
                  transitionAcknowledgeMs={PROFILE_ROUTE_ACKNOWLEDGE_MS}
                  transitionSourceId='learner-profile-daily-quest'
                >
                  {dailyQuest.assignment.action.label}
                </Link>
              </KangurButton>
            }
            description={dailyQuest.progress.summary}
            progressAccent={dailyQuestAccent}
            progressLabel={`${dailyQuest.progress.percent}%`}
            questLabel={dailyQuest.assignment.questLabel ?? 'Misja dnia'}
            rewardAccent={dailyQuest.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent}
            rewardLabel={dailyQuest.reward.label}
            title={
              <>
                {activeLearner?.displayName ? `${activeLearner.displayName}: ` : ''}
                {dailyQuest.assignment.title}
              </>
            }
          />
        </div>
      ) : null}

      <div className='text-left' data-testid='kangur-learner-profile-track-summary'>
        <KangurSectionEyebrow as='p' className='mb-2 tracking-[0.18em]'>
          Ścieżki postępu ucznia
        </KangurSectionEyebrow>
        <KangurHeroMilestoneSummary
          className='mb-3'
          dataTestIdPrefix='kangur-learner-profile-progress-milestone'
          progress={progress}
        />
        <KangurBadgeTrackHighlights
          dataTestIdPrefix='kangur-learner-profile-track'
          limit={3}
          progress={progress}
        />
      </div>
    </section>
  );
}
