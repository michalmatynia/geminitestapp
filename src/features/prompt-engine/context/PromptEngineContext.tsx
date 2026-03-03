'use client';

 

import React, { createContext, useContext, useMemo } from 'react';

import { useSettingsMap } from '@/shared/hooks/use-settings';

import { useOptionalPromptEngineValidationPageContext } from './PromptEngineValidationPageContext';
import {
  PROMPT_ENGINE_SETTINGS_KEY,
} from '../settings';

import {
  ConfigContext,
  type PromptEngineConfig,
  type PatternCollectionTab,
  type ExploderPatternSubTab,
} from './prompt-engine/PromptEngineConfigContext';

import {
  FiltersContext,
  type PromptEngineFilters,
  type ScopeFilter,
} from './prompt-engine/PromptEngineFiltersContext';
import { DataContext, type PromptEngineData } from './prompt-engine/PromptEngineDataContext';
import {
  ActionsContext,
  type PromptEngineActions,
} from './prompt-engine/PromptEngineActionsContext';

import { usePromptEngineConfigImpl } from './prompt-engine/usePromptEngineConfigImpl';
import { usePromptEngineDataImpl } from './prompt-engine/usePromptEngineDataImpl';
import { usePromptEngineFilteringImpl } from './prompt-engine/usePromptEngineFilteringImpl';
import { usePromptEngineActionsImpl } from './prompt-engine/usePromptEngineActionsImpl';

export type { PatternCollectionTab, ExploderPatternSubTab };

type PromptEngineProviderProps = {
  children: React.ReactNode;
  onSaved?: (() => void) | undefined;
  initialPatternTab?: PatternCollectionTab | undefined;
  initialExploderSubTab?: ExploderPatternSubTab | undefined;
  lockedPatternTab?: PatternCollectionTab | undefined;
  lockedExploderSubTab?: ExploderPatternSubTab | undefined;
  initialScope?: ScopeFilter | undefined;
  lockedScope?: ScopeFilter | undefined;
};

export interface PromptEngineContextValue
  extends PromptEngineConfig, PromptEngineFilters, PromptEngineData, PromptEngineActions {}

const PromptEngineContext = createContext<PromptEngineContextValue | undefined>(undefined);

export function PromptEngineProvider({
  children,
  onSaved,
  initialPatternTab,
  initialExploderSubTab,
  lockedPatternTab,
  lockedExploderSubTab,
  initialScope,
  lockedScope,
}: PromptEngineProviderProps): React.JSX.Element {
  const settingsQuery = useSettingsMap();
  const pageContext = useOptionalPromptEngineValidationPageContext();
  
  const config = usePromptEngineConfigImpl({
    resolvedLockedPatternTab: lockedPatternTab ?? pageContext?.lockedPatternTab,
    resolvedInitialPatternTab: initialPatternTab ?? pageContext?.initialPatternTab,
    resolvedLockedExploderSubTab: lockedExploderSubTab ?? pageContext?.lockedExploderSubTab,
    resolvedInitialExploderSubTab: initialExploderSubTab ?? pageContext?.initialExploderSubTab,
    resolvedLockedScope: lockedScope ?? pageContext?.lockedScope,
    resolvedInitialScope: initialScope ?? pageContext?.initialScope,
  });

  const rawSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const data = usePromptEngineDataImpl({
    settingsQuery,
    rawSettings,
  });

  const filtering = usePromptEngineFilteringImpl({
    sortedDrafts: data.sortedDrafts,
    learnedDrafts: data.learnedDrafts,
    activePatternTab: config.activePatternTab,
    activeExploderSubTab: config.activeExploderSubTab,
    activeScope: config.activeScope,
  });

  const actions = usePromptEngineActionsImpl({
    drafts: data.drafts,
    setDrafts: data.setDrafts,
    learnedDrafts: data.learnedDrafts,
    setLearnedDrafts: data.setLearnedDrafts,
    setIsDirty: data.setIsDirty,
    setLearnedDirty: data.setLearnedDirty,
    setSaveError: data.setSaveError,
    rawSettings,
    settingsQuery,
    resolvedOnSaved: onSaved ?? pageContext?.onSaved,
    activePatternTab: config.activePatternTab,
    activeExploderSubTab: config.activeExploderSubTab,
  });

  const configValue = useMemo<PromptEngineConfig>(
    () => ({
      patternTab: config.patternTab,
      setPatternTab: config.setPatternTab,
      exploderSubTab: config.exploderSubTab,
      setExploderSubTab: config.setExploderSubTab,
      activePatternTab: config.activePatternTab,
      activeExploderSubTab: config.activeExploderSubTab,
      patternTabLocked: config.patternTabLocked,
      exploderSubTabLocked: config.exploderSubTabLocked,
    }),
    [config]
  );

  const filtersValue = useMemo<PromptEngineFilters>(
    () => ({
      query: filtering.query,
      setQuery: filtering.setQuery,
      severity: filtering.severity,
      setSeverity: filtering.setSeverity,
      scope: config.scope,
      setScope: config.setScope,
      includeDisabled: filtering.includeDisabled,
      setIncludeDisabled: filtering.setIncludeDisabled,
      scopeLocked: config.scopeLocked,
    }),
    [filtering, config.scope, config.setScope, config.scopeLocked]
  );

  const dataValue = useMemo<PromptEngineData>(
    () => ({
      drafts: data.drafts,
      learnedDrafts: data.learnedDrafts,
      filteredDrafts: filtering.filteredDrafts,
      filteredLearnedDrafts: filtering.filteredLearnedDrafts,
      isDirty: data.isDirty,
      learnedDirty: data.learnedDirty,
      saveError: data.saveError,
      isInitialLoading: settingsQuery.isLoading && data.drafts.length === 0,
      isRefreshing: settingsQuery.isRefetching,
    }),
    [data, filtering, settingsQuery.isLoading, settingsQuery.isRefetching]
  );

  const actionsValue = useMemo<PromptEngineActions>(
    () => ({
      handleRuleTextChange: actions.handleRuleTextChange,
      handlePatchRule: actions.handlePatchRule,
      handleToggleRuleEnabled: actions.handleToggleRuleEnabled,
      handleDuplicateRule: actions.handleDuplicateRule,
      handleSequenceDrop: actions.handleSequenceDrop,
      handleSaveSequenceGroup: actions.handleSaveSequenceGroup,
      handleUngroupSequenceGroup: actions.handleUngroupSequenceGroup,
      handleLearnedRuleTextChange: actions.handleLearnedRuleTextChange,
      handleAddRule: actions.handleAddRule,
      handleAddLearnedRule: actions.handleAddLearnedRule,
      handleRemoveRule: actions.handleRemoveRule,
      handleRemoveLearnedRule: actions.handleRemoveLearnedRule,
      handleRefresh: actions.handleRefresh,
      handleExport: actions.handleExport,
      handleExportLearned: actions.handleExportLearned,
      handleImport: actions.handleImport,
      handleImportLearned: actions.handleImportLearned,
      handleSave: actions.handleSave,
    }),
    [actions]
  );

  const aggregatedValue = useMemo<PromptEngineContextValue>(
    () => ({
      ...configValue,
      ...filtersValue,
      ...dataValue,
      ...actionsValue,
    }),
    [configValue, filtersValue, dataValue, actionsValue]
  );

  return (
    <ConfigContext.Provider value={configValue}>
      <FiltersContext.Provider value={filtersValue}>
        <DataContext.Provider value={dataValue}>
          <ActionsContext.Provider value={actionsValue}>
            <PromptEngineContext.Provider value={aggregatedValue}>
              {children}
            </PromptEngineContext.Provider>
          </ActionsContext.Provider>
        </DataContext.Provider>
      </FiltersContext.Provider>
    </ConfigContext.Provider>
  );
}

export function usePromptEngineContext(): PromptEngineContextValue {
  const context = useContext(PromptEngineContext);
  if (!context) {
    throw new Error('usePromptEngineContext must be used within a PromptEngineProvider');
  }
  return context;
}

// Preferred short hook alias used across prompt-engine components.
export const usePromptEngine = usePromptEngineContext;
