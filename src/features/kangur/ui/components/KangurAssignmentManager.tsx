'use client';

import { Clock } from 'lucide-react';
import React from 'react';

import { buildKangurAssignmentDedupeKey } from '@/features/kangur/services/kangur-assignments';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/assignments/KangurAssignmentPriorityChip';
import KangurAssignmentsList from '@/features/kangur/ui/components/assignments/KangurAssignmentsList';
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
} from './assignment-manager/KangurAssignmentManager.helpers';
import { useKangurAssignmentManagerState } from './KangurAssignmentManager.hooks';
import { renderKangurAssignmentManagerTimeLimitModal } from './KangurAssignmentManagerTimeLimitModal';
import type { KangurAssignmentManagerProps } from './assignment-manager/KangurAssignmentManager.types';

type AssignmentManagerState = ReturnType<typeof useKangurAssignmentManagerState>;

const resolveSegmentedButtonClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'min-h-11 min-w-0 flex-1 px-4 text-xs touch-manipulation select-none active:scale-[0.97] sm:flex-none'
    : 'min-w-0 flex-1 px-3 text-xs sm:flex-none';

const resolveListTabButtonClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'min-h-11 min-w-0 flex-1 px-4 text-xs touch-manipulation select-none active:scale-[0.97]'
    : 'min-w-0 flex-1 px-3 text-xs';

const resolveCatalogTimeButtonClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'min-h-11 w-full px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto sm:px-3';

const resolveCatalogItemState = ({
  assignedAssignmentsByKey,
  item,
  pendingActionId,
}: {
  assignedAssignmentsByKey: AssignmentManagerState['assignedAssignmentsByKey'];
  item:
    | AssignmentManagerState['filteredCatalog'][number]
    | AssignmentManagerState['recommendedCatalog'][number];
  pendingActionId: string | null;
}) => {
  const targetKey = buildKangurAssignmentDedupeKey(item.createInput.target);
  const assignedAssignment = assignedAssignmentsByKey.get(targetKey) ?? null;

  return {
    assignedAssignment,
    isAssigned: Boolean(assignedAssignment),
    isPending: pendingActionId === item.id || pendingActionId === assignedAssignment?.id,
  };
};

const resolveAssignmentListVisibility = (
  shouldShowListTabs: boolean,
  activeListTab: AssignmentManagerState['activeListTab']
): { showActiveAssignmentsList: boolean; showCompletedAssignmentsList: boolean } => ({
  showActiveAssignmentsList: !shouldShowListTabs || activeListTab === 'active',
  showCompletedAssignmentsList: !shouldShowListTabs || activeListTab === 'completed',
});

function KangurAssignmentManagerCatalogActions({
  assignLabel,
  assignedAssignment,
  handleAssign,
  handleOpenTimeLimitModalForCatalog,
  handleUnassign,
  isAssigned,
  isCoarsePointer,
  isPending,
  itemId,
  itemTitle,
  translations,
}: {
  assignLabel: string;
  assignedAssignment: { id: string } | null;
  handleAssign: AssignmentManagerState['handleAssign'];
  handleOpenTimeLimitModalForCatalog: AssignmentManagerState['handleOpenTimeLimitModalForCatalog'];
  handleUnassign: AssignmentManagerState['handleUnassign'];
  isAssigned: boolean;
  isCoarsePointer: boolean;
  isPending: boolean;
  itemId: string;
  itemTitle: string;
  translations: AssignmentManagerState['translations'];
}): React.JSX.Element {
  return (
    <div className={`w-full ${KANGUR_TIGHT_ROW_CLASSNAME} sm:w-auto sm:items-center`}>
      {isAssigned ? (
        <KangurButton
          className='w-full sm:w-auto'
          type='button'
          onClick={() => assignedAssignment && void handleUnassign(assignedAssignment.id, itemTitle)}
          disabled={isPending}
          size='sm'
          variant='ghost'
        >
          {isPending ? translations('actions.unassignPending') : translations('actions.unassign')}
        </KangurButton>
      ) : (
        <KangurButton
          className='w-full sm:w-auto'
          type='button'
          onClick={() => void handleAssign(itemId)}
          disabled={isPending}
          size='sm'
          variant='surface'
        >
          {isPending ? translations('actions.assignPending') : assignLabel}
        </KangurButton>
      )}
      <KangurButton
        aria-label={translations('actions.setTime')}
        title={translations('actions.setTime')}
        className={resolveCatalogTimeButtonClassName(isCoarsePointer)}
        type='button'
        onClick={() => handleOpenTimeLimitModalForCatalog(itemId)}
        disabled={isAssigned || isPending}
        size='sm'
        variant='ghost'
      >
        <Clock className='h-4 w-4' aria-hidden='true' />
      </KangurButton>
    </div>
  );
}

function KangurAssignmentManagerSuggestedCard({
  assignedAssignmentsByKey,
  handleAssign,
  handleOpenTimeLimitModalForCatalog,
  handleUnassign,
  isCoarsePointer,
  item,
  pendingActionId,
  translations,
}: {
  assignedAssignmentsByKey: AssignmentManagerState['assignedAssignmentsByKey'];
  handleAssign: AssignmentManagerState['handleAssign'];
  handleOpenTimeLimitModalForCatalog: AssignmentManagerState['handleOpenTimeLimitModalForCatalog'];
  handleUnassign: AssignmentManagerState['handleUnassign'];
  isCoarsePointer: boolean;
  item: AssignmentManagerState['recommendedCatalog'][number];
  pendingActionId: string | null;
  translations: AssignmentManagerState['translations'];
}): React.JSX.Element {
  const { assignedAssignment, isAssigned, isPending } = resolveCatalogItemState({
    assignedAssignmentsByKey,
    item,
    pendingActionId,
  });

  return (
    <KangurAssignmentManagerItemCard
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
        <KangurAssignmentManagerCatalogActions
          assignLabel={translations('actions.assignSuggested')}
          assignedAssignment={assignedAssignment}
          handleAssign={handleAssign}
          handleOpenTimeLimitModalForCatalog={handleOpenTimeLimitModalForCatalog}
          handleUnassign={handleUnassign}
          isAssigned={isAssigned}
          isCoarsePointer={isCoarsePointer}
          isPending={isPending}
          itemId={item.id}
          itemTitle={item.title}
          translations={translations}
        />
      </KangurAssignmentManagerCardFooter>
    </KangurAssignmentManagerItemCard>
  );
}

function KangurAssignmentManagerCatalogCard({
  assignedAssignmentsByKey,
  handleAssign,
  handleOpenTimeLimitModalForCatalog,
  handleUnassign,
  isCoarsePointer,
  item,
  pendingActionId,
  translations,
}: {
  assignedAssignmentsByKey: AssignmentManagerState['assignedAssignmentsByKey'];
  handleAssign: AssignmentManagerState['handleAssign'];
  handleOpenTimeLimitModalForCatalog: AssignmentManagerState['handleOpenTimeLimitModalForCatalog'];
  handleUnassign: AssignmentManagerState['handleUnassign'];
  isCoarsePointer: boolean;
  item: AssignmentManagerState['filteredCatalog'][number];
  pendingActionId: string | null;
  translations: AssignmentManagerState['translations'];
}): React.JSX.Element {
  const { assignedAssignment, isAssigned, isPending } = resolveCatalogItemState({
    assignedAssignmentsByKey,
    item,
    pendingActionId,
  });

  return (
    <KangurAssignmentManagerItemCard testId={`assignment-manager-catalog-card-${item.id}`}>
      <KangurAssignmentManagerCardHeader title={item.title} description={item.description} />
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <KangurStatusChip accent='slate' labelStyle='compact'>
          {item.badge}
        </KangurStatusChip>
        <KangurAssignmentPriorityChip labelStyle='compact' priority={item.createInput.priority} />
      </div>
      <KangurAssignmentManagerCardFooter>
        <KangurAssignmentManagerCatalogActions
          assignLabel={translations('actions.assign')}
          assignedAssignment={assignedAssignment}
          handleAssign={handleAssign}
          handleOpenTimeLimitModalForCatalog={handleOpenTimeLimitModalForCatalog}
          handleUnassign={handleUnassign}
          isAssigned={isAssigned}
          isCoarsePointer={isCoarsePointer}
          isPending={isPending}
          itemId={item.id}
          itemTitle={item.title}
          translations={translations}
        />
      </KangurAssignmentManagerCardFooter>
    </KangurAssignmentManagerItemCard>
  );
}

function KangurAssignmentManagerCatalogSection({
  activeFilter,
  assignedAssignmentsByKey,
  error,
  feedback,
  filteredCatalog,
  handleAssign,
  handleOpenTimeLimitModalForCatalog,
  handleUnassign,
  isCoarsePointer,
  isLoading,
  pendingActionId,
  recommendedCatalog,
  searchTerm,
  setActiveFilter,
  setSearchTerm,
  shouldShowCatalog,
  translations,
}: Pick<
  AssignmentManagerState,
  | 'activeFilter'
  | 'assignedAssignmentsByKey'
  | 'error'
  | 'feedback'
  | 'filteredCatalog'
  | 'handleAssign'
  | 'handleOpenTimeLimitModalForCatalog'
  | 'handleUnassign'
  | 'isCoarsePointer'
  | 'isLoading'
  | 'pendingActionId'
  | 'recommendedCatalog'
  | 'searchTerm'
  | 'setActiveFilter'
  | 'setSearchTerm'
  | 'shouldShowCatalog'
  | 'translations'
>): React.JSX.Element | null {
  const segmentedButtonClassName = resolveSegmentedButtonClassName(isCoarsePointer);
  const filterOptions = FILTER_OPTION_VALUES.map((value) => ({
    value,
    label: translations(`filters.${value}`),
  }));

  if (!shouldShowCatalog) {
    return null;
  }

  return (
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

      {recommendedCatalog.length > 0 ? (
        <KangurSummaryPanel
          accent='indigo'
          className='mt-5'
          description={translations('suggested.description')}
          label={translations('suggested.label')}
        >
          <div className='mt-3 grid grid-cols-1 kangur-panel-gap xl:grid-cols-2'>
            {recommendedCatalog.map((item) => (
              <KangurAssignmentManagerSuggestedCard
                key={item.id}
                assignedAssignmentsByKey={assignedAssignmentsByKey}
                handleAssign={handleAssign}
                handleOpenTimeLimitModalForCatalog={handleOpenTimeLimitModalForCatalog}
                handleUnassign={handleUnassign}
                isCoarsePointer={isCoarsePointer}
                item={item}
                pendingActionId={pendingActionId}
                translations={translations}
              />
            ))}
          </div>
        </KangurSummaryPanel>
      ) : null}

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

      {feedback ? (
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
      ) : null}

      {error ? (
        <KangurSummaryPanel
          accent='rose'
          className='mt-4'
          description={error}
          padding='sm'
          tone='accent'
        >
          {null}
        </KangurSummaryPanel>
      ) : null}

      <div className='mt-5 grid grid-cols-1 kangur-panel-gap xl:grid-cols-2'>
        {filteredCatalog.map((item) => (
          <KangurAssignmentManagerCatalogCard
            key={item.id}
            assignedAssignmentsByKey={assignedAssignmentsByKey}
            handleAssign={handleAssign}
            handleOpenTimeLimitModalForCatalog={handleOpenTimeLimitModalForCatalog}
            handleUnassign={handleUnassign}
            isCoarsePointer={isCoarsePointer}
            item={item}
            pendingActionId={pendingActionId}
            translations={translations}
          />
        ))}
      </div>

      {!isLoading && filteredCatalog.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='mt-4 text-sm'
          description={translations('empty.filtered')}
          padding='lg'
        />
      ) : null}
    </KangurGlassPanel>
  );
}

function KangurAssignmentManagerTrackingSection({
  shouldShowTracking,
  trackerSummary,
  translations,
}: Pick<
  AssignmentManagerState,
  'shouldShowTracking' | 'trackerSummary' | 'translations'
>): React.JSX.Element | null {
  if (!shouldShowTracking) {
    return null;
  }

  return (
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
  );
}

function KangurAssignmentManagerListTabs({
  activeAssignmentsCount,
  activeListTab,
  completedAssignmentsCount,
  isCoarsePointer,
  setActiveListTab,
  translations,
}: {
  activeAssignmentsCount: number;
  activeListTab: AssignmentManagerState['activeListTab'];
  completedAssignmentsCount: number;
  isCoarsePointer: boolean;
  setActiveListTab: AssignmentManagerState['setActiveListTab'];
  translations: AssignmentManagerState['translations'];
}): React.JSX.Element {
  const listTabButtonClassName = resolveListTabButtonClassName(isCoarsePointer);

  return (
    <div className='flex flex-col kangur-panel-gap'>
      <KangurStatusChip accent='slate' labelStyle='eyebrow'>
        {translations('lists.eyebrow')}
      </KangurStatusChip>
      <div className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full sm:max-w-sm`} role='tablist'>
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
  );
}

function KangurAssignmentManagerListsSection({
  activeAssignmentItems,
  activeListTab,
  completedAssignmentItems,
  handleArchive,
  handleOpenTimeLimitModal,
  handleReassign,
  isCoarsePointer,
  pendingActionId,
  setActiveListTab,
  shouldShowLists,
  shouldShowListTabs,
  translations,
}: Pick<
  AssignmentManagerState,
  | 'activeAssignmentItems'
  | 'activeListTab'
  | 'completedAssignmentItems'
  | 'handleArchive'
  | 'handleOpenTimeLimitModal'
  | 'handleReassign'
  | 'isCoarsePointer'
  | 'pendingActionId'
  | 'setActiveListTab'
  | 'shouldShowLists'
  | 'shouldShowListTabs'
  | 'translations'
>): React.JSX.Element | null {
  const { showActiveAssignmentsList, showCompletedAssignmentsList } =
    resolveAssignmentListVisibility(shouldShowListTabs, activeListTab);

  if (!shouldShowLists) {
    return null;
  }

  return (
    <>
      {shouldShowListTabs ? (
        <KangurAssignmentManagerListTabs
          activeAssignmentsCount={activeAssignmentItems.length}
          activeListTab={activeListTab}
          completedAssignmentsCount={completedAssignmentItems.length}
          isCoarsePointer={isCoarsePointer}
          setActiveListTab={setActiveListTab}
          translations={translations}
        />
      ) : null}

      {showActiveAssignmentsList ? (
        <KangurAssignmentsList
          items={activeAssignmentItems}
          title={translations('lists.activeTitle')}
          emptyLabel={translations('lists.activeEmpty')}
          onArchive={(id) => void handleArchive(id)}
          onTimeLimitClick={handleOpenTimeLimitModal}
        />
      ) : null}

      {showCompletedAssignmentsList ? (
        <KangurAssignmentsList
          items={completedAssignmentItems}
          title={translations('lists.completedTitle')}
          emptyLabel={translations('lists.completedEmpty')}
          onArchive={(id) => void handleArchive(id)}
          onTimeLimitClick={handleOpenTimeLimitModal}
          onReassign={(id) => void handleReassign(id)}
          reassigningId={pendingActionId}
        />
      ) : null}
    </>
  );
}

export function KangurAssignmentManager(
  props: KangurAssignmentManagerProps
): React.JSX.Element {
  const state = useKangurAssignmentManagerState(props);

  return (
    <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      {renderKangurAssignmentManagerTimeLimitModal({
        isOpen: state.isTimeLimitModalOpen,
        onClose: state.handleCloseTimeLimitModal,
        onSave: () => void state.handleSaveTimeLimit(),
        timeLimitDraft: state.timeLimitDraft,
        onTimeLimitDraftChange: state.setTimeLimitDraft,
        timeLimitTarget: state.timeLimitTarget
          ? {
              title: state.timeLimitTarget.title,
              description: state.timeLimitTarget.description ?? null,
            }
          : null,
        timeLimitPreview: state.timeLimitPreview,
        timeLimitParsedError: state.timeLimitParsedError,
        isSaveDisabled: state.isTimeLimitSaveDisabled,
        saveLabel: state.timeLimitSaveLabel,
        minMinutes: TIME_LIMIT_MINUTES_MIN,
        maxMinutes: TIME_LIMIT_MINUTES_MAX,
      })}

      <KangurAssignmentManagerCatalogSection
        activeFilter={state.activeFilter}
        assignedAssignmentsByKey={state.assignedAssignmentsByKey}
        error={state.error}
        feedback={state.feedback}
        filteredCatalog={state.filteredCatalog}
        handleAssign={state.handleAssign}
        handleOpenTimeLimitModalForCatalog={state.handleOpenTimeLimitModalForCatalog}
        handleUnassign={state.handleUnassign}
        isCoarsePointer={state.isCoarsePointer}
        isLoading={state.isLoading}
        pendingActionId={state.pendingActionId}
        recommendedCatalog={state.recommendedCatalog}
        searchTerm={state.searchTerm}
        setActiveFilter={state.setActiveFilter}
        setSearchTerm={state.setSearchTerm}
        shouldShowCatalog={state.shouldShowCatalog}
        translations={state.translations}
      />

      <KangurAssignmentManagerTrackingSection
        shouldShowTracking={state.shouldShowTracking}
        trackerSummary={state.trackerSummary}
        translations={state.translations}
      />

      <KangurAssignmentManagerListsSection
        activeAssignmentItems={state.activeAssignmentItems}
        activeListTab={state.activeListTab}
        completedAssignmentItems={state.completedAssignmentItems}
        handleArchive={state.handleArchive}
        handleOpenTimeLimitModal={state.handleOpenTimeLimitModal}
        handleReassign={state.handleReassign}
        isCoarsePointer={state.isCoarsePointer}
        pendingActionId={state.pendingActionId}
        setActiveListTab={state.setActiveListTab}
        shouldShowLists={state.shouldShowLists}
        shouldShowListTabs={state.shouldShowListTabs}
        translations={state.translations}
      />
    </div>
  );
}

export default KangurAssignmentManager;
