'use client';

import { BarChart2, Flame, Target } from 'lucide-react';

import { KangurPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfileOverviewWidget(): React.JSX.Element {
  const { snapshot } = useKangurLearnerProfileRuntime();

  return (
    <section className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      <KangurPanel padding='md' variant='soft'>
        <div className='inline-flex items-center gap-2 text-sm font-semibold text-indigo-600'>
          <BarChart2 className='h-4 w-4' /> Srednia skutecznosc
        </div>
        <p className='mt-2 text-3xl font-extrabold text-indigo-700'>{snapshot.averageAccuracy}%</p>
        <p className='mt-1 text-xs text-gray-500'>Najlepsza sesja: {snapshot.bestAccuracy}%</p>
      </KangurPanel>

      <KangurPanel padding='md' variant='soft'>
        <div className='inline-flex items-center gap-2 text-sm font-semibold text-orange-500'>
          <Flame className='h-4 w-4' /> Seria dni
        </div>
        <p className='mt-2 text-3xl font-extrabold text-orange-600'>
          {snapshot.currentStreakDays}
        </p>
        <p className='mt-1 text-xs text-gray-500'>Najdluzsza: {snapshot.longestStreakDays} dni</p>
      </KangurPanel>

      <KangurPanel padding='md' variant='soft'>
        <div className='inline-flex items-center gap-2 text-sm font-semibold text-teal-600'>
          <Target className='h-4 w-4' /> Cel dzienny
        </div>
        <p className='mt-2 text-3xl font-extrabold text-teal-600'>
          {snapshot.todayGames}/{snapshot.dailyGoalGames}
        </p>
        <p className='mt-1 text-xs text-gray-500'>Wypelnienie: {snapshot.dailyGoalPercent}%</p>
      </KangurPanel>

      <KangurPanel padding='md' variant='soft'>
        <div className='inline-flex items-center gap-2 text-sm font-semibold text-amber-600'>
          🏅 Odznaki
        </div>
        <p className='mt-2 text-3xl font-extrabold text-amber-600'>
          {snapshot.unlockedBadges}/{snapshot.totalBadges}
        </p>
        <p className='mt-1 text-xs text-gray-500'>Odblokowane osiagniecia</p>
      </KangurPanel>
    </section>
  );
}
