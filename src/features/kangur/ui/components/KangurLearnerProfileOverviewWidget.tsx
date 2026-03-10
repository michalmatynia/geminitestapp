'use client';

import { Award, BarChart2, Flame, Sparkles, Target } from 'lucide-react';

import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { KangurMetricCard } from '@/features/kangur/ui/design/primitives';
import { getNextLockedBadge } from '@/features/kangur/ui/services/progress';

export function KangurLearnerProfileOverviewWidget(): React.JSX.Element {
  const { progress, snapshot } = useKangurLearnerProfileRuntime();
  const nextBadge = getNextLockedBadge(progress);

  return (
    <section className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5'>
      <KangurMetricCard
        accent='indigo'
        data-testid='learner-profile-overview-average-accuracy'
        description={`Najlepsza sesja: ${snapshot.bestAccuracy}%`}
        label={
          <span className='inline-flex items-center gap-2'>
            <BarChart2 className='h-4 w-4' /> Srednia skutecznosc
          </span>
        }
        value={`${snapshot.averageAccuracy}%`}
      />

      <KangurMetricCard
        accent='amber'
        data-testid='learner-profile-overview-streak'
        description={`Najdluzsza: ${snapshot.longestStreakDays} dni`}
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
        description={`7 dni: +${snapshot.weeklyXpEarned} XP · srednio ${snapshot.averageXpPerSession} XP na sesje`}
        label={
          <span className='inline-flex items-center gap-2'>
            <Sparkles className='h-4 w-4' /> XP dzisiaj
          </span>
        }
        value={`+${snapshot.todayXpEarned}`}
      />

      <KangurMetricCard
        accent='teal'
        data-testid='learner-profile-overview-daily-goal'
        description={`Wypelnienie: ${snapshot.dailyGoalPercent}%`}
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
            ? `Nastepna: ${nextBadge.name} · ${nextBadge.summary}`
            : 'Wszystkie odznaki odblokowane'
        }
        label={
          <span className='inline-flex items-center gap-2'>
            <Award className='h-4 w-4' /> Odznaki
          </span>
        }
        value={`${snapshot.unlockedBadges}/${snapshot.totalBadges}`}
      />
    </section>
  );
}
