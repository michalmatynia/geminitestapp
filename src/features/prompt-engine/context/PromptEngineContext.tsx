'use client';

import React, { useMemo } from 'react';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
  type PromptEngineSettings,
  type PromptValidationScope,
  type PromptValidationSeverity,
} from '@/shared/lib/prompt-engine/settings';
import { useToast } from '@/shared/ui';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { RuleDraft, RulePatch } from './prompt-engine-context-utils';
import {
  usePromptEngineActionsImpl,
  usePromptEngineConfigImpl,
  usePromptEngineDataImpl,
  usePromptEngineFilteringImpl,
} from './PromptEngineContext.impl';
import { useOptionalPromptEngineValidationPageContext } from './PromptEngineValidationPageContext';

export type PatternCollectionTab = 'core' | 'prompt_exploder';
export type ExploderPatternSubTab =
  | 'prompt_exploder_rules'
  | 'image_studio_rules'
  | 'case_resolver_rules';

export type SeverityFilter = PromptValidationSeverity | 'all';
export type ScopeFilter = PromptValidationScope | 'all';

export interface PromptEngineActions {
  setPatternTab: (tab: PatternCollectionTab) => void;
  setExploderSubTab: (subTab: ExploderPatternSubTab) => void;
  handleRuleTextChange: (uid: string, nextText: string) => void;
  handlePatchRule: (uid: string, patch: RulePatch) => void;
  handleToggleRuleEnabled: (uid: string, enabled: boolean) => void;
  handleDuplicateRule: (uid: string) => void;
  handleSequenceDrop: (draggedUid: string, targetUid: string) => void;
  handleSaveSequenceGroup: (groupId: string, label: string, debounceMs: number) => void;
  handleUngroupSequenceGroup: (groupId: string) => void;
  handleLearnedRuleTextChange: (uid: string, nextText: string) => void;
  handleAddRule: () => void;
  handleAddLearnedRule: () => void;
  handleRemoveRule: (uid: string) => void;
  handleRemoveLearnedRule: (uid: string) => void;
  handleRefresh: () => Promise<void>;
  handleExport: () => void;
  handleExportLearned: () => void;
  handleImport: (file: File) => Promise<void>;
  handleImportLearned: (file: File) => Promise<void>;
  handleSave: () => Promise<void>;
  handleCopy: (value: string, label: string) => Promise<void>;
}

export interface PromptEngineConfig {
  promptEngineSettings: PromptEngineSettings;
  patternTab: PatternCollectionTab;
  exploderSubTab: ExploderPatternSubTab;
  patternTabLocked: boolean;
  exploderSubTabLocked: boolean;
  scopeLocked: boolean;
  isUsingDefaults: boolean;
}

export interface PromptEngineData {
  drafts: RuleDraft[];
  learnedDrafts: RuleDraft[];
  filteredDrafts: RuleDraft[];
  filteredLearnedDrafts: RuleDraft[];
  isDirty: boolean;
  learnedDirty: boolean;
  saveError: string | null;
  isLoading: boolean;
  isSaving: boolean;
}

export interface PromptEngineFilters {
  query: string;
  setQuery: (query: string) => void;
  severity: SeverityFilter;
  setSeverity: (severity: SeverityFilter) => void;
  scope: ScopeFilter;
  setScope: (scope: ScopeFilter) => void;
  includeDisabled: boolean;
  setIncludeDisabled: (include: boolean) => void;
}

const createPromptEngineStrictContext = <T,>(hookName: string, displayName: string) =>
  createStrictContext<T>({
    hookName,
    providerName: 'a PromptEngineProvider',
    displayName,
    errorFactory: internalError,
  });

export const {
  Context: ActionsContext,
  useStrictContext: usePromptEngineActions,
} = createPromptEngineStrictContext<PromptEngineActions>(
  'usePromptEngineActions',
  'PromptEngineActionsContext'
);

export const {
  Context: ConfigContext,
  useStrictContext: usePromptEngineConfig,
} = createPromptEngineStrictContext<PromptEngineConfig>(
  'usePromptEngineConfig',
  'PromptEngineConfigContext'
);

export const {
  Context: DataContext,
  useStrictContext: usePromptEngineData,
} = createPromptEngineStrictContext<PromptEngineData>(
  'usePromptEngineData',
  'PromptEngineDataContext'
);

export const {
  Context: FiltersContext,
  useStrictContext: usePromptEngineFilters,
} = createPromptEngineStrictContext<PromptEngineFilters>(
  'usePromptEngineFilters',
  'PromptEngineFiltersContext'
);

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

export function PromptEngineProvider(props: PromptEngineProviderProps): React.JSX.Element {
  const {
    children,
    onSaved,
    initialPatternTab,
    initialExploderSubTab,
    lockedPatternTab,
    lockedExploderSubTab,
    initialScope,
    lockedScope,
  } = props;

  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
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

  const promptEngineSettings = useMemo(() => parsePromptEngineSettings(rawSettings), [rawSettings]);

  const isUsingDefaults = !rawSettings;

  const configValue = useMemo<PromptEngineConfig>(
    () => ({
      promptEngineSettings,
      patternTab: config.patternTab,
      setPatternTab: config.setPatternTab,
      exploderSubTab: config.exploderSubTab,
      setExploderSubTab: config.setExploderSubTab,
      activePatternTab: config.activePatternTab,
      activeExploderSubTab: config.activeExploderSubTab,
      patternTabLocked: config.patternTabLocked,
      exploderSubTabLocked: config.exploderSubTabLocked,
      scopeLocked: config.scopeLocked,
      isUsingDefaults,
    }),
    [config, promptEngineSettings, isUsingDefaults]
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
      isLoading: settingsQuery.isLoading && data.drafts.length === 0,
      isInitialLoading: settingsQuery.isLoading && data.drafts.length === 0,
      isRefreshing: settingsQuery.isRefetching,
      isSaving: updateSetting.isPending,
    }),
    [data, filtering, settingsQuery.isLoading, settingsQuery.isRefetching, updateSetting.isPending]
  );

  const actionsValue = useMemo<PromptEngineActions>(
    () => ({
      setPatternTab: config.setPatternTab,
      setExploderSubTab: config.setExploderSubTab,
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
      handleCopy: async (value: string, label: string) => {
        try {
          await navigator.clipboard.writeText(value);
          toast(`${label} copied to clipboard`, { variant: 'success' });
        } catch (error) {
          logClientCatch(error, { source: 'PromptEngineContext', action: 'handleCopy' });
          toast('Failed to copy to clipboard', { variant: 'error' });
        }
      },
    }),
    [config.setPatternTab, config.setExploderSubTab, actions, toast]
  );

  return (
    <ConfigContext.Provider value={configValue}>
      <FiltersContext.Provider value={filtersValue}>
        <DataContext.Provider value={dataValue}>
          <ActionsContext.Provider value={actionsValue}>{children}</ActionsContext.Provider>
        </DataContext.Provider>
      </FiltersContext.Provider>
    </ConfigContext.Provider>
  );
}
