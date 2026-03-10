'use client';

import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  buildKangurOperationPracticeHref,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurActivityColumn,
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';

export function KangurLearnerProfilePerformanceWidget(): React.JSX.Element {
  const { basePath, maxWeeklyGames, snapshot } = useKangurLearnerProfileRuntime();

  return (
    <section className='grid grid-cols-1 gap-4 xl:grid-cols-5'>
      <KangurGlassPanel
        className='xl:col-span-3'
        padding='lg'
        surface='mistStrong'
        variant='soft'
      >
        <div className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
          Aktywnosc 7 dni
        </div>
        <div className='mb-4 flex flex-wrap gap-2'>
          <KangurStatusChip accent='violet' data-testid='learner-profile-xp-summary-today'>
            Dzis: +{snapshot.todayXpEarned} XP
          </KangurStatusChip>
          <KangurStatusChip accent='indigo' data-testid='learner-profile-xp-summary-weekly'>
            7 dni: +{snapshot.weeklyXpEarned} XP
          </KangurStatusChip>
          <KangurStatusChip accent='teal' data-testid='learner-profile-xp-summary-average'>
            Srednio: {snapshot.averageXpPerSession} XP / sesje
          </KangurStatusChip>
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
                <div className='text-[11px] text-slate-500'>{point.label}</div>
              </div>
            );
          })}
        </div>
      </KangurGlassPanel>

      <KangurGlassPanel className='xl:col-span-2' padding='lg' surface='solid' variant='subtle'>
        <div className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
          Wyniki wg operacji
        </div>
        <div className='flex flex-col gap-3'>
          {snapshot.operationPerformance.length === 0 ? (
            <KangurEmptyState
              accent='slate'
              align='center'
              data-testid='learner-profile-operation-empty'
              description='Rozegraj kilka zadan, aby zobaczyc skutecznosc dla poszczegolnych operacji.'
              padding='md'
              title='Brak danych o operacjach.'
            />
          ) : (
            snapshot.operationPerformance.map((item) => (
              <div key={item.operation}>
                <div className='mb-1 flex items-center justify-between gap-2 text-sm text-slate-600'>
                  <span className='font-semibold'>
                    {item.emoji} {item.label}
                  </span>
                  <div className='flex items-center gap-2'>
                    <span>{item.averageAccuracy}%</span>
                    <KangurButton asChild size='sm' variant='surface'>
                      <Link
                        href={buildKangurOperationPracticeHref(
                          basePath,
                          item.operation,
                          item.averageAccuracy
                        )}
                        targetPageKey='Game'
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
                <div className='mt-1 text-[11px] text-slate-500'>
                  Proby: {item.attempts} · XP / sesje: {item.averageXpPerSession} · Lacznie:{' '}
                  {item.totalXpEarned} XP · Najlepsza skutecznosc: {item.bestScore}%
                </div>
              </div>
            ))
          )}
        </div>
      </KangurGlassPanel>
    </section>
  );
}
