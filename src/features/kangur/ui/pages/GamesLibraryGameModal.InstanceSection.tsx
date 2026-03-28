'use client';

import React from 'react';
import Link from 'next/link';
import {
  KangurButton,
  KangurInfoCard,
  KangurSelectField,
  KangurStatusChip,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';
import {
  GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME,
  GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME,
  GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME,
  GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME,
  getContentKindLabel,
  buildContentSetFeedSummary,
  getGamesLibraryContentSetCardTestId,
  buildClockEngineSettingsSummary,
} from './GamesLibraryGameModal.utils';
import { SegmentedFilterControl, SettingsToggle } from './GamesLibraryGameModal.components';
import type { ClockTrainingGamePreview } from '@/features/kangur/ui/components/clock-training/ClockTrainingGamePreview';

export const InstanceSection = ({
  state,
  ClockTrainingGamePreview,
}: {
  state: any;
  ClockTrainingGamePreview: any;
}) => {
  const {
    translations,
    launchableRuntime,
    activeInstances,
    replaceGameInstances,
    contentSets,
    shouldShowContentSetBrowser,
    contentSetsQuery,
    setContentSetsQuery,
    hasContentSetFilters,
    setContentSetsSourceFilter,
    contentSetsSourceFilter,
    setContentSetsUsageFilter,
    contentSetsUsageFilter,
    activeCustomContentSets,
    selectedContentSetId,
    handleSelectContentSet,
    selectableContentSets,
    selectedContentSetOutsideFilters,
    selectedContentSet,
    customContentSetIdSet,
    contentSetUsageCountById,
    handleEditInstance,
    supportsCustomContentSets,
    editingCustomContentSet,
    handleForkSelectedContentSet,
    selectedCustomContentSet,
    selectedCustomContentSetUsageCount,
    handleRemoveSelectedCustomContentSet,
    handleEditSelectedCustomContentSet,
    replaceGameContentSets,
    contentSetDraft,
    updateContentSetDraft,
    supportsCustomClockContentSets,
    supportsCustomCalendarContentSets,
    supportsCustomGeometryContentSets,
    GEOMETRY_CONTENT_SET_SHAPE_OPTIONS,
    getGeometryShapeLabel,
    toggleContentSetDraftShape,
    supportsCustomLogicalPatternContentSets,
    getLogicalPatternSetLabel,
    contentSetSyncError,
    editingContentSetId,
    handleForkEditingContentSet,
    isContentSetDraftDirty,
    contentSetDraftBaseline,
    canSaveCustomContentSet,
    handleSaveCustomContentSet,
    handleResetContentSetDraft,
    setInstanceSyncError,
    instanceTitle,
    setInstanceTitle,
    instanceEmoji,
    setInstanceEmoji,
    instanceDescription,
    setInstanceDescription,
    instanceEnabled,
    setInstanceEnabled,
    supportsInstanceEngineSettings,
    canSyncInstanceEngineSettingsFromPreview,
    handleSyncInstanceEngineSettingsFromPreview,
    instanceClockSettings,
    updateInstanceClockSettings,
    currentEngineSettingsSummary,
    game,
    instanceDraftModeAccent,
    instanceDraftMode,
    instanceContentSource,
    handleDetachInstanceContentSource,
    selectedContentSetFeedSummary,
    instanceEngineSource,
    handleDetachInstanceEngineSource,
    instancePreviewClockSection,
    instanceValidationMessages,
    instanceSyncError,
    isInstanceEditorDirty,
    instanceEditorBaseline,
    applyInstanceEditorState,
    handleResetInstanceEditor,
    handleForkCurrentInstanceEditorToDraft,
    selectedInstanceId,
    canSaveInstance,
    handleSaveInstance,
    handleSaveAndOpenInstance,
    selectedInstanceHref,
    selectedInstance,
    savedInstancesQuery,
    setSavedInstancesQuery,
    hasSavedInstancesFilters,
    setSavedInstancesStatusFilter,
    savedInstancesStatusFilter,
    setSavedInstancesContentSetFilter,
    savedInstancesContentSetFilter,
    filteredActiveInstances,
    handleUseInstanceContentSet,
    handleUseInstanceEngineSettings,
    handleDuplicateInstance,
    handleToggleInstanceEnabled,
    handleMoveInstance,
    handleRemoveInstance,
    basePath,
    buildKangurGameInstanceLaunchHref,
  } = state;

  return (
    <KangurInfoCard accent='violet' padding='lg' className='space-y-4'>
      <div className='space-y-1'>
        <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
          {translations('modal.instances.eyebrow')}
        </div>
        <div className='text-lg font-black [color:var(--kangur-page-text)]'>
          {translations('modal.instances.title')}
        </div>
        <div className='text-sm [color:var(--kangur-page-muted-text)]'>
          {translations('modal.instances.description')}
        </div>
      </div>

      {!launchableRuntime ? (
        <div className={GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME}>
          {translations('modal.instances.unavailable')}
        </div>
      ) : (
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]'>
          <div className={cn(GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME, 'space-y-4 p-4')}>
            {/* Instance Config UI */}
            <div className='grid gap-3 md:grid-cols-2'>
              <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                  {translations('modal.instances.engineLabel')}
                </div>
                <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
                  {launchableRuntime.engineId ?? game.engineId}
                </div>
              </div>
              <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                  {translations('modal.instances.runtimeLabel')}
                </div>
                <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
                  {launchableRuntime.screen}
                </div>
              </div>
            </div>

            {/* Content Set Selector */}
            {/* ... (many more elements) */}
          </div>
        </div>
      )}
    </KangurInfoCard>
  );
};
