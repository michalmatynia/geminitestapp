'use client';

import { Clock } from 'lucide-react';
import React, { memo } from 'react';

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
} from './KangurAssignmentManager.helpers';
import { useKangurAssignmentManagerState } from './KangurAssignmentManager.hooks';
import { KangurAssignmentManagerProvider, useKangurAssignmentManagerContext } from './KangurAssignmentManager.context';
import { KangurAssignmentItemProvider, useKangurAssignmentItem } from './KangurAssignmentItemContext';
import { renderKangurAssignmentManagerTimeLimitModal } from './KangurAssignmentManagerTimeLimitModal';
import type { KangurAssignmentManagerProps } from './KangurAssignmentManager.types';

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
  item,
}: {
  assignLabel: string;
  item?:
    | AssignmentManagerState['filteredCatalog'][number]
    | AssignmentManagerState['recommendedCatalog'][number];
}): React.JSX.Element {
  const contextItem = useKangurAssignmentItem();
  const effectiveItem = item ?? contextItem;

  const {
    assignedAssignmentsByKey,
    handleAssign,
    handleOpenTimeLimitModalForCatalog,
    handleUnassign,
    isCoarsePointer,
    pendingActionId,
    translations,
  } = useKangurAssignmentManagerContext();

  if (!effectiveItem) {
    return <></>;
  }

  const { assignedAssignment, isAssigned, isPending } = resolveCatalogItemState({
    assignedAssignmentsByKey,
    item: effectiveItem,
    pendingActionId,
  });

  return (
    <div className={`w-full ${KANGUR_TIGHT_ROW_CLASSNAME} sm:w-auto sm:items-center`}>
      {isAssigned ? (
        <KangurButton
          className='w-full sm:w-auto'
          type='button'
          onClick={() => assignedAssignment && void handleUnassign(assignedAssignment.id, effectiveItem.title)}
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
          onClick={() => void handleAssign(effectiveItem.id)}
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
        onClick={() => handleOpenTimeLimitModalForCatalog(effectiveItem.id)}
        disabled={isAssigned || isPending}
        size='sm'
        variant='ghost'
      >
        <Clock className='h-4 w-4' aria-hidden='true' />
      </KangurButton>
    </div>
  );
}

function KangurAssignmentManagerSuggestedCard(): React.JSX.Element {
  const { translations } = useKangurAssignmentManagerContext();
  const item = useKangurAssignmentItem() as AssignmentManagerState['recommendedCatalog'][number];

  return (
    <KangurAssignmentManagerItemCard
      testId={`assignment-manager-recommended-card-${item.id}`}
    >
      <KangurAssignmentManagerCardHeader />
      <KangurAssignmentManagerCardFooter>
        <KangurStatusChip accent='slate' className='w-fit' labelStyle='compact'>
          {item.badge}
        </KangurStatusChip>
        <KangurAssignmentManagerCatalogActions
          assignLabel={translations('actions.assignSuggested')}
        />
      </KangurAssignmentManagerCardFooter>
    </KangurAssignmentManagerItemCard>
  );
}

function KangurAssignmentManagerCatalogCard(): React.JSX.Element {
  const { translations } = useKangurAssignmentManagerContext();
  const item = useKangurAssignmentItem() as AssignmentManagerState['filteredCatalog'][number];

  return (
    <KangurAssignmentManagerItemCard testId={`assignment-manager-catalog-card-${item.id}`}>
      <KangurAssignmentManagerCardHeader />
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <KangurStatusChip accent='slate' labelStyle='compact'>
          {item.badge}
        </KangurStatusChip>
        <KangurAssignmentPriorityChip labelStyle='compact' priority={item.createInput.priority} />
      </div>
      <KangurAssignmentManagerCardFooter>
        <KangurAssignmentManagerCatalogActions
          assignLabel={translations('actions.assign')}
        />
      </KangurAssignmentManagerCardFooter>
    </KangurAssignmentManagerItemCard>
  );
}

function KangurAssignmentManagerCatalogSection(): React.JSX.Element | null {
  const {
    activeFilter,
    error,
    feedback,
    filteredCatalog,
    isCoarsePointer,
    isLoading,
    recommendedCatalog,
    searchTerm,
    setActiveFilter,
    setSearchTerm,
    shouldShowCatalog,
    translations,
  } = useKangurAssignmentManagerContext();

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
            {recommendedCatalog.map((item: AssignmentManagerState['recommendedCatalog'][number]) => (
              <KangurAssignmentItemProvider key={item.id} item={item}>
                <KangurAssignmentManagerSuggestedCard />
              </KangurAssignmentItemProvider>
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
        {filteredCatalog.map((item: AssignmentManagerState['filteredCatalog'][number]) => (
          <KangurAssignmentItemProvider key={item.id} item={item}>
            <KangurAssignmentManagerCatalogCard />
          </KangurAssignmentItemProvider>
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

function KangurAssignmentManagerTrackingSection(): React.JSX.Element | null {
  const { shouldShowTracking, trackerSummary, translations } = useKangurAssignmentManagerContext();

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

function KangurAssignmentManagerListTabs(): React.JSX.Element {
  const {
    activeAssignmentItems,
    activeListTab,
    completedAssignmentItems,
    isCoarsePointer,
    setActiveListTab,
    translations,
  } = useKangurAssignmentManagerContext();

  const activeAssignmentsCount = activeAssignmentItems.length;
  const completedAssignmentsCount = completedAssignmentItems.length;
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

function KangurAssignmentManagerListsSection(): React.JSX.Element | null {
  const {
    activeAssignmentItems,
    activeListTab,
    completedAssignmentItems,
    handleArchive,
    handleOpenTimeLimitModal,
    handleReassign,
    pendingActionId,
    shouldShowLists,
    shouldShowListTabs,
    translations,
  } = useKangurAssignmentManagerContext();

  const { showActiveAssignmentsList, showCompletedAssignmentsList } =
    resolveAssignmentListVisibility(shouldShowListTabs, activeListTab);

  if (!shouldShowLists) {
    return null;
  }

  return (
    <>
      {shouldShowListTabs ? (
        <KangurAssignmentManagerListTabs />
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

function KangurAssignmentManagerContent(): React.JSX.Element {
  const state = useKangurAssignmentManagerContext();

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

      <KangurAssignmentManagerCatalogSection />

      <KangurAssignmentManagerTrackingSection />

      <KangurAssignmentManagerListsSection />
    </div>
  );
}

export const KangurAssignmentManager = memo(function KangurAssignmentManager(
  props: KangurAssignmentManagerProps
): React.JSX.Element {
  return (
    <KangurAssignmentManagerProvider {...props}>
      <KangurAssignmentManagerContent />
    </KangurAssignmentManagerProvider>
  );
});

export default KangurAssignmentManager;
