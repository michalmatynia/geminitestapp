'use client';

import { useMemo } from 'react';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurGlassPanel,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { type KangurAssignmentPlan } from '@/features/kangur/ui/services/assignments';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getProgressAverageXpPerSession,
  getProgressBadgeTrackSummaries,
  getRecommendedSessionMomentum,
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

const QUEST_STATUS_LABELS = {
  completed: 'Misja ukończona',
  in_progress: 'Misja w toku',
  not_started: 'Misja czeka',
} as const;

const QUEST_STATUS_ACCENTS = {
  completed: 'emerald',
  in_progress: 'indigo',
  not_started: 'slate',
} as const;

const HOME_QUEST_ROUTE_ACKNOWLEDGE_MS = 110;

export function KangurGameHomeQuestWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeQuestWidgetProps = {}): React.JSX.Element | null {
  const runtime = useKangurGameRuntime();
  const { basePath, progress, screen } = runtime;
  const quest = useMemo(() => getCurrentKangurDailyQuest(progress), [progress]);
  const averageXpPerSession = useMemo(() => getProgressAverageXpPerSession(progress), [progress]);
  const guidedMomentum = useMemo(() => getRecommendedSessionMomentum(progress), [progress]);
  const leadingTrack = useMemo(
    () => getProgressBadgeTrackSummaries(progress, { maxTracks: 1 })[0] ?? null,
    [progress]
  );
  const visibleLeadingTrack =
    leadingTrack &&
    (leadingTrack.unlockedCount > 0 || leadingTrack.progressPercent >= 40)
      ? leadingTrack
      : null;
  const currentWinStreak = progress.currentWinStreak ?? 0;

  if (hideWhenScreenMismatch && screen !== 'home') {
    return null;
  }

  if (!quest) {
    return null;
  }

  const assignment = quest.assignment;

  return (
    <KangurGlassPanel
      className='w-full'
      data-testid='kangur-home-quest-widget'
      padding='lg'
      surface='mistStrong'
      variant='soft'
    >
      <div className='flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <KangurStatusChip
              accent='violet'
              data-testid='kangur-home-quest-label'
              labelStyle='caps'
            >
              {assignment.questLabel ?? 'Misja dnia'}
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
              {QUEST_STATUS_LABELS[quest.progress.status]}
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

          <div className='mt-4 flex flex-wrap gap-2'>
            <KangurStatusChip
              accent='amber'
              data-testid='kangur-home-quest-target'
              labelStyle='compact'
              size='sm'
            >
              Cel: {assignment.target}
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
                className='mt-4 flex flex-wrap gap-2'
                data-testid='kangur-home-quest-momentum'
              >
                {currentWinStreak > 0 ? (
                  <KangurStatusChip
                    accent='rose'
                    data-testid='kangur-home-quest-streak'
                    labelStyle='compact'
                    size='sm'
                  >
                  Seria: {currentWinStreak}
                  </KangurStatusChip>
                ) : null}
                {averageXpPerSession > 0 ? (
                  <KangurStatusChip
                    accent='violet'
                    data-testid='kangur-home-quest-xp-rate'
                    labelStyle='compact'
                    size='sm'
                  >
                  Tempo: {averageXpPerSession} XP / grę
                  </KangurStatusChip>
                ) : null}
                {visibleLeadingTrack ? (
                  <KangurStatusChip
                    accent='indigo'
                    data-testid='kangur-home-quest-track'
                    labelStyle='compact'
                    size='sm'
                  >
                  Na fali: {visibleLeadingTrack.label}
                  </KangurStatusChip>
                ) : null}
                {guidedMomentum.completedSessions > 0 ? (
                  <KangurStatusChip
                    accent='sky'
                    data-testid='kangur-home-quest-guided'
                    labelStyle='compact'
                    size='sm'
                  >
                  Kierunek: {guidedMomentum.summary}
                  </KangurStatusChip>
                ) : null}
              </div>
            ) : null}

          <KangurProgressBar
            accent={quest.progress.status === 'completed' ? 'emerald' : 'violet'}
            className='mt-4 max-w-sm'
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
      </div>
    </KangurGlassPanel>
  );
}

export default KangurGameHomeQuestWidget;
