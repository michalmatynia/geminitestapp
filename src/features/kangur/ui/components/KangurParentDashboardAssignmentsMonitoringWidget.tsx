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

  const interactionFilterOptions = useMemo(
    () =>
      [
        { value: 'all', label: translations('widgets.monitoring.filters.all') },
        { value: 'opened_task', label: translations('widgets.monitoring.filters.openedTask') },
        { value: 'lesson_panel', label: translations('widgets.monitoring.filters.lessonPanel') },
        { value: 'session', label: translations('widgets.monitoring.filters.session') },
      ] satisfies ReadonlyArray<LabeledOptionDto<InteractionFilter>>,
    [translations]
  );

  const formatTimestamp = (value: string | null | undefined): string =>
    formatProgressTimestamp({ value, locale, fallback: translations('widgets.monitoring.timestampUnavailable') });

  const segmentedFilterClassName = isCoarsePointer
    ? 'min-h-11 min-w-0 flex-1 px-4 text-xs touch-manipulation select-none active:scale-[0.97] sm:flex-none'
    : 'min-w-0 flex-1 px-3 text-xs sm:flex-none';
  const hasMoreInteractions = interactionHistory
    ? interactionHistory.offset + interactionHistory.items.length < interactionHistory.total
    : false;
  const nextInteractionOffset = interactionHistory
    ? interactionHistory.offset + interactionHistory.items.length
    : null;

  return (
    <KangurPanelStack className='w-full'>
      <KangurPanelIntro
        eyebrow={translations('widgets.monitoring.eyebrow')}
        title={monitoringContent?.title ?? translations('widgets.monitoring.title')}
        description={monitoringContent?.summary ?? translations('widgets.monitoring.description')}
      />

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]'>
        <div className='space-y-6'>
          <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
            <div className='flex items-center justify-between'>
              <h3 className={KANGUR_WIDGET_TITLE_CLASSNAME}>{translations('widgets.monitoring.history.title')}</h3>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <div className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full sm:w-auto`}>
                {interactionFilterOptions.map((option) => (
                  <KangurButton
                    key={option.value}
                    onClick={() => setInteractionFilter(option.value)}
                    variant={interactionFilter === option.value ? 'segmentActive' : 'segment'}
                    size='sm'
                    className={segmentedFilterClassName}
                  >
                    {option.label}
                  </KangurButton>
                ))}
              </div>
              <div className={KANGUR_TIGHT_ROW_CLASSNAME}>
                <KangurTextField type='date' value={interactionDateFrom} onChange={(e) => setInteractionDateFrom(e.target.value)} size='sm' className='w-32' />
                <span className='text-slate-400'>—</span>
                <KangurTextField type='date' value={interactionDateTo} onChange={(e) => setInteractionDateTo(e.target.value)} size='sm' className='w-32' />
              </div>
            </div>

            {isLoadingInteractions ? (
              <div className='py-12 flex justify-center'><span className='text-sm text-slate-400 font-bold animate-pulse'>{translations('shared.loading')}</span></div>
            ) : interactionsError ? (
              <KangurEmptyState accent='rose' description={interactionsError} />
            ) : interactionViews.length === 0 ? (
              <KangurEmptyState accent='slate' description={translations('widgets.monitoring.history.empty')} />
            ) : (
              <div className='space-y-3'>
                {interactionViews.map((view) => (
                  <KangurGlassPanel
                    key={view.id}
                    className='space-y-2'
                    padding='md'
                    surface='mistSoft'
                    variant='soft'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <span className='text-[10px] font-black uppercase tracking-wider text-slate-400'>{view.label}</span>
                      <span className='text-[10px] font-bold text-slate-400'>{formatTimestamp(view.timestamp)}</span>
                    </div>
                    <div className='text-sm font-bold text-slate-900'>{view.description}</div>
                  </KangurGlassPanel>
                ))}
                {hasMoreInteractions && (
                  <KangurButton
                    onClick={() => {
                      if (!activeLearnerId || nextInteractionOffset === null) return;
                      void fetchInteractions(activeLearnerId, { offset: nextInteractionOffset });
                    }}
                    variant='surface'
                    size='sm'
                    className='w-full'
                    disabled={isLoadingMoreInteractions}
                  >
                    {isLoadingMoreInteractions
                      ? translations('shared.loading')
                      : translations('widgets.monitoring.actions.loadMore')}
                  </KangurButton>
                )}
                {interactionsLoadMoreError && <p className='text-center text-xs text-rose-500 font-semibold'>{interactionsLoadMoreError}</p>}
              </div>
            )}
          </div>
        </div>

        <div className='space-y-6'>
          <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
            <h3 className={KANGUR_WIDGET_TITLE_CLASSNAME}>{translations('widgets.monitoring.lessonPanelTime.title')}</h3>
            {lessonPanelTimeCards.length === 0 ? (
              <p className='text-xs text-slate-400 italic'>{translations('widgets.monitoring.lessonPanelTime.empty')}</p>
            ) : (
              <div className='space-y-4'>
                {lessonPanelTimeCards.map((card) => (
                  <KangurGlassPanel key={card.lesson.id} padding='md' surface='solid' variant='soft' className='space-y-3'>
                    <div className='flex items-center gap-3'>
                      <div className='text-xl'>{card.lesson.emoji}</div>
                      <div className='flex-1 min-w-0'>
                        <div className='truncate text-xs font-black text-slate-900'>{card.lesson.title}</div>
                        <div className='text-[10px] font-bold text-slate-400'>{formatLocalizedDuration(card.totalSeconds)}</div>
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
                              <div key={panel.id} className='rounded-md bg-slate-100/80 px-1.5 py-0.5 text-[9px] font-black text-slate-500' title={panel.title}>
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
        </div>
      </div>
    </KangurPanelStack>
  );
}

export default KangurParentDashboardAssignmentsMonitoringWidget;
