'use client';

import { useLocale } from 'next-intl';
import React, { useMemo } from 'react';

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
  formatProgressTimestamp,
  type InteractionFilter,
  type InteractionView,
} from '@/features/kangur/ui/components/KangurParentDashboardAssignmentsMonitoringWidget.utils';
import {
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WIDGET_TITLE_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

import { useMonitoringWidgetState } from './monitoring-widget/MonitoringWidget.hooks';

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

type MonitoringWidgetState = ReturnType<typeof useMonitoringWidgetState>;
type MonitoringTranslate = (
  key: string,
  fallback: string,
  values?: Record<string, string | number>
) => string;
type MonitoringInteractionCounts = {
  lessonPanels: number;
  openedTasks: number;
  sessions: number;
  total: number;
  totalSessionSeconds: number;
};

function interpolateTemplate(
  template: string,
  values?: Record<string, string | number>
): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

const matchesInteractionKindFilter = (
  interactionFilter: InteractionFilter,
  view: InteractionView
): boolean => interactionFilter === 'all' || view.kind === interactionFilter;

const matchesInteractionDateFrom = (
  interactionDateFrom: string,
  viewDate: string | null
): boolean => !interactionDateFrom || Boolean(viewDate && viewDate >= interactionDateFrom);

const matchesInteractionDateTo = (
  interactionDateTo: string,
  viewDate: string | null
): boolean => !interactionDateTo || Boolean(viewDate && viewDate <= interactionDateTo);

const shouldIncludeInteractionView = ({
  interactionDateFrom,
  interactionDateTo,
  interactionFilter,
  view,
}: {
  interactionDateFrom: string;
  interactionDateTo: string;
  interactionFilter: InteractionFilter;
  view: InteractionView;
}): boolean => {
  const viewDate = view.timestamp?.slice(0, 10) ?? null;
  return (
    matchesInteractionKindFilter(interactionFilter, view) &&
    matchesInteractionDateFrom(interactionDateFrom, viewDate) &&
    matchesInteractionDateTo(interactionDateTo, viewDate)
  );
};

function filterInteractionViews(
  views: ReadonlyArray<InteractionView>,
  interactionFilter: InteractionFilter,
  interactionDateFrom: string,
  interactionDateTo: string
): InteractionView[] {
  return views.filter((view) =>
    shouldIncludeInteractionView({
      interactionDateFrom,
      interactionDateTo,
      interactionFilter,
      view,
    })
  );
}

const createMonitoringTranslate = (
  translations: MonitoringWidgetState['translations']
): MonitoringTranslate => {
  return (key, fallback, values) => {
    const translated = translations(key as never, values as never);
    if (translated === key || translated.endsWith(`.${key}`)) {
      return interpolateTemplate(fallback, values);
    }

    return translated;
  };
};

const resolveMonitoringInteractionFilterOptions = (
  translate: MonitoringTranslate
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

const resolveMonitoringSegmentedFilterClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'min-h-11 min-w-0 flex-1 px-4 text-xs touch-manipulation select-none active:scale-[0.97] sm:flex-none'
    : 'min-w-0 flex-1 px-3 text-xs sm:flex-none';

const resolveMonitoringHasMoreInteractions = (
  interactionHistory: MonitoringWidgetState['interactionHistory']
): boolean =>
  Boolean(interactionHistory && interactionHistory.items.length < interactionHistory.total);

const resolveMonitoringNextInteractionOffset = (
  interactionHistory: MonitoringWidgetState['interactionHistory']
): number | null => interactionHistory?.items.length ?? null;

const resolveMonitoringInteractionCounts = (
  filteredInteractionViews: InteractionView[]
): MonitoringInteractionCounts =>
  filteredInteractionViews.reduce(
    (acc, view) => {
      acc.total += 1;
      if (view.kind === 'session') {
        acc.sessions += 1;
        if (typeof view.durationSeconds === 'number' && view.durationSeconds > 0) {
          acc.totalSessionSeconds += view.durationSeconds;
        }
      } else if (view.kind === 'opened_task') {
        acc.openedTasks += 1;
      } else if (view.kind === 'lesson_panel') {
        acc.lessonPanels += 1;
      }
      return acc;
    },
    {
      lessonPanels: 0,
      openedTasks: 0,
      sessions: 0,
      total: 0,
      totalSessionSeconds: 0,
    }
  );

const resolveMonitoringAverageSessionDurationLabel = (
  formatLocalizedDuration: MonitoringWidgetState['formatLocalizedDuration'],
  interactionCounts: MonitoringInteractionCounts
): string | null =>
  interactionCounts.sessions > 0
    ? formatLocalizedDuration(
        Math.round(interactionCounts.totalSessionSeconds / interactionCounts.sessions)
      )
    : null;

const resolveMonitoringTopLessonPanelCard = (
  lessonPanelTimeCards: MonitoringWidgetState['lessonPanelTimeCards']
): MonitoringWidgetState['lessonPanelTimeCards'][number] | null =>
  lessonPanelTimeCards
    .slice()
    .sort((left, right) => right.totalSeconds - left.totalSeconds)[0] ?? null;

const shouldShowMonitoringLoadingState = (
  isInteractionQueryReady: boolean,
  isLoadingInteractions: boolean
): boolean => !isInteractionQueryReady || isLoadingInteractions;

function KangurParentDashboardMonitoringOverviewCards({
  averageSessionDurationLabel,
  interactionCounts,
}: {
  averageSessionDurationLabel: string | null;
  interactionCounts: MonitoringInteractionCounts;
}): React.JSX.Element {
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

function KangurParentDashboardMonitoringActivityMix({
  interactionCounts,
}: {
  interactionCounts: MonitoringInteractionCounts;
}): React.JSX.Element {
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

function KangurParentDashboardMonitoringHistoryFilters({
  hasActiveFilters,
  interactionDateFrom,
  interactionDateTo,
  interactionFilter,
  interactionFilterOptions,
  segmentedFilterClassName,
  setInteractionDateFrom,
  setInteractionDateTo,
  setInteractionFilter,
  translate,
}: {
  hasActiveFilters: boolean;
  interactionDateFrom: string;
  interactionDateTo: string;
  interactionFilter: InteractionFilter;
  interactionFilterOptions: ReadonlyArray<LabeledOptionDto<InteractionFilter>>;
  segmentedFilterClassName: string;
  setInteractionDateFrom: (value: string) => void;
  setInteractionDateTo: (value: string) => void;
  setInteractionFilter: (value: InteractionFilter) => void;
  translate: MonitoringTranslate;
}): React.JSX.Element {
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

function KangurParentDashboardMonitoringHistoryContent({
  activeLearnerId,
  fetchInteractions,
  filteredInteractionViews,
  formatTimestamp,
  hasMoreInteractions,
  interactionsError,
  interactionsLoadMoreError,
  isLoadingMoreInteractions,
  nextInteractionOffset,
  shouldShowLoadingState,
  translate,
}: {
  activeLearnerId: string | null;
  fetchInteractions: MonitoringWidgetState['fetchInteractions'];
  filteredInteractionViews: InteractionView[];
  formatTimestamp: (value: string | null | undefined) => string;
  hasMoreInteractions: boolean;
  interactionsError: string | null;
  interactionsLoadMoreError: string | null;
  isLoadingMoreInteractions: boolean;
  nextInteractionOffset: number | null;
  shouldShowLoadingState: boolean;
  translate: MonitoringTranslate;
}): React.JSX.Element {
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

function KangurParentDashboardMonitoringHistorySection({
  activeLearnerId,
  fetchInteractions,
  filteredInteractionViews,
  formatTimestamp,
  hasActiveFilters,
  hasMoreInteractions,
  interactionDateFrom,
  interactionDateTo,
  interactionFilter,
  interactionFilterOptions,
  interactionsError,
  interactionsLoadMoreError,
  isLoadingMoreInteractions,
  nextInteractionOffset,
  segmentedFilterClassName,
  setInteractionDateFrom,
  setInteractionDateTo,
  setInteractionFilter,
  shouldShowLoadingState,
  translate,
}: {
  activeLearnerId: string | null;
  fetchInteractions: MonitoringWidgetState['fetchInteractions'];
  filteredInteractionViews: InteractionView[];
  formatTimestamp: (value: string | null | undefined) => string;
  hasActiveFilters: boolean;
  hasMoreInteractions: boolean;
  interactionDateFrom: string;
  interactionDateTo: string;
  interactionFilter: InteractionFilter;
  interactionFilterOptions: ReadonlyArray<LabeledOptionDto<InteractionFilter>>;
  interactionsError: string | null;
  interactionsLoadMoreError: string | null;
  isLoadingMoreInteractions: boolean;
  nextInteractionOffset: number | null;
  segmentedFilterClassName: string;
  setInteractionDateFrom: (value: string) => void;
  setInteractionDateTo: (value: string) => void;
  setInteractionFilter: (value: InteractionFilter) => void;
  shouldShowLoadingState: boolean;
  translate: MonitoringTranslate;
}): React.JSX.Element {
  return (
    <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
      <div className='flex items-center justify-between'>
        <h3 className={KANGUR_WIDGET_TITLE_CLASSNAME}>
          {translate('widgets.monitoring.history.title', MONITORING_FALLBACK_COPY.history.title)}
        </h3>
      </div>

      <KangurParentDashboardMonitoringHistoryFilters
        hasActiveFilters={hasActiveFilters}
        interactionDateFrom={interactionDateFrom}
        interactionDateTo={interactionDateTo}
        interactionFilter={interactionFilter}
        interactionFilterOptions={interactionFilterOptions}
        segmentedFilterClassName={segmentedFilterClassName}
        setInteractionDateFrom={setInteractionDateFrom}
        setInteractionDateTo={setInteractionDateTo}
        setInteractionFilter={setInteractionFilter}
        translate={translate}
      />

      <KangurParentDashboardMonitoringHistoryContent
        activeLearnerId={activeLearnerId}
        fetchInteractions={fetchInteractions}
        filteredInteractionViews={filteredInteractionViews}
        formatTimestamp={formatTimestamp}
        hasMoreInteractions={hasMoreInteractions}
        interactionsError={interactionsError}
        interactionsLoadMoreError={interactionsLoadMoreError}
        isLoadingMoreInteractions={isLoadingMoreInteractions}
        nextInteractionOffset={nextInteractionOffset}
        shouldShowLoadingState={shouldShowLoadingState}
        translate={translate}
      />
    </div>
  );
}

function KangurParentDashboardMonitoringLessonPanelTimeSection({
  formatLocalizedDuration,
  lessonPanelTimeCards,
  topLessonPanelCard,
  translate,
}: {
  formatLocalizedDuration: MonitoringWidgetState['formatLocalizedDuration'];
  lessonPanelTimeCards: MonitoringWidgetState['lessonPanelTimeCards'];
  topLessonPanelCard: MonitoringWidgetState['lessonPanelTimeCards'][number] | null;
  translate: MonitoringTranslate;
}): React.JSX.Element {
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

  return <KangurParentDashboardAssignmentsMonitoringWidgetContent />;
}

function KangurParentDashboardAssignmentsMonitoringWidgetContent(): React.JSX.Element {
  const locale = useLocale();
  const isCoarsePointer = useKangurCoarsePointer();
  const state = useMonitoringWidgetState();
  const {
    translations,
    activeLearnerId,
    interactionFilter,
    setInteractionFilter,
    interactionDateFrom,
    setInteractionDateFrom,
    interactionDateTo,
    setInteractionDateTo,
    interactionHistory,
    isInteractionQueryReady,
    isLoadingInteractions,
    interactionsError,
    isLoadingMoreInteractions,
    interactionsLoadMoreError,
    interactionViews,
    lessonPanelTimeCards,
    fetchInteractions,
    formatLocalizedDuration,
  } = state;

  const { entry: monitoringContent } = useKangurPageContentEntry('parent-dashboard-monitoring');

  const translate = createMonitoringTranslate(translations);
  const interactionFilterOptions = useMemo(
    () => resolveMonitoringInteractionFilterOptions(translate),
    [translate]
  );

  const formatTimestamp = (value: string | null | undefined): string =>
    formatProgressTimestamp({
      value,
      locale,
      fallback: translations('widgets.monitoring.timestampUnavailable'),
    });

  const segmentedFilterClassName = resolveMonitoringSegmentedFilterClassName(isCoarsePointer);
  const hasMoreInteractions = resolveMonitoringHasMoreInteractions(interactionHistory);
  const nextInteractionOffset = resolveMonitoringNextInteractionOffset(interactionHistory);
  const filteredInteractionViews = useMemo(
    () =>
      filterInteractionViews(
        interactionViews,
        interactionFilter,
        interactionDateFrom,
        interactionDateTo
      ),
    [interactionDateFrom, interactionDateTo, interactionFilter, interactionViews]
  );
  const interactionCounts = useMemo(
    () => resolveMonitoringInteractionCounts(filteredInteractionViews),
    [filteredInteractionViews]
  );
  const averageSessionDurationLabel = resolveMonitoringAverageSessionDurationLabel(
    formatLocalizedDuration,
    interactionCounts
  );
  const topLessonPanelCard = resolveMonitoringTopLessonPanelCard(lessonPanelTimeCards);
  const hasActiveFilters =
    interactionFilter !== 'all' || interactionDateFrom.length > 0 || interactionDateTo.length > 0;
  const shouldShowLoadingState = shouldShowMonitoringLoadingState(
    isInteractionQueryReady,
    isLoadingInteractions
  );

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
          <KangurParentDashboardMonitoringOverviewCards
            averageSessionDurationLabel={averageSessionDurationLabel}
            interactionCounts={interactionCounts}
          />
          <KangurParentDashboardMonitoringActivityMix interactionCounts={interactionCounts} />
          <KangurParentDashboardMonitoringHistorySection
            activeLearnerId={activeLearnerId}
            fetchInteractions={fetchInteractions}
            filteredInteractionViews={filteredInteractionViews}
            formatTimestamp={formatTimestamp}
            hasActiveFilters={hasActiveFilters}
            hasMoreInteractions={hasMoreInteractions}
            interactionDateFrom={interactionDateFrom}
            interactionDateTo={interactionDateTo}
            interactionFilter={interactionFilter}
            interactionFilterOptions={interactionFilterOptions}
            interactionsError={interactionsError}
            interactionsLoadMoreError={interactionsLoadMoreError}
            isLoadingMoreInteractions={isLoadingMoreInteractions}
            nextInteractionOffset={nextInteractionOffset}
            segmentedFilterClassName={segmentedFilterClassName}
            setInteractionDateFrom={setInteractionDateFrom}
            setInteractionDateTo={setInteractionDateTo}
            setInteractionFilter={setInteractionFilter}
            shouldShowLoadingState={shouldShowLoadingState}
            translate={translate}
          />
        </div>

        <div className='space-y-6'>
          <KangurParentDashboardMonitoringLessonPanelTimeSection
            formatLocalizedDuration={formatLocalizedDuration}
            lessonPanelTimeCards={lessonPanelTimeCards}
            topLessonPanelCard={topLessonPanelCard}
            translate={translate}
          />
        </div>
      </div>
    </KangurPanelStack>
  );
}

export default KangurParentDashboardAssignmentsMonitoringWidget;
