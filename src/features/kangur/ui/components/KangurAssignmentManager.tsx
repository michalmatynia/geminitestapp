'use client';

import { Clock } from 'lucide-react';
import React from 'react';

import { buildKangurAssignmentDedupeKey } from '@/features/kangur/services/kangur-assignments';
import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import {
  KangurButton,
  KangurCardDescription,
  KangurEmptyState,
  KangurGlassPanel,
  KangurMetricCard,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_ROW_LG_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

import {
  KangurAssignmentManagerCardFooter,
  KangurAssignmentManagerCardHeader,
  KangurAssignmentManagerItemCard,
} from './KangurAssignmentManager.cards';
import {
  FILTER_OPTION_VALUES,
  TIME_LIMIT_MINUTES_MAX,
  TIME_LIMIT_MINUTES_MIN,
} from './KangurAssignmentManager.helpers';
import { useKangurAssignmentManagerState } from './KangurAssignmentManager.hooks';
import { renderKangurAssignmentManagerTimeLimitModal } from './KangurAssignmentManagerTimeLimitModal';
import type { KangurAssignmentManagerProps } from './KangurAssignmentManager.types';

export function KangurAssignmentManager(
  props: KangurAssignmentManagerProps
): React.JSX.Element {
  const state = useKangurAssignmentManagerState(props);
  const {
    translations,
    isCoarsePointer,
    shouldShowCatalog,
    shouldShowTracking,
    shouldShowLists,
    shouldShowListTabs,
    searchTerm,
    setSearchTerm,
    activeFilter,
    setActiveFilter,
    pendingActionId,
    feedback,
    activeListTab,
    setActiveListTab,
    timeLimitDraft,
    setTimeLimitDraft,
    timeLimitTarget,
    isLoading,
    error,
    isTimeLimitModalOpen,
    filteredCatalog,
    assignedAssignmentsByKey,
    activeAssignmentItems,
    completedAssignmentItems,
    trackerSummary,
    recommendedCatalog,
    timeLimitParsedError,
    isTimeLimitSaveDisabled,
    timeLimitPreview,
    timeLimitSaveLabel,
    handleAssign,
    handleArchive,
    handleUnassign,
    handleReassign,
    handleOpenTimeLimitModal,
    handleOpenTimeLimitModalForCatalog,
    handleCloseTimeLimitModal,
    handleSaveTimeLimit,
  } = state;

  const segmentedButtonClassName = isCoarsePointer
    ? 'min-h-11 min-w-0 flex-1 px-4 text-xs touch-manipulation select-none active:scale-[0.97] sm:flex-none'
    : 'min-w-0 flex-1 px-3 text-xs sm:flex-none';
  const listTabButtonClassName = isCoarsePointer
    ? 'min-h-11 min-w-0 flex-1 px-4 text-xs touch-manipulation select-none active:scale-[0.97]'
    : 'min-w-0 flex-1 px-3 text-xs';

  const filterOptions = FILTER_OPTION_VALUES.map((value) => ({
    value,
    label: translations(`filters.${value}`),
  }));

  const activeAssignmentsCount = activeAssignmentItems.length;
  const completedAssignmentsCount = completedAssignmentItems.length;

  const showActiveAssignmentsList = !shouldShowListTabs || activeListTab === 'active';
  const showCompletedAssignmentsList = !shouldShowListTabs || activeListTab === 'completed';

  return (
    <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      {renderKangurAssignmentManagerTimeLimitModal({
        isOpen: isTimeLimitModalOpen,
        onClose: handleCloseTimeLimitModal,
        onSave: () => void handleSaveTimeLimit(),
        timeLimitDraft,
        onTimeLimitDraftChange: setTimeLimitDraft,
        timeLimitTarget: timeLimitTarget
          ? {
              title: timeLimitTarget.title,
              description: timeLimitTarget.description ?? null,
            }
          : null,
        timeLimitPreview,
        timeLimitParsedError,
        isSaveDisabled: isTimeLimitSaveDisabled,
        saveLabel: timeLimitSaveLabel,
        minMinutes: TIME_LIMIT_MINUTES_MIN,
        maxMinutes: TIME_LIMIT_MINUTES_MAX,
      })}

      {shouldShowCatalog && (
        <KangurGlassPanel
          data-testid='assignment-manager-create-shell'
          padding='lg'
          surface='neutral'
          variant='soft'
        >
          <div className={`${KANGUR_PANEL_ROW_LG_CLASSNAME} lg:items-start lg:justify-between`}>
            <div className='max-w-2xl'>
              <KangurStatusChip accent='indigo' labelStyle='eyebrow'>
                {translations('catalog.eyebrow')}
              </KangurStatusChip>
              <KangurCardDescription className='mt-3 text-slate-600' relaxed size='sm'>
                {translations('catalog.description')}
              </KangurCardDescription>
            </div>
          </div>

          {recommendedCatalog.length > 0 && (
            <KangurSummaryPanel
              accent='indigo'
              className='mt-5'
              description={translations('suggested.description')}
              label={translations('suggested.label')}
            >
              <div className='mt-3 grid grid-cols-1 kangur-panel-gap xl:grid-cols-2'>
                {recommendedCatalog.map((item) => {
                  const targetKey = buildKangurAssignmentDedupeKey(item.createInput.target);
                  const assignedAssignment = assignedAssignmentsByKey.get(targetKey) ?? null;
                  const isAssigned = Boolean(assignedAssignment);
                  const isPending =
                    pendingActionId === item.id || pendingActionId === assignedAssignment?.id;

                  return (
                    <KangurAssignmentManagerItemCard
                      key={item.id}
                      testId={`assignment-manager-recommended-card-${item.id}`}
                    >
                      <KangurAssignmentManagerCardHeader
                        title={item.title}
                        description={item.description}
                        priority={item.createInput.priority}
                      />
                      <KangurAssignmentManagerCardFooter>
                        <KangurStatusChip accent='slate' className='w-fit' labelStyle='compact'>
                          {item.badge}
                        </KangurStatusChip>
                        <div
                          className={`w-full ${KANGUR_TIGHT_ROW_CLASSNAME} sm:w-auto sm:items-center`}
                        >
                          {isAssigned ? (
                            <KangurButton
                              className='w-full sm:w-auto'
                              type='button'
                              onClick={() =>
                                assignedAssignment &&
                                void handleUnassign(assignedAssignment.id, item.title)
                              }
                              disabled={isPending}
                              size='sm'
                              variant='ghost'
                            >
                              {isPending
                                ? translations('actions.unassignPending')
                                : translations('actions.unassign')}
                            </KangurButton>
                          ) : (
                            <KangurButton
                              className='w-full sm:w-auto'
                              type='button'
                              onClick={() => void handleAssign(item.id)}
                              disabled={isPending}
                              size='sm'
                              variant='surface'
                            >
                              {isPending
                                ? translations('actions.assignPending')
                                : translations('actions.assignSuggested')}
                            </KangurButton>
                          )}
                          <KangurButton
                            aria-label={translations('actions.setTime')}
                            title={translations('actions.setTime')}
                            className={
                              isCoarsePointer
                                ? 'min-h-11 w-full px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
                                : 'w-full sm:w-auto sm:px-3'
                            }
                            type='button'
                            onClick={() => handleOpenTimeLimitModalForCatalog(item.id)}
                            disabled={isAssigned || isPending}
                            size='sm'
                            variant='ghost'
                          >
                            <Clock className='h-4 w-4' aria-hidden='true' />
                          </KangurButton>
                        </div>
                      </KangurAssignmentManagerCardFooter>
                    </KangurAssignmentManagerItemCard>
                  );
                })}
              </div>
            </KangurSummaryPanel>
          )}

          <KangurTextField
            accent='indigo'
            type='search'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={translations('search.placeholder')}
            className='mt-5'
            aria-label={translations('search.label')}
            title={translations('search.title')}
          />

          <div
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} mt-4 w-full sm:w-auto sm:flex-wrap sm:justify-start`}
          >
            {filterOptions.map((option) => (
              <KangurButton
                key={option.value}
                type='button'
                onClick={() => setActiveFilter(option.value)}
                aria-pressed={activeFilter === option.value}
                className={segmentedButtonClassName}
                data-testid={`assignment-manager-filter-${option.value}`}
                size='sm'
                variant={activeFilter === option.value ? 'segmentActive' : 'segment'}
              >
                {option.label}
              </KangurButton>
            ))}
          </div>

          {feedback && (
            <KangurSummaryPanel
              accent={feedback.tone}
              className='mt-4'
              description={feedback.message}
              padding='sm'
              tone='accent'
              role='status'
              aria-live='polite'
            >
              {null}
            </KangurSummaryPanel>
          )}

          {error && (
            <KangurSummaryPanel
              accent='rose'
              className='mt-4'
              description={error}
              padding='sm'
              tone='accent'
            >
              {null}
            </KangurSummaryPanel>
          )}

          <div className='mt-5 grid grid-cols-1 kangur-panel-gap xl:grid-cols-2'>
            {filteredCatalog.map((item) => {
              const targetKey = buildKangurAssignmentDedupeKey(item.createInput.target);
              const assignedAssignment = assignedAssignmentsByKey.get(targetKey) ?? null;
              const isAssigned = Boolean(assignedAssignment);
              const isPending =
                pendingActionId === item.id || pendingActionId === assignedAssignment?.id;

              return (
                <KangurAssignmentManagerItemCard
                  key={item.id}
                  testId={`assignment-manager-catalog-card-${item.id}`}
                >
                  <KangurAssignmentManagerCardHeader
                    title={item.title}
                    description={item.description}
                  />
                  <div className='mt-2 flex flex-wrap items-center gap-2'>
                    <KangurStatusChip accent='slate' labelStyle='compact'>
                      {item.badge}
                    </KangurStatusChip>
                    <KangurAssignmentPriorityChip
                      labelStyle='compact'
                      priority={item.createInput.priority}
                    />
                  </div>
                  <KangurAssignmentManagerCardFooter>
                    <div
                      className={`w-full ${KANGUR_TIGHT_ROW_CLASSNAME} sm:w-auto sm:items-center`}
                    >
                      {isAssigned ? (
                        <KangurButton
                          type='button'
                          onClick={() =>
                            assignedAssignment &&
                            void handleUnassign(assignedAssignment.id, item.title)
                          }
                          disabled={isPending}
                          size='sm'
                          variant='ghost'
                          className='w-full sm:w-auto'
                        >
                          {isPending
                            ? translations('actions.unassignPending')
                            : translations('actions.unassign')}
                        </KangurButton>
                      ) : (
                        <KangurButton
                          type='button'
                          onClick={() => void handleAssign(item.id)}
                          disabled={isPending}
                          size='sm'
                          variant='surface'
                          className='w-full sm:w-auto'
                        >
                          {isPending
                            ? translations('actions.assignPending')
                            : translations('actions.assign')}
                        </KangurButton>
                      )}
                      <KangurButton
                        aria-label={translations('actions.setTime')}
                        title={translations('actions.setTime')}
                        className='w-full sm:w-auto sm:px-3'
                        type='button'
                        onClick={() => handleOpenTimeLimitModalForCatalog(item.id)}
                        disabled={isAssigned || isPending}
                        size='sm'
                        variant='ghost'
                      >
                        <Clock className='h-4 w-4' aria-hidden='true' />
                      </KangurButton>
                    </div>
                  </KangurAssignmentManagerCardFooter>
                </KangurAssignmentManagerItemCard>
              );
            })}
          </div>

          {!isLoading && filteredCatalog.length === 0 && (
            <KangurEmptyState
              accent='slate'
              className='mt-4 text-sm'
              description={translations('empty.filtered')}
              padding='lg'
            />
          )}
        </KangurGlassPanel>
      )}

      {shouldShowTracking && (
        <KangurGlassPanel
          data-testid='assignment-manager-tracking-shell'
          padding='lg'
          surface='neutral'
          variant='soft'
        >
          <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
            <KangurStatusChip accent='slate' className='w-fit' labelStyle='eyebrow'>
              {translations('tracking.eyebrow')}
            </KangurStatusChip>
            <KangurCardDescription className='mt-2 text-slate-600' relaxed size='sm'>
              {translations('tracking.description')}
            </KangurCardDescription>
          </div>
          <div className='mt-5 grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2 xl:grid-cols-4'>
            <KangurMetricCard
              accent='slate'
              label={translations('tracking.metrics.active.label')}
              value={trackerSummary.activeCount}
            />
            <KangurMetricCard
              accent='indigo'
              label={translations('tracking.metrics.notStarted.label')}
              value={trackerSummary.notStartedCount}
            />
            <KangurMetricCard
              accent='amber'
              label={translations('tracking.metrics.inProgress.label')}
              value={trackerSummary.inProgressCount}
            />
            <KangurMetricCard
              accent='emerald'
              label={translations('tracking.metrics.completionRate.label')}
              value={`${trackerSummary.completionRate}%`}
            />
          </div>
        </KangurGlassPanel>
      )}

      {shouldShowLists && (
        <>
          {shouldShowListTabs && (
            <div className='flex flex-col kangur-panel-gap'>
              <KangurStatusChip accent='slate' labelStyle='eyebrow'>
                {translations('lists.eyebrow')}
              </KangurStatusChip>
              <div
                className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full sm:max-w-sm`}
                role='tablist'
              >
                <KangurButton
                  type='button'
                  onClick={() => setActiveListTab('active')}
                  aria-selected={activeListTab === 'active'}
                  role='tab'
                  className={listTabButtonClassName}
                  size='sm'
                  variant={activeListTab === 'active' ? 'segmentActive' : 'segment'}
                >
                  {translations('lists.activeTab', { count: activeAssignmentsCount })}
                </KangurButton>
                <KangurButton
                  type='button'
                  onClick={() => setActiveListTab('completed')}
                  aria-selected={activeListTab === 'completed'}
                  role='tab'
                  className={listTabButtonClassName}
                  size='sm'
                  variant={activeListTab === 'completed' ? 'segmentActive' : 'segment'}
                >
                  {translations('lists.completedTab', { count: completedAssignmentsCount })}
                </KangurButton>
              </div>
            </div>
          )}

          {showActiveAssignmentsList && (
            <KangurAssignmentsList
              items={activeAssignmentItems}
              title={translations('lists.activeTitle')}
              emptyLabel={translations('lists.activeEmpty')}
              onArchive={(id) => void handleArchive(id)}
              onTimeLimitClick={handleOpenTimeLimitModal}
            />
          )}

          {showCompletedAssignmentsList && (
            <KangurAssignmentsList
              items={completedAssignmentItems}
              title={translations('lists.completedTitle')}
              emptyLabel={translations('lists.completedEmpty')}
              onArchive={(id) => void handleArchive(id)}
              onTimeLimitClick={handleOpenTimeLimitModal}
              onReassign={(id) => void handleReassign(id)}
              reassigningId={pendingActionId}
            />
          )}
        </>
      )}
    </div>
  );
}

export default KangurAssignmentManager;
