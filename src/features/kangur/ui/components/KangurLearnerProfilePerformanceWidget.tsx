'use client';

import Link from 'next/link';

import {
  KangurActivityColumn,
  KangurButton,
  KangurPanel,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import {
  buildKangurOperationPracticeHref,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfilePerformanceWidget(): React.JSX.Element {
  const { basePath, maxWeeklyGames, snapshot } = useKangurLearnerProfileRuntime();

  return (
    <section className='grid grid-cols-1 gap-4 xl:grid-cols-5'>
      <KangurPanel className='xl:col-span-3' padding='lg' variant='soft'>
        <div className='mb-3 text-sm font-bold uppercase tracking-wide text-gray-500'>
          Aktywnosc 7 dni
        </div>
        <div className='flex h-32 items-end gap-2'>
          {snapshot.weeklyActivity.map((point) => {
            const heightPercent =
              point.games === 0
                ? 6
                : Math.max(14, Math.round((point.games / maxWeeklyGames) * 100));
            return (
              <div key={point.dateKey} className='flex min-w-[0] flex-1 flex-col items-center gap-1'>
                <KangurActivityColumn
                  accent='indigo'
                  active={point.games > 0}
                  data-testid={`learner-profile-weekly-activity-${point.dateKey}`}
                  title={`${point.games} gier, srednia ${point.averageAccuracy}%`}
                  value={heightPercent}
                />
                <div className='text-[11px] text-gray-500'>{point.label}</div>
              </div>
            );
          })}
        </div>
      </KangurPanel>

      <KangurPanel className='xl:col-span-2' padding='lg' variant='soft'>
        <div className='mb-3 text-sm font-bold uppercase tracking-wide text-gray-500'>
          Wyniki wg operacji
        </div>
        <div className='flex flex-col gap-3'>
          {snapshot.operationPerformance.length === 0 ? (
            <div className='py-6 text-center text-sm text-gray-400'>Brak danych o operacjach.</div>
          ) : (
            snapshot.operationPerformance.map((item) => (
              <div key={item.operation}>
                <div className='mb-1 flex items-center justify-between gap-2 text-sm text-gray-600'>
                  <span className='font-semibold'>
                    {item.emoji} {item.label}
                  </span>
                  <div className='flex items-center gap-2'>
                    <span>{item.averageAccuracy}%</span>
                    <KangurButton asChild size='sm' variant='secondary'>
                      <Link
                        href={buildKangurOperationPracticeHref(
                          basePath,
                          item.operation,
                          item.averageAccuracy
                        )}
                      >
                        Trenuj
                      </Link>
                    </KangurButton>
                  </div>
                </div>
                <KangurProgressBar
                  accent='indigo'
                  data-testid={`learner-profile-operation-progress-${item.operation}`}
                  size='sm'
                  value={item.averageAccuracy}
                />
                <div className='mt-1 text-[11px] text-gray-500'>
                  Proby: {item.attempts} · Najlepsza skutecznosc: {item.bestScore}%
                </div>
              </div>
            ))
          )}
        </div>
      </KangurPanel>
    </section>
  );
}
