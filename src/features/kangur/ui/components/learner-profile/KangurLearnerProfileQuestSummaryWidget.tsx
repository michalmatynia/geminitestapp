'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/badge-track/KangurBadgeTrackHighlights';
import KangurDailyQuestHighlightCardContent from '@/features/kangur/ui/components/summary-cards/KangurDailyQuestHighlightCardContent';
import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurButton,
  KangurSectionEyebrow,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import type { KangurRouteAction } from '@/features/kangur/shared/contracts/kangur';

const PROFILE_ROUTE_ACKNOWLEDGE_MS = 0;

const buildAssignmentHref = (
  basePath: string,
  action: KangurRouteAction
): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
};

type DailyQuestSnapshot = NonNullable<ReturnType<typeof getCurrentKangurDailyQuest>>;

const resolveDailyQuestAccent = (
  dailyQuest: DailyQuestSnapshot
): 'emerald' | 'amber' | 'indigo' | 'slate' => {
  if (dailyQuest.reward.status === 'claimed') return 'emerald';
  if (dailyQuest.progress.status === 'completed') return 'amber';
  if (dailyQuest.progress.status === 'in_progress') return 'indigo';
  return 'slate';
};

const resolveQuestActionClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto sm:shrink-0'
    : 'w-full sm:w-auto sm:shrink-0';

const resolveDailyQuestTitle = ({
  activeLearnerName,
  assignmentTitle,
}: {
  activeLearnerName: string | null | undefined;
  assignmentTitle: string;
}): React.JSX.Element => (
  <>
    {activeLearnerName ? `${activeLearnerName}: ` : ''}
    {assignmentTitle}
  </>
);

function DailyQuestCard({
  dailyQuest,
}: {
  dailyQuest: DailyQuestSnapshot;
}): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.questSummary');
  const { basePath, user } = useKangurLearnerProfileRuntime();
  const isCoarsePointer = useKangurCoarsePointer();

  const activeLearner = user?.activeLearner ?? null;
  const actionClassName = resolveQuestActionClassName(isCoarsePointer);
  const dailyQuestAccent = resolveDailyQuestAccent(dailyQuest);

  return (
    <div
      className='soft-card kangur-soft-surface-accent-indigo rounded-[28px] border px-4 py-4 text-left'
      data-testid='kangur-learner-profile-daily-quest'
    >
      <KangurDailyQuestHighlightCardContent
        action={
          <KangurButton asChild className={actionClassName} size='sm' variant='surface'>
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
        questLabel={dailyQuest.assignment.questLabel ?? translations('defaultQuestLabel')}
        rewardAccent={
          dailyQuest.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent
        }
        rewardLabel={dailyQuest.reward.label}
        title={resolveDailyQuestTitle({
          activeLearnerName: activeLearner?.displayName,
          assignmentTitle: dailyQuest.assignment.title,
        })}
      />
    </div>
  );
}

function QuestTrackSummary({ heading }: { heading: string }): React.JSX.Element {
  const { progress } = useKangurLearnerProfileRuntime();

  return (
    <div className='text-left' data-testid='kangur-learner-profile-track-summary'>
      <KangurSectionEyebrow as='p' className='mb-2 tracking-[0.18em]'>
        {heading}
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
  );
}

export function KangurLearnerProfileQuestSummaryWidget(): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.questSummary');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const { progress } = useKangurLearnerProfileRuntime();
  const { subject, subjectKey } = useKangurSubjectFocus();

  const dailyQuest = useMemo(
    () =>
      getCurrentKangurDailyQuest(progress, {
        ownerKey: subjectKey,
        subject,
        translate: runtimeTranslations,
      }),
    [progress, runtimeTranslations, subject, subjectKey]
  );

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      {dailyQuest ? (
        <DailyQuestCard dailyQuest={dailyQuest} />
      ) : null}
      <QuestTrackSummary heading={translations('tracksHeading')} />
    </section>
  );
}
