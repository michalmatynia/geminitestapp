'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurGlassPanel,
  KangurPanelStack,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_STACK_ROW_LG_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type { KangurAssignmentPlan } from '@/features/kangur/shared/contracts/kangur-quests';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getProgressAverageXpPerSession,
  getProgressBadgeTrackSummaries,
  getRecommendedSessionMomentum,
  translateKangurProgressWithFallback,
} from '@/features/kangur/ui/services/progress';

type KangurGameHomeQuestWidgetProps = {
  hideWhenScreenMismatch?: boolean;
};

const buildAssignmentHref = (
  basePath: string,
  action: KangurAssignmentPlan['action']
): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
};

const QUEST_STATUS_ACCENTS = {
  completed: 'emerald',
  in_progress: 'indigo',
  not_started: 'slate',
} as const;

const HOME_QUEST_ROUTE_ACKNOWLEDGE_MS = 110;

export function KangurGameHomeQuestWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeQuestWidgetProps = {}): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const runtime = useKangurGameRuntime();
  const { basePath, progress, screen } = runtime;
  const { subject } = useKangurSubjectFocus();
  const progressLocalizer = { translate: runtimeTranslations };
  const quest = useMemo(
    () => getCurrentKangurDailyQuest(progress, { subject, translate: runtimeTranslations }),
    [progress, runtimeTranslations, subject]
  );
  const averageXpPerSession = useMemo(() => getProgressAverageXpPerSession(progress), [progress]);
  const guidedMomentum = useMemo(
    () => getRecommendedSessionMomentum(progress, progressLocalizer),
    [progress, runtimeTranslations]
  );
  const leadingTrack = useMemo(
    () => getProgressBadgeTrackSummaries(progress, { maxTracks: 1 }, progressLocalizer)[0] ?? null,
    [progress, runtimeTranslations]
  );
  const visibleLeadingTrack =
    leadingTrack &&
    (leadingTrack.unlockedCount > 0 || leadingTrack.progressPercent >= 40)
      ? leadingTrack
      : null;
  const currentWinStreak = progress.currentWinStreak ?? 0;
  const translateWithFallback = (
    key: string,
    fallback: string,
    values?: Record<string, string | number>
  ): string => {
    const translated = translations(key, values);
    return translated === key ? fallback : translated;
  };

  if (hideWhenScreenMismatch && screen !== 'home') {
    return null;
  }

  if (!quest) {
    return null;
  }

  const assignment = quest.assignment;
  const questStatusLabels = {
    completed: translateWithFallback('homeQuest.status.completed', 'Misja ukończona'),
    in_progress: translateWithFallback('homeQuest.status.inProgress', 'Misja w toku'),
    not_started: translateWithFallback('homeQuest.status.notStarted', 'Misja czeka'),
  } as const;

  return (
    <KangurGlassPanel
      className='w-full'
      data-testid='kangur-home-quest-widget'
      padding='lg'
      surface='mistStrong'
      variant='soft'
    >
      <KangurPanelStack className={`${KANGUR_STACK_ROW_LG_CLASSNAME} lg:items-start lg:justify-between`}>
        <div className='min-w-0 flex-1'>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            <KangurStatusChip
              accent='violet'
              data-testid='kangur-home-quest-label'
              labelStyle='caps'
            >
              {assignment.questLabel ?? translateWithFallback('homeQuest.defaultLabel', 'Misja dnia')}
            </KangurStatusChip>
            <KangurAssignmentPriorityChip
              data-testid='kangur-home-quest-priority'
              labelStyle='caps'
              priority={assignment.priority}
            />
            <KangurStatusChip
              accent={QUEST_STATUS_ACCENTS[quest.progress.status]}
              data-testid='kangur-home-quest-status'
              labelStyle='caps'
            >
              {questStatusLabels[quest.progress.status]}
            </KangurStatusChip>
            {quest.reward.xp > 0 ? (
              <KangurStatusChip
                accent={
                  quest.reward.status === 'claimed'
                    ? 'emerald'
                    : quest.reward.status === 'ready'
                      ? 'amber'
                      : 'indigo'
                }
                data-testid='kangur-home-quest-reward'
                labelStyle='caps'
              >
                {quest.reward.label}
              </KangurStatusChip>
            ) : null}
            <KangurStatusChip
              accent='slate'
              data-testid='kangur-home-quest-expiry'
              labelStyle='caps'
            >
              {quest.expiresLabel}
            </KangurStatusChip>
          </div>

          <KangurCardTitle className='mt-4' data-testid='kangur-home-quest-title' size='xl'>
            {assignment.title}
          </KangurCardTitle>
          <KangurCardDescription
            as='p'
            className='mt-3 max-w-2xl leading-7'
            data-testid='kangur-home-quest-description'
            size='sm'
          >
            {assignment.description}
          </KangurCardDescription>

          <div className={`mt-4 ${KANGUR_WRAP_ROW_CLASSNAME}`}>
            <KangurStatusChip
              accent='amber'
              data-testid='kangur-home-quest-target'
              labelStyle='compact'
              size='sm'
            >
              {translateWithFallback('homeQuest.targetPrefix', 'Cel:')} {assignment.target}
            </KangurStatusChip>
            <KangurStatusChip
              accent='slate'
              data-testid='kangur-home-quest-progress'
              labelStyle='compact'
              size='sm'
            >
              {quest.progress.summary}
            </KangurStatusChip>
          </div>

          {currentWinStreak > 0 ||
          averageXpPerSession > 0 ||
          visibleLeadingTrack ||
          guidedMomentum.completedSessions > 0 ? (
              <div
                className={`mt-4 ${KANGUR_WRAP_ROW_CLASSNAME}`}
                data-testid='kangur-home-quest-momentum'
              >
                {currentWinStreak > 0 ? (
                  <KangurStatusChip
                    accent='rose'
                    data-testid='kangur-home-quest-streak'
                    labelStyle='compact'
                    size='sm'
                  >
                  {translateWithFallback('homeQuest.streakPrefix', 'Seria:')} {currentWinStreak}
                  </KangurStatusChip>
                ) : null}
                {averageXpPerSession > 0 ? (
                  <KangurStatusChip
                    accent='violet'
                    data-testid='kangur-home-quest-xp-rate'
                    labelStyle='compact'
                    size='sm'
                  >
                  {translateWithFallback('homeQuest.pacePrefix', 'Tempo:')}{' '}
                  {translateKangurProgressWithFallback(
                    runtimeTranslations,
                    'questMomentum.paceValue',
                    `${averageXpPerSession} XP / grę`,
                    { xp: averageXpPerSession }
                  )}
                  </KangurStatusChip>
                ) : null}
                {visibleLeadingTrack ? (
                  <KangurStatusChip
                    accent='indigo'
                    data-testid='kangur-home-quest-track'
                    labelStyle='compact'
                    size='sm'
                  >
                  {translateWithFallback('homeQuest.trackPrefix', 'Na fali:')} {visibleLeadingTrack.label}
                  </KangurStatusChip>
                ) : null}
                {guidedMomentum.completedSessions > 0 ? (
                  <KangurStatusChip
                    accent='sky'
                    data-testid='kangur-home-quest-guided'
                    labelStyle='compact'
                    size='sm'
                  >
                  {translateWithFallback('homeQuest.directionPrefix', 'Kierunek:')} {guidedMomentum.summary}
                  </KangurStatusChip>
                ) : null}
              </div>
            ) : null}

          <KangurProgressBar
            accent={quest.progress.status === 'completed' ? 'emerald' : 'violet'}
            className='mt-4 max-w-full sm:max-w-sm'
            data-testid='kangur-home-quest-progress-bar'
            size='sm'
            value={quest.progress.percent}
          />
        </div>

        <div className='w-full lg:w-auto lg:shrink-0'>
          <KangurButton asChild className='w-full lg:w-auto' variant='primary'>
            <Link
              href={buildAssignmentHref(basePath, assignment.action)}
              targetPageKey={assignment.action.page}
              transitionAcknowledgeMs={HOME_QUEST_ROUTE_ACKNOWLEDGE_MS}
              transitionSourceId={`game-home-quest:${assignment.id}`}
            >
              {assignment.action.label}
            </Link>
          </KangurButton>
        </div>
      </KangurPanelStack>
    </KangurGlassPanel>
  );
}

export default KangurGameHomeQuestWidget;
