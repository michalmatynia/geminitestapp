'use client';

import { useTranslations } from 'next-intl';
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

function DailyQuestCard(props: {
  dailyQuest: DailyQuestSnapshot;
  basePath: string;
  actionClassName: string;
  activeLearnerName: string | null | undefined;
  defaultQuestLabel: string;
}): React.JSX.Element {
  const dailyQuestAccent = resolveDailyQuestAccent(props.dailyQuest);

  return (
    <div
      className='soft-card kangur-soft-surface-accent-indigo rounded-[28px] border px-4 py-4 text-left'
      data-testid='kangur-learner-profile-daily-quest'
    >
      <KangurDailyQuestHighlightCardContent
        action={
          <KangurButton asChild className={props.actionClassName} size='sm' variant='surface'>
            <Link
              href={buildAssignmentHref(props.basePath, props.dailyQuest.assignment.action)}
              targetPageKey={props.dailyQuest.assignment.action.page}
              transitionAcknowledgeMs={PROFILE_ROUTE_ACKNOWLEDGE_MS}
              transitionSourceId='learner-profile-daily-quest'
            >
              {props.dailyQuest.assignment.action.label}
            </Link>
          </KangurButton>
        }
        description={props.dailyQuest.progress.summary}
        progressAccent={dailyQuestAccent}
        progressLabel={`${props.dailyQuest.progress.percent}%`}
        questLabel={props.dailyQuest.assignment.questLabel ?? props.defaultQuestLabel}
        rewardAccent={
          props.dailyQuest.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent
        }
        rewardLabel={props.dailyQuest.reward.label}
        title={resolveDailyQuestTitle({
          activeLearnerName: props.activeLearnerName,
          assignmentTitle: props.dailyQuest.assignment.title,
        })}
      />
    </div>
  );
}

function QuestTrackSummary(props: {
  heading: string;
  progress: ReturnType<typeof useKangurLearnerProfileRuntime>['progress'];
}): React.JSX.Element {
  return (
    <div className='text-left' data-testid='kangur-learner-profile-track-summary'>
      <KangurSectionEyebrow as='p' className='mb-2 tracking-[0.18em]'>
        {props.heading}
      </KangurSectionEyebrow>
      <KangurHeroMilestoneSummary
        className='mb-3'
        dataTestIdPrefix='kangur-learner-profile-progress-milestone'
        progress={props.progress}
      />
      <KangurBadgeTrackHighlights
        dataTestIdPrefix='kangur-learner-profile-track'
        limit={3}
        progress={props.progress}
      />
    </div>
  );
}

export function KangurLearnerProfileQuestSummaryWidget(): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.questSummary');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const { basePath, progress, user } = useKangurLearnerProfileRuntime();
  const isCoarsePointer = useKangurCoarsePointer();
  const { subject, subjectKey } = useKangurSubjectFocus();
  const activeLearner = user?.activeLearner ?? null;
  const dailyQuest = useMemo(
    () =>
      getCurrentKangurDailyQuest(progress, {
        ownerKey: subjectKey,
        subject,
        translate: runtimeTranslations,
      }),
    [progress, runtimeTranslations, subject, subjectKey]
  );
  const actionClassName = resolveQuestActionClassName(isCoarsePointer);

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      {dailyQuest ? (
        <DailyQuestCard
          dailyQuest={dailyQuest}
          basePath={basePath}
          actionClassName={actionClassName}
          activeLearnerName={activeLearner?.displayName}
          defaultQuestLabel={translations('defaultQuestLabel')}
        />
      ) : null}
      <QuestTrackSummary heading={translations('tracksHeading')} progress={progress} />
    </section>
  );
}
