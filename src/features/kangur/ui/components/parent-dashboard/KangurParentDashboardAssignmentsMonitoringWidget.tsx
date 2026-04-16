'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurPanelIntro,
  KangurPanelStack,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  type InteractionFilter,
} from './KangurParentDashboardAssignmentsMonitoringWidget.utils';
import {
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WIDGET_TITLE_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

import { MonitoringWidgetProvider, useMonitoringWidgetContext } from './MonitoringWidget.context';

const MONITORING_FALLBACK_COPY = {
  clearFilters: 'Wyczyść filtry',
  dateFromLabel: 'Data od',
  dateToLabel: 'Data do',
  description:
    'Monitoruj postęp przypisanych zadań, w tym sugestii StudiQ, aby utrzymać stały rytm nauki.',
  eyebrow: 'Monitorowanie',
  filters: {
    all: 'Wszystkie',
    lessonPanel: 'Panele lekcji',
    openedTask: 'Zadania',
    session: 'Sesje',
  },
  history: {
    description: 'Ostatnie interakcje ucznia: otwarte zadania, aktywność w panelach oraz sesje logowania.',
    empty: 'Brak interakcji do pokazania.',
    error: 'Nie udało się wczytać historii interakcji.',
    loadMore: 'Pokaż starsze',
    loading: 'Ładowanie...',
    title: 'Historia interakcji',
  },
  lessonFocus: {
    empty: 'Brak lekcji z czasem paneli do porównania.',
  },
  lessonPanelTimeTitle: 'Czas w panelach lekcji',
  title: 'Monitorowanie zadań',
} as const;

const resolveMonitoringInteractionFilterOptions = (
  translate: (key: string, fallback: string, values?: Record<string, string | number>) => string
): ReadonlyArray<LabeledOptionDto<InteractionFilter>> =>
  [
    {
      value: 'all',
      label: translate('widgets.monitoring.filters.all', MONITORING_FALLBACK_COPY.filters.all),
    },
    {
      value: 'opened_task',
      label: translate(
        'widgets.monitoring.filters.openedTask',
        MONITORING_FALLBACK_COPY.filters.openedTask
      ),
    },
    {
      value: 'lesson_panel',
      label: translate(
        'widgets.monitoring.filters.lessonPanel',
        MONITORING_FALLBACK_COPY.filters.lessonPanel
      ),
    },
    {
      value: 'session',
      label: translate(
        'widgets.monitoring.filters.session',
        MONITORING_FALLBACK_COPY.filters.session
      ),
    },
  ];

function KangurParentDashboardMonitoringOverviewCards(): React.JSX.Element {
  const { averageSessionDurationLabel, interactionCounts } = useMonitoringWidgetContext();
  return (
    <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
      <KangurGlassPanel
        data-testid='parent-monitoring-overview-total'
        padding='md'
        surface='solid'
        variant='soft'
      >
        <div className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
          Interakcje
        </div>
        <div className='mt-1 text-3xl font-extrabold text-slate-900'>{interactionCounts.total}</div>
      </KangurGlassPanel>
      <KangurGlassPanel
        data-testid='parent-monitoring-overview-sessions'
        padding='md'
        surface='solid'
        variant='soft'
      >
        <div className='text-[10px] font-black uppercase tracking-wider text-slate-400'>Sesje</div>
        <div className='mt-1 text-3xl font-extrabold text-slate-900'>
          {interactionCounts.sessions}
        </div>
        {averageSessionDurationLabel ? (
          <p className='mt-2 text-xs font-semibold text-slate-500'>
            Średnia sesja: {averageSessionDurationLabel}
          </p>
        ) : null}
      </KangurGlassPanel>
      <KangurGlassPanel
        data-testid='parent-monitoring-overview-opened-tasks'
        padding='md'
        surface='solid'
        variant='soft'
      >
        <div className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
          Otwarte zadania
        </div>
        <div className='mt-1 text-3xl font-extrabold text-slate-900'>
          {interactionCounts.openedTasks}
        </div>
      </KangurGlassPanel>
      <KangurGlassPanel
        data-testid='parent-monitoring-overview-lesson-panels'
        padding='md'
        surface='solid'
        variant='soft'
      >
        <div className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
          Panele lekcji
        </div>
        <div className='mt-1 text-3xl font-extrabold text-slate-900'>
          {interactionCounts.lessonPanels}
        </div>
      </KangurGlassPanel>
    </div>
  );
}

function KangurParentDashboardMonitoringActivityMix(): React.JSX.Element {
  const { interactionCounts } = useMonitoringWidgetContext();
  return (
    <KangurGlassPanel padding='md' surface='mist' variant='soft'>
      <div className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
        Rozkład aktywności
      </div>
      <div className='mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3'>
        {[
          ['session', 'Sesje', interactionCounts.sessions],
          ['opened-task', 'Zadania', interactionCounts.openedTasks],
          ['lesson-panel', 'Panele lekcji', interactionCounts.lessonPanels],
        ].map(([id, label, count]) => (
          <div
            key={id}
            className='rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3'
            data-testid={`parent-monitoring-activity-mix-${id}`}
          >
            <div className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
              {label}
            </div>
            <div className='mt-1 text-2xl font-extrabold text-slate-900'>{count}</div>
          </div>
        ))}
      </div>
    </KangurGlassPanel>
  );
}

function KangurParentDashboardMonitoringHistoryFilters(): React.JSX.Element {
  const {
    hasActiveFilters,
    segmentedFilterClassName,
    translate,
    interactionFilter,
    setInteractionFilter,
    interactionDateFrom,
    setInteractionDateFrom,
    interactionDateTo,
    setInteractionDateTo,
  } = useMonitoringWidgetContext();

  const interactionFilterOptions = resolveMonitoringInteractionFilterOptions(translate);

  return (
    <div className='flex flex-wrap items-center gap-3'>
      <div className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full sm:w-auto`}>
        {interactionFilterOptions.map((option) => (
          <KangurButton
            aria-selected={interactionFilter === option.value}
            key={option.value}
            onClick={() => setInteractionFilter(option.value)}
            role='tab'
            variant={interactionFilter === option.value ? 'segmentActive' : 'segment'}
            size='sm'
            className={segmentedFilterClassName}
          >
            {option.label}
          </KangurButton>
        ))}
      </div>
      <div className={KANGUR_TIGHT_ROW_CLASSNAME}>
        <KangurTextField
          aria-label={translate(
            'widgets.monitoring.filters.dateFromLabel',
            MONITORING_FALLBACK_COPY.dateFromLabel
          )}
          type='date'
          value={interactionDateFrom}
          onChange={(e) => setInteractionDateFrom(e.target.value)}
          size='sm'
          className='w-32'
        />
        <span className='text-slate-400'>-</span>
        <KangurTextField
          aria-label={translate(
            'widgets.monitoring.filters.dateToLabel',
            MONITORING_FALLBACK_COPY.dateToLabel
          )}
          type='date'
          value={interactionDateTo}
          onChange={(e) => setInteractionDateTo(e.target.value)}
          size='sm'
          className='w-32'
        />
        {hasActiveFilters ? (
          <KangurButton
            onClick={() => {
              setInteractionFilter('all');
              setInteractionDateFrom('');
              setInteractionDateTo('');
            }}
            size='sm'
            variant='surface'
            className={segmentedFilterClassName}
          >
            {translate('widgets.monitoring.filters.clear', MONITORING_FALLBACK_COPY.clearFilters)}
          </KangurButton>
        ) : null}
      </div>
    </div>
  );
}

function KangurParentDashboardMonitoringHistoryContent(): React.JSX.Element {
  const {
    activeLearnerId,
    fetchInteractions,
    interactionsError,
    interactionsLoadMoreError,
    isLoadingMoreInteractions,
    filteredInteractionViews,
    formatTimestamp,
    hasMoreInteractions,
    nextInteractionOffset,
    shouldShowLoadingState,
    translate,
  } = useMonitoringWidgetContext();

  if (shouldShowLoadingState) {
    return (
      <KangurEmptyState
        accent='slate'
        data-testid='parent-monitoring-interactions-loading'
        description={translate(
          'widgets.monitoring.history.loadingDescription',
          MONITORING_FALLBACK_COPY.history.description
        )}
        title={translate(
          'widgets.monitoring.history.loadingTitle',
          MONITORING_FALLBACK_COPY.history.loading
        )}
      />
    );
  }

  if (interactionsError) {
    return (
      <KangurEmptyState
        accent='rose'
        data-testid='parent-monitoring-interactions-error'
        description={interactionsError}
        title={translate(
          'widgets.monitoring.history.loadError',
          MONITORING_FALLBACK_COPY.history.error
        )}
      />
    );
  }

  if (filteredInteractionViews.length === 0) {
    return (
      <KangurEmptyState
        accent='slate'
        data-testid='parent-monitoring-interactions-empty'
        description={translate(
          'widgets.monitoring.history.emptyDescription',
          MONITORING_FALLBACK_COPY.history.empty
        )}
      />
    );
  }

  return (
    <div className='space-y-3'>
      {filteredInteractionViews.map((view) => (
        <KangurGlassPanel
          key={view.id}
          className='space-y-2'
          data-testid={`parent-monitoring-interaction-${view.id}`}
          padding='md'
          surface='mistSoft'
          variant='soft'
        >
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <span className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
              {view.label}
            </span>
            <span className='text-[10px] font-bold text-slate-400'>
              {formatTimestamp(view.timestamp)}
            </span>
          </div>
          <div className='text-sm font-bold text-slate-900'>{view.description}</div>
        </KangurGlassPanel>
      ))}
      {hasMoreInteractions ? (
        <KangurButton
          onClick={() => {
            if (!activeLearnerId || nextInteractionOffset === null) return;
            void fetchInteractions(activeLearnerId, { offset: nextInteractionOffset });
          }}
          variant='surface'
          size='sm'
          className='w-full min-h-11 px-4 touch-manipulation'
          disabled={isLoadingMoreInteractions}
        >
          {isLoadingMoreInteractions
            ? translate(
                'widgets.monitoring.history.loadingMore',
                MONITORING_FALLBACK_COPY.history.loading
              )
            : translate(
                'widgets.monitoring.history.loadMore',
                MONITORING_FALLBACK_COPY.history.loadMore
              )}
        </KangurButton>
      ) : null}
      {interactionsLoadMoreError ? (
        <p className='text-center text-xs font-semibold text-rose-500'>
          {interactionsLoadMoreError}
        </p>
      ) : null}
    </div>
  );
}

function KangurParentDashboardMonitoringHistorySection(): React.JSX.Element {
  const { translate } = useMonitoringWidgetContext();
  return (
    <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
      <div className='flex items-center justify-between'>
        <h3 className={KANGUR_WIDGET_TITLE_CLASSNAME}>
          {translate('widgets.monitoring.history.title', MONITORING_FALLBACK_COPY.history.title)}
        </h3>
      </div>

      <KangurParentDashboardMonitoringHistoryFilters />

      <KangurParentDashboardMonitoringHistoryContent />
    </div>
  );
}

function KangurParentDashboardMonitoringLessonPanelTimeSection(): React.JSX.Element {
  const {
    formatLocalizedDuration,
    lessonPanelTimeCards,
    topLessonPanelCard,
    translate,
  } = useMonitoringWidgetContext();

  return (
    <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
      <h3 className={KANGUR_WIDGET_TITLE_CLASSNAME}>
        {translate(
          'widgets.monitoring.lessonPanelTime.title',
          MONITORING_FALLBACK_COPY.lessonPanelTimeTitle
        )}
      </h3>
      <KangurGlassPanel
        data-testid='parent-monitoring-lesson-focus'
        padding='md'
        surface='mist'
        variant='soft'
      >
        {topLessonPanelCard ? (
          <div className='space-y-1'>
            <div className='text-sm font-black text-slate-900'>{topLessonPanelCard.lesson.title}</div>
            <p className='text-xs font-semibold text-slate-500'>
              {formatLocalizedDuration(topLessonPanelCard.totalSeconds)}
            </p>
          </div>
        ) : (
          <p className='text-xs italic text-slate-400'>
            {MONITORING_FALLBACK_COPY.lessonFocus.empty}
          </p>
        )}
      </KangurGlassPanel>
      {lessonPanelTimeCards.length === 0 ? (
        <p className='text-xs italic text-slate-400'>
          {translate('widgets.monitoring.lessonPanelTime.empty', '')}
        </p>
      ) : (
        <div className='space-y-4'>
          {lessonPanelTimeCards.map((card) => (
            <KangurGlassPanel
              key={card.lesson.id ?? card.lesson.componentId}
              padding='md'
              surface='solid'
              variant='soft'
              className='space-y-3'
            >
              <div className='flex items-center gap-3'>
                <div className='text-xl'>{card.lesson.emoji}</div>
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-xs font-black text-slate-900'>{card.lesson.title}</div>
                  <div className='text-[10px] font-bold text-slate-400'>
                    {formatLocalizedDuration(card.totalSeconds)}
                  </div>
                </div>
              </div>
              <div className='space-y-2'>
                {card.sections.map((section) => (
                  <div key={section.id} className='space-y-1'>
                    <div className='flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400'>
                      <span className='truncate'>{section.label}</span>
                      <span>{formatLocalizedDuration(section.totalSeconds)}</span>
                    </div>
                    <div className='flex flex-wrap gap-1'>
                      {section.panels.map((panel) => (
                        <div
                          key={panel.id}
                          className='rounded-md bg-slate-100/80 px-1.5 py-0.5 text-[9px] font-black text-slate-500'
                          title={panel.title}
                        >
                          {panel.index !== Number.MAX_SAFE_INTEGER ? panel.index : 'P'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </KangurGlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}

export function KangurParentDashboardAssignmentsMonitoringWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { activeLearner, activeTab, canAccessDashboard } = useKangurParentDashboardRuntime();
  const activeLearnerId = activeLearner?.id ?? null;

  if (!canAccessDashboard) return null;
  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'monitoring')) return null;
  if (!activeLearnerId) return null;

  return (
    <MonitoringWidgetProvider>
      <KangurParentDashboardAssignmentsMonitoringWidgetContent />
    </MonitoringWidgetProvider>
  );
}

function KangurParentDashboardAssignmentsMonitoringWidgetContent(): React.JSX.Element {
  const { translate } = useMonitoringWidgetContext();
  const { entry: monitoringContent } = useKangurPageContentEntry('parent-dashboard-monitoring');

  return (
    <KangurPanelStack className='w-full' data-testid='parent-monitoring-overview'>
      <KangurPanelIntro
        eyebrow={translate('widgets.monitoring.eyebrow', MONITORING_FALLBACK_COPY.eyebrow)}
        title={
          monitoringContent?.title ??
          translate('widgets.monitoring.title', MONITORING_FALLBACK_COPY.title)
        }
        description={
          monitoringContent?.summary ??
          translate(
            'widgets.monitoring.description',
            MONITORING_FALLBACK_COPY.description
          )
        }
      />

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]'>
        <div className='space-y-6'>
          <KangurParentDashboardMonitoringOverviewCards />
          <KangurParentDashboardMonitoringActivityMix />
          <KangurParentDashboardMonitoringHistorySection />
        </div>

        <div className='space-y-6'>
          <KangurParentDashboardMonitoringLessonPanelTimeSection />
        </div>
      </div>
    </KangurPanelStack>
  );
}

export default KangurParentDashboardAssignmentsMonitoringWidget;
