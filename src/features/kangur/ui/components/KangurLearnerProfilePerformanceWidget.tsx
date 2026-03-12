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
  KangurPanelIntro,
  KangurProgressBar,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

const LEARNER_PROFILE_PERFORMANCE_ROUTE_ACKNOWLEDGE_MS = 110;

export function KangurLearnerProfilePerformanceWidget(): React.JSX.Element {
  const { basePath, maxWeeklyGames, snapshot } = useKangurLearnerProfileRuntime();
  const { entry: performanceContent } = useKangurPageContentEntry('learner-profile-performance');
  const sectionTitle = performanceContent?.title ?? 'Skutecznosc ucznia';
  const sectionSummary =
    performanceContent?.summary ??
    'Zobacz rytm ostatnich siedmiu dni i skutecznosc dla poszczegolnych operacji.';

  return (
    <section className='flex flex-col gap-4'>
      <KangurPanelIntro
        data-testid='learner-profile-performance-intro'
        description={sectionSummary}
        eyebrow={sectionTitle}
      />
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-5'>
      <KangurGlassPanel
        className='xl:col-span-3'
        padding='lg'
        surface='mistStrong'
        variant='soft'
      >
        <KangurSectionEyebrow className='mb-3'>
          Aktywnosc 7 dni
        </KangurSectionEyebrow>
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
          {snapshot.recommendedSessionsCompleted > 0 ? (
            <KangurStatusChip accent='sky' data-testid='learner-profile-xp-summary-guided'>
              Polecone: {snapshot.recommendedSessionsCompleted} ·{' '}
              {snapshot.recommendedSessionNextBadgeName
                ? `${snapshot.recommendedSessionNextBadgeName} ${snapshot.recommendedSessionSummary}`
                : 'wszystkie odznaki kierunku odblokowane'}
            </KangurStatusChip>
          ) : null}
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
                <div className='text-[11px] [color:var(--kangur-page-muted-text)]'>{point.label}</div>
              </div>
            );
          })}
        </div>
      </KangurGlassPanel>

      <KangurGlassPanel className='xl:col-span-2' padding='lg' surface='solid' variant='subtle'>
        <KangurSectionEyebrow className='mb-3'>
          Wyniki wg operacji
        </KangurSectionEyebrow>
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
                <div className='mb-1 flex flex-col gap-2 text-sm [color:var(--kangur-page-muted-text)] sm:flex-row sm:items-center sm:justify-between'>
                  <span className='font-semibold'>
                    {item.emoji} {item.label}
                  </span>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span>{item.averageAccuracy}%</span>
                    <KangurButton asChild size='sm' variant='surface'>
                      <Link
                        href={buildKangurOperationPracticeHref(
                          basePath,
                          item.operation,
                          item.averageAccuracy
                        )}
                        targetPageKey='Game'
                        transitionAcknowledgeMs={
                          LEARNER_PROFILE_PERFORMANCE_ROUTE_ACKNOWLEDGE_MS
                        }
                        transitionSourceId={`learner-profile-performance:${item.operation}`}
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
                <div className='mt-1 text-[11px] [color:var(--kangur-page-muted-text)]'>
                  Proby: {item.attempts} · XP / sesje: {item.averageXpPerSession} · Lacznie:{' '}
                  {item.totalXpEarned} XP · Najlepsza skutecznosc: {item.bestScore}%
                </div>
              </div>
            ))
          )}
        </div>
      </KangurGlassPanel>
      </div>
    </section>
  );
}
