import { useTranslations } from 'next-intl';
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
  KangurInfoCard,
  KangurPanelIntro,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { cn } from '@/features/kangur/shared/utils';

const LEARNER_PROFILE_PERFORMANCE_ROUTE_ACKNOWLEDGE_MS = 110;

function KangurLearnerProfileOperationStat({
  dataTestId,
  label,
  value,
}: {
  dataTestId: string;
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div
      className='rounded-[18px] border px-3 py-2 [border-color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_74%,transparent)]'
      data-testid={dataTestId}
    >
      <div className='text-[10px] font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
        {label}
      </div>
      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>{value}</div>
    </div>
  );
}

export function KangurLearnerProfilePerformanceWidget(): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.performance');
  const { basePath, maxWeeklyGames, snapshot } = useKangurLearnerProfileRuntime();
  const isCoarsePointer = useKangurCoarsePointer();
  const { entry: performanceContent } = useKangurPageContentEntry('learner-profile-performance');
  const sectionTitle = performanceContent?.title ?? translations('title');
  const sectionSummary =
    performanceContent?.summary ??
    translations('summary');
  const operationActionClassName = isCoarsePointer
    ? 'min-h-11 w-full px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPanelIntro
        data-testid='learner-profile-performance-intro'
        description={sectionSummary}
        eyebrow={sectionTitle}
      />
      <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <KangurGlassPanel padding='lg' surface='mistStrong' variant='soft'>
          <KangurPanelSectionHeading>{translations('activityHeading')}</KangurPanelSectionHeading>
          <div className={`mb-4 ${KANGUR_WRAP_ROW_CLASSNAME}`}>
            <KangurStatusChip accent='violet' data-testid='learner-profile-xp-summary-today'>
              {translations('todayChip', { xp: snapshot.todayXpEarned })}
            </KangurStatusChip>
            <KangurStatusChip accent='indigo' data-testid='learner-profile-xp-summary-weekly'>
              {translations('weeklyChip', { xp: snapshot.weeklyXpEarned })}
            </KangurStatusChip>
            <KangurStatusChip accent='teal' data-testid='learner-profile-xp-summary-average'>
              {translations('averageChip', { xp: snapshot.averageXpPerSession })}
            </KangurStatusChip>
            {snapshot.recommendedSessionsCompleted > 0 ? (
              <KangurStatusChip accent='sky' data-testid='learner-profile-xp-summary-guided'>
                {translations('guidedChipPrefix', {
                  count: snapshot.recommendedSessionsCompleted,
                })}{' '}
                {snapshot.recommendedSessionNextBadgeName
                  ? `${snapshot.recommendedSessionNextBadgeName} ${snapshot.recommendedSessionSummary}`
                  : translations('guidedChipUnlocked')}
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
                <div
                  key={point.dateKey}
                  className='flex min-w-[0] flex-1 flex-col items-center gap-1'
                >
                  <KangurActivityColumn
                    accent='indigo'
                    active={point.games > 0}
                    data-testid={`learner-profile-weekly-activity-${point.dateKey}`}
                    title={translations('activityBarTitle', {
                      count: point.games,
                      accuracy: point.averageAccuracy,
                    })}
                    value={heightPercent}
                  />
                  <div className='text-[11px] [color:var(--kangur-page-muted-text)]'>
                    {point.label}
                  </div>
                </div>
              );
            })}
          </div>
        </KangurGlassPanel>

        <KangurGlassPanel padding='lg' surface='solid' variant='subtle'>
          <KangurPanelSectionHeading>{translations('operationsHeading')}</KangurPanelSectionHeading>
          <div className='flex flex-col kangur-panel-gap'>
            {snapshot.operationPerformance.length === 0 ? (
              <KangurEmptyState
                accent='slate'
                align='center'
                data-testid='learner-profile-operation-empty'
                description={translations('emptyDescription')}
                padding='md'
                title={translations('emptyTitle')}
              />
            ) : (
              snapshot.operationPerformance.map((item) => (
                <KangurInfoCard
                  className='flex flex-col gap-3'
                  data-testid={`learner-profile-operation-card-${item.operation}`}
                  key={item.operation}
                  padding='md'
                  tone='muted'
                >
                  <div className='flex flex-col gap-3'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='text-[11px] font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                          {item.emoji} {item.label}
                        </div>
                        <div
                          className='mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1'
                          data-testid={`learner-profile-operation-accuracy-${item.operation}`}
                        >
                          <span className='text-3xl font-semibold leading-none [color:var(--kangur-page-text)]'>
                            {item.averageAccuracy}%
                          </span>
                          <span className='text-sm [color:var(--kangur-page-muted-text)]'>
                            {translations('accuracyLabel')}
                          </span>
                        </div>
                      </div>
                      <KangurButton
                        asChild
                        className={cn('shrink-0 self-start', operationActionClassName)}
                        size='sm'
                        variant='surface'
                      >
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
                          {translations('train')}
                        </Link>
                      </KangurButton>
                    </div>
                    <div className='grid gap-2 sm:grid-cols-2'>
                      <KangurLearnerProfileOperationStat
                        dataTestId={`learner-profile-operation-attempts-${item.operation}`}
                        label={translations('attemptsLabel')}
                        value={String(item.attempts)}
                      />
                      <KangurLearnerProfileOperationStat
                        dataTestId={`learner-profile-operation-average-xp-${item.operation}`}
                        label={translations('averageXpLabel')}
                        value={`${item.averageXpPerSession} XP`}
                      />
                      <KangurLearnerProfileOperationStat
                        dataTestId={`learner-profile-operation-total-xp-${item.operation}`}
                        label={translations('totalXpLabel')}
                        value={`${item.totalXpEarned} XP`}
                      />
                      <KangurLearnerProfileOperationStat
                        dataTestId={`learner-profile-operation-best-score-${item.operation}`}
                        label={translations('bestAccuracyLabel')}
                        value={`${item.bestScore}%`}
                      />
                    </div>
                  </div>
                  <KangurProgressBar
                    accent='indigo'
                    data-testid={`learner-profile-operation-progress-${item.operation}`}
                    size='sm'
                    value={item.averageAccuracy}
                  />
                </KangurInfoCard>
              ))
            )}
          </div>
        </KangurGlassPanel>
      </div>
    </section>
  );
}
