'use client';

import { useMemo } from 'react';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { type KangurAssignmentPlan } from '@/features/kangur/ui/services/assignments';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getProgressAverageXpPerSession,
  getProgressBadgeTrackSummaries,
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

const PRIORITY_LABELS = {
  high: 'Priorytet wysoki',
  medium: 'Priorytet sredni',
  low: 'Priorytet niski',
} as const;

const PRIORITY_ACCENTS = {
  high: 'rose',
  medium: 'amber',
  low: 'emerald',
} as const;

const QUEST_STATUS_LABELS = {
  completed: 'Misja ukonczona',
  in_progress: 'Misja w toku',
  not_started: 'Misja czeka',
} as const;

const QUEST_STATUS_ACCENTS = {
  completed: 'emerald',
  in_progress: 'indigo',
  not_started: 'slate',
} as const;

export function KangurGameHomeQuestWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeQuestWidgetProps = {}): React.JSX.Element | null {
  const runtime = useKangurGameRuntime();
  const { basePath, progress, screen } = runtime;
  const quest = useMemo(() => getCurrentKangurDailyQuest(progress), [progress]);
  const averageXpPerSession = useMemo(() => getProgressAverageXpPerSession(progress), [progress]);
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
              className='text-[11px] uppercase tracking-[0.16em]'
              data-testid='kangur-home-quest-label'
            >
              {assignment.questLabel ?? 'Misja dnia'}
            </KangurStatusChip>
            <KangurStatusChip
              accent={PRIORITY_ACCENTS[assignment.priority]}
              className='text-[11px] uppercase tracking-[0.16em]'
              data-testid='kangur-home-quest-priority'
            >
              {PRIORITY_LABELS[assignment.priority]}
            </KangurStatusChip>
            <KangurStatusChip
              accent={QUEST_STATUS_ACCENTS[quest.progress.status]}
              className='text-[11px] uppercase tracking-[0.16em]'
              data-testid='kangur-home-quest-status'
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
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-home-quest-reward'
              >
                {quest.reward.label}
              </KangurStatusChip>
            ) : null}
            <KangurStatusChip
              accent='slate'
              className='text-[11px] uppercase tracking-[0.16em]'
              data-testid='kangur-home-quest-expiry'
            >
              {quest.expiresLabel}
            </KangurStatusChip>
          </div>

          <div className='mt-4 text-2xl font-extrabold tracking-tight text-slate-900'>
            {assignment.title}
          </div>
          <p className='mt-3 max-w-2xl text-sm leading-7 text-slate-600'>
            {assignment.description}
          </p>

          <div className='mt-4 flex flex-wrap gap-2'>
            <KangurStatusChip
              accent='amber'
              className='text-[11px] uppercase tracking-[0.14em]'
              data-testid='kangur-home-quest-target'
              size='sm'
            >
              Cel: {assignment.target}
            </KangurStatusChip>
            <KangurStatusChip
              accent='slate'
              className='text-[11px] uppercase tracking-[0.14em]'
              data-testid='kangur-home-quest-progress'
              size='sm'
            >
              {quest.progress.summary}
            </KangurStatusChip>
          </div>

          {currentWinStreak > 0 || averageXpPerSession > 0 || visibleLeadingTrack ? (
            <div
              className='mt-4 flex flex-wrap gap-2'
              data-testid='kangur-home-quest-momentum'
            >
              {currentWinStreak > 0 ? (
                <KangurStatusChip
                  accent='rose'
                  className='text-[11px] uppercase tracking-[0.14em]'
                  data-testid='kangur-home-quest-streak'
                  size='sm'
                >
                  Seria: {currentWinStreak}
                </KangurStatusChip>
              ) : null}
              {averageXpPerSession > 0 ? (
                <KangurStatusChip
                  accent='violet'
                  className='text-[11px] uppercase tracking-[0.14em]'
                  data-testid='kangur-home-quest-xp-rate'
                  size='sm'
                >
                  Tempo: {averageXpPerSession} XP / gre
                </KangurStatusChip>
              ) : null}
              {visibleLeadingTrack ? (
                <KangurStatusChip
                  accent='indigo'
                  className='text-[11px] uppercase tracking-[0.14em]'
                  data-testid='kangur-home-quest-track'
                  size='sm'
                >
                  Na fali: {visibleLeadingTrack.label}
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

        <div className='shrink-0'>
          <KangurButton asChild className='w-full lg:w-auto' variant='primary'>
            <Link
              href={buildAssignmentHref(basePath, assignment.action)}
              targetPageKey={assignment.action.page}
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
