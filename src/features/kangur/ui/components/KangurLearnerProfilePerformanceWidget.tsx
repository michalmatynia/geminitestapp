import { KangurPanelSectionHeading } from '@/features/kangur/ui/components/KangurPanelSectionHeading';
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
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

const LEARNER_PROFILE_PERFORMANCE_ROUTE_ACKNOWLEDGE_MS = 110;

export function KangurLearnerProfilePerformanceWidget(): React.JSX.Element {
  const { basePath, maxWeeklyGames, snapshot } = useKangurLearnerProfileRuntime();
  const { entry: performanceContent } = useKangurPageContentEntry('learner-profile-performance');
  const sectionTitle = performanceContent?.title ?? 'Skuteczność ucznia';
  const sectionSummary =
    performanceContent?.summary ??
    'Zobacz rytm ostatnich siedmiu dni i skuteczność dla poszczególnych operacji.';

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPanelIntro
        data-testid='learner-profile-performance-intro'
        description={sectionSummary}
        eyebrow={sectionTitle}
      />
      <div className={`grid grid-cols-1 ${KANGUR_PANEL_GAP_CLASSNAME} xl:grid-cols-5`}>
      <KangurGlassPanel
        className='xl:col-span-3'
        padding='lg'
        surface='mistStrong'
        variant='soft'
      >
        <KangurPanelSectionHeading>Aktywność 7 dni</KangurPanelSectionHeading>
        <div className='mb-4 flex flex-wrap gap-2'>
          <KangurStatusChip accent='violet' data-testid='learner-profile-xp-summary-today'>
            Dziś: +{snapshot.todayXpEarned} XP
          </KangurStatusChip>
          <KangurStatusChip accent='indigo' data-testid='learner-profile-xp-summary-weekly'>
            7 dni: +{snapshot.weeklyXpEarned} XP
          </KangurStatusChip>
          <KangurStatusChip accent='teal' data-testid='learner-profile-xp-summary-average'>
            Średnio: {snapshot.averageXpPerSession} XP na sesję
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
                  title={`${point.games} gier, średnia ${point.averageAccuracy}%`}
                  value={heightPercent}
                />
                <div className='text-[11px] [color:var(--kangur-page-muted-text)]'>{point.label}</div>
              </div>
            );
          })}
        </div>
      </KangurGlassPanel>

      <KangurGlassPanel className='xl:col-span-2' padding='lg' surface='solid' variant='subtle'>
        <KangurPanelSectionHeading>Wyniki wg operacji</KangurPanelSectionHeading>
        <div className='flex flex-col kangur-panel-gap'>
          {snapshot.operationPerformance.length === 0 ? (
            <KangurEmptyState
              accent='slate'
              align='center'
              data-testid='learner-profile-operation-empty'
              description='Rozegraj kilka zadań, aby zobaczyć skuteczność dla poszczególnych operacji.'
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
                    <KangurButton asChild className='w-full sm:w-auto' size='sm' variant='surface'>
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
                  Próby: {item.attempts} · XP na sesję: {item.averageXpPerSession} · Łącznie:{' '}
                  {item.totalXpEarned} XP · Najlepsza skuteczność: {item.bestScore}%
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
