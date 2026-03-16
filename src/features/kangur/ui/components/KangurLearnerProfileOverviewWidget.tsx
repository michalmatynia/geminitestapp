'use client';

import { Award, BarChart2, Compass, Flame, Sparkles, Target } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurMetricCard,
  KangurPanelIntro,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import {
  getCurrentKangurDailyQuest,
  type KangurDailyQuestState,
} from '@/features/kangur/ui/services/daily-quests';
import { getNextLockedBadge } from '@/features/kangur/ui/services/progress';

export function KangurLearnerProfileOverviewWidget(): React.JSX.Element {
  const { progress, snapshot } = useKangurLearnerProfileRuntime();
  const { entry: overviewContent } = useKangurPageContentEntry('learner-profile-overview');
  const nextBadge = getNextLockedBadge(progress);
  const [dailyQuest, setDailyQuest] = useState<KangurDailyQuestState | null | undefined>(undefined);

  useEffect(() => {
    setDailyQuest(getCurrentKangurDailyQuest(progress));
  }, [progress]);

  const dailyQuestAccent =
    dailyQuest?.reward.status === 'claimed'
      ? 'emerald'
      : dailyQuest?.progress.status === 'completed'
        ? 'amber'
        : dailyQuest?.progress.status === 'in_progress'
          ? 'indigo'
          : 'slate';

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPanelIntro
        data-testid='learner-profile-overview-intro'
        description={
          overviewContent?.summary ??
          'Najważniejsze wskaźniki dnia: skuteczność, misja, cel i odznaki w jednym widoku.'
        }
        eyebrow={overviewContent?.title ?? 'Przegląd wyników'}
      />
      <div
        className={`grid grid-cols-1 ${KANGUR_PANEL_GAP_CLASSNAME} min-[360px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6`}
      >
      <KangurMetricCard
        accent='indigo'
        data-testid='learner-profile-overview-average-accuracy'
        description={`Najlepsza sesja: ${snapshot.bestAccuracy}%`}
        label={
          <span className='inline-flex items-center gap-2'>
            <BarChart2 className='h-4 w-4' /> Średnia skuteczność
          </span>
        }
        value={`${snapshot.averageAccuracy}%`}
      />

      <KangurMetricCard
        accent='amber'
        data-testid='learner-profile-overview-streak'
        description={`Najdłuższa: ${snapshot.longestStreakDays} dni`}
        label={
          <span className='inline-flex items-center gap-2'>
            <Flame className='h-4 w-4' /> Seria dni
          </span>
        }
        value={snapshot.currentStreakDays}
      />

      <KangurMetricCard
        accent='violet'
        data-testid='learner-profile-overview-xp-today'
        description={`7 dni: +${snapshot.weeklyXpEarned} XP · średnio ${snapshot.averageXpPerSession} XP na sesję`}
        label={
          <span className='inline-flex items-center gap-2'>
            <Sparkles className='h-4 w-4' /> XP dzisiaj
          </span>
        }
        value={`+${snapshot.todayXpEarned}`}
      />

      {snapshot.recommendedSessionsCompleted > 0 ? (
        <KangurMetricCard
          accent='sky'
          data-testid='learner-profile-overview-guided-rounds'
          description={
            snapshot.recommendedSessionNextBadgeName
              ? `Do odznaki: ${snapshot.recommendedSessionNextBadgeName} · ${snapshot.recommendedSessionSummary}`
              : 'Wszystkie odznaki polecanego kierunku odblokowane.'
          }
          label={
            <span className='inline-flex items-center gap-2'>
              <Compass className='h-4 w-4' /> Polecone rundy
            </span>
          }
          value={snapshot.recommendedSessionsCompleted}
          valueClassName='text-2xl sm:text-3xl'
        >
          <div className='space-y-2 pt-1'>
            <p className='text-xs font-semibold [color:var(--kangur-page-text)]'>
              {snapshot.recommendedSessionSummary}
            </p>
            <KangurProgressBar
              accent='sky'
              data-testid='learner-profile-overview-guided-rounds-bar'
              size='sm'
              value={snapshot.recommendedSessionProgressPercent}
            />
          </div>
        </KangurMetricCard>
      ) : null}

      <KangurMetricCard
        accent={dailyQuestAccent}
        data-testid='learner-profile-overview-daily-quest'
        description={
          dailyQuest
            ? `${dailyQuest.progress.summary} · ${dailyQuest.reward.label}`
            : dailyQuest === null
              ? 'Nowa misja pojawi się wraz z postępem.'
              : 'Trwa ładowanie misji dnia...'
        }
        label={
          <span className='inline-flex items-center gap-2'>
            <Target className='h-4 w-4' /> Misja dnia
          </span>
        }
        value={dailyQuest ? `${dailyQuest.progress.percent}%` : dailyQuest === null ? '—' : '...'}
        valueClassName='text-2xl sm:text-3xl'
      >
        {dailyQuest ? (
          <div className='space-y-2 pt-1'>
            <p className='text-xs font-semibold [color:var(--kangur-page-text)]'>
              {dailyQuest.assignment.title}
            </p>
            <KangurProgressBar
              accent={dailyQuest.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent}
              data-testid='learner-profile-overview-daily-quest-bar'
              size='sm'
              value={dailyQuest.progress.percent}
            />
          </div>
        ) : null}
      </KangurMetricCard>

      <KangurMetricCard
        accent='teal'
        data-testid='learner-profile-overview-daily-goal'
        description={`Wypełnienie: ${snapshot.dailyGoalPercent}%`}
        label={
          <span className='inline-flex items-center gap-2'>
            <Target className='h-4 w-4' /> Cel dzienny
          </span>
        }
        value={`${snapshot.todayGames}/${snapshot.dailyGoalGames}`}
      />

      <KangurMetricCard
        accent='amber'
        data-testid='learner-profile-overview-badges'
        description={
          nextBadge
            ? `Następna: ${nextBadge.name} · ${nextBadge.summary}`
            : 'Wszystkie odznaki odblokowane'
        }
        label={
          <span className='inline-flex items-center gap-2'>
            <Award className='h-4 w-4' /> Odznaki
          </span>
        }
        value={`${snapshot.unlockedBadges}/${snapshot.totalBadges}`}
      />
      </div>
    </section>
  );
}
