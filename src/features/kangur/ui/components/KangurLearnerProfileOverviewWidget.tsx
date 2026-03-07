'use client';

import { BarChart2, Flame, Target } from 'lucide-react';

import { KangurMetricCard } from '@/features/kangur/ui/design/primitives';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfileOverviewWidget(): React.JSX.Element {
  const { snapshot } = useKangurLearnerProfileRuntime();

  return (
    <section className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
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
        description='Odblokowane osiagniecia'
        label={<span className='inline-flex items-center gap-2'>🏅 Odznaki</span>}
        value={`${snapshot.unlockedBadges}/${snapshot.totalBadges}`}
      />
    </section>
  );
}
