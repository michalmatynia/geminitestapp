'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { SingleQuery } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  DEFAULT_PROMPT_VALIDATION_SCOPES,
  PROMPT_ENGINE_SETTINGS_KEY,
  defaultPromptEngineSettings,
  parsePromptEngineSettings,
  parsePromptValidationRules,
  type PromptEngineSettings,
  type PromptValidationRule,
  type PromptValidationScope,
  type PromptValidationSeverity,
} from '@/shared/lib/prompt-engine/settings';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import type { RuleDraft, RulePatch } from './prompt-engine-context-utils';
import {
  applyRulePatch,
  createNewRule,
  createRuleDraft,
  createSequenceGroupId,
  DEFAULT_SEQUENCE_STEP,
  getSequenceGroupId,
  isCaseResolverPromptExploderRule,
  isImageStudioRule,
  isPromptExploderRule,
  normalizeSequenceGroupDebounceMs,
  ruleSearchText,
  sortRuleDraftsBySequence,
} from './prompt-engine-context-utils';
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

const ActionsContext = React.createContext<PromptEngineActions | null>(null);
const ConfigContext = React.createContext<PromptEngineConfig | null>(null);
const DataContext = React.createContext<PromptEngineData | null>(null);
const FiltersContext = React.createContext<PromptEngineFilters | null>(null);

export const usePromptEngineActions = () => {
  const context = React.useContext(ActionsContext);
  if (!context) throw internalError('usePromptEngineActions must be used within PromptEngineProvider');
  return context;
};

export const usePromptEngineConfig = () => {
  const context = React.useContext(ConfigContext);
  if (!context) throw internalError('usePromptEngineConfig must be used within PromptEngineProvider');
  return context;
};

export const usePromptEngineData = () => {
  const context = React.useContext(DataContext);
  if (!context) throw internalError('usePromptEngineData must be used within PromptEngineProvider');
  return context;
};

export const usePromptEngineFilters = () => {
  const context = React.useContext(FiltersContext);
  if (!context) throw internalError('usePromptEngineFilters must be used within PromptEngineProvider');
  return context;
};

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
          logClientError(error);
          logClientError(error, {
            context: { source: 'PromptEngineContext', action: 'handleCopy' },
          });
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

function usePromptEngineConfigImpl(props: {
  resolvedLockedPatternTab?: PatternCollectionTab;
  resolvedInitialPatternTab?: PatternCollectionTab;
  resolvedLockedExploderSubTab?: ExploderPatternSubTab;
  resolvedInitialExploderSubTab?: ExploderPatternSubTab;
  resolvedLockedScope?: ScopeFilter;
  resolvedInitialScope?: ScopeFilter;
}) {
  const {
    resolvedLockedPatternTab,
    resolvedInitialPatternTab,
    resolvedLockedExploderSubTab,
    resolvedInitialExploderSubTab,
    resolvedLockedScope,
    resolvedInitialScope,
  } = props;

  const [patternTab, setPatternTab] = useState<PatternCollectionTab>(
    resolvedLockedPatternTab ?? resolvedInitialPatternTab ?? 'core'
  );
  const [exploderSubTab, setExploderSubTab] = useState<ExploderPatternSubTab>(
    resolvedLockedExploderSubTab ?? resolvedInitialExploderSubTab ?? 'prompt_exploder_rules'
  );
  const [scope, setScope] = useState<ScopeFilter>(
    resolvedLockedScope ?? resolvedInitialScope ?? 'all'
  );

  const activePatternTab = resolvedLockedPatternTab ?? patternTab;
  const activeExploderSubTab = resolvedLockedExploderSubTab ?? exploderSubTab;
  const activeScope = resolvedLockedScope ?? scope;

  useEffect(() => {
    if (resolvedLockedPatternTab && patternTab !== resolvedLockedPatternTab) {
      setPatternTab(resolvedLockedPatternTab);
    }
  }, [resolvedLockedPatternTab, patternTab]);

  useEffect(() => {
    if (resolvedLockedExploderSubTab && exploderSubTab !== resolvedLockedExploderSubTab) {
      setExploderSubTab(resolvedLockedExploderSubTab);
    }
  }, [resolvedLockedExploderSubTab, exploderSubTab]);

  useEffect(() => {
    if (resolvedLockedScope && scope !== resolvedLockedScope) {
      setScope(resolvedLockedScope);
    }
  }, [resolvedLockedScope, scope]);

  return {
    patternTab,
    setPatternTab,
    exploderSubTab,
    setExploderSubTab,
    scope,
    setScope,
    activePatternTab,
    activeExploderSubTab,
    activeScope,
    patternTabLocked: Boolean(resolvedLockedPatternTab),
    exploderSubTabLocked: Boolean(resolvedLockedExploderSubTab),
    scopeLocked: Boolean(resolvedLockedScope),
  };
}

function usePromptEngineDataImpl(args: {
  settingsQuery: SingleQuery<Map<string, string>>;
  rawSettings: string | null | undefined;
}) {
  const { settingsQuery, rawSettings } = args;

  const [drafts, setDrafts] = useState<RuleDraft[]>([]);
  const [initializedAt, setInitializedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [learnedDrafts, setLearnedDrafts] = useState<RuleDraft[]>([]);
  const [learnedDirty, setLearnedDirty] = useState<boolean>(false);

  useEffect(() => {
    if (settingsQuery.isSuccess && initializedAt !== settingsQuery.dataUpdatedAt) {
      setInitializedAt(settingsQuery.dataUpdatedAt);
      const settings = parsePromptEngineSettings(rawSettings);
      const rules =
        settings.promptValidation.rules ?? defaultPromptEngineSettings.promptValidation.rules;
      setDrafts(
        rules.map((rule: PromptValidationRule, index: number) =>
          createRuleDraft(rule, `${rule.id}-${index}`)
        )
      );
      const learnedRules = settings.promptValidation.learnedRules ?? [];
      setLearnedDrafts(
        learnedRules.map((rule: PromptValidationRule, index: number) =>
          createRuleDraft(rule, `${rule.id}-${index}`)
        )
      );
      setSaveError(null);
      setIsDirty(false);
      setLearnedDirty(false);
    }
  }, [settingsQuery.isSuccess, settingsQuery.dataUpdatedAt, rawSettings, initializedAt]);

  const sortedDrafts = useMemo((): RuleDraft[] => sortRuleDraftsBySequence(drafts), [drafts]);

  return {
    drafts,
    setDrafts,
    initializedAt,
    setInitializedAt,
    saveError,
    setSaveError,
    isDirty,
    setIsDirty,
    learnedDrafts,
    setLearnedDrafts,
    learnedDirty,
    setLearnedDirty,
    sortedDrafts,
  };
}

function usePromptEngineFilteringImpl(args: {
  sortedDrafts: RuleDraft[];
  learnedDrafts: RuleDraft[];
  activePatternTab: PatternCollectionTab;
  activeExploderSubTab: ExploderPatternSubTab;
  activeScope: ScopeFilter;
}) {
  const { sortedDrafts, learnedDrafts, activePatternTab, activeExploderSubTab, activeScope } = args;

  const [query, setQuery] = useState<string>('');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [includeDisabled, setIncludeDisabled] = useState<boolean>(true);

  const filterRules = (targetDrafts: RuleDraft[]) => {
    const term = query.trim().toLowerCase();
    return targetDrafts.filter((draft: RuleDraft): boolean => {
      const rule = draft.parsed;
      if (!rule) {
        if (severity !== 'all') return false;
        if (!term) return true;
        return draft.text.toLowerCase().includes(term);
      }
      if (activePatternTab === 'prompt_exploder') {
        if (activeExploderSubTab === 'image_studio_rules' && !isImageStudioRule(rule)) {
          return false;
        }
        if (
          activeExploderSubTab === 'case_resolver_rules' &&
          !isCaseResolverPromptExploderRule(rule)
        ) {
          return false;
        }
        if (
          activeExploderSubTab === 'prompt_exploder_rules' &&
          (!isPromptExploderRule(rule) ||
            isImageStudioRule(rule) ||
            isCaseResolverPromptExploderRule(rule))
        ) {
          return false;
        }
      }
      if (
        activePatternTab === 'core' &&
        (isPromptExploderRule(rule) ||
          isImageStudioRule(rule) ||
          isCaseResolverPromptExploderRule(rule))
      ) {
        return false;
      }
      if (!includeDisabled && !rule.enabled) return false;
      if (severity !== 'all' && rule.severity !== severity) return false;
      if (
        activeScope !== 'all' &&
        !(rule.appliesToScopes ?? DEFAULT_PROMPT_VALIDATION_SCOPES).includes(activeScope)
      ) {
        return false;
      }
      if (!term) return true;
      return ruleSearchText(rule).includes(term);
    });
  };

  const filteredDrafts = useMemo(
    () => filterRules(sortedDrafts),
    [
      activeExploderSubTab,
      activePatternTab,
      includeDisabled,
      query,
      activeScope,
      severity,
      sortedDrafts,
    ]
  );

  const filteredLearnedDrafts = useMemo(
    () => filterRules(learnedDrafts),
    [
      activeExploderSubTab,
      activePatternTab,
      includeDisabled,
      learnedDrafts,
      query,
      activeScope,
      severity,
    ]
  );

  return {
    query,
    setQuery,
    severity,
    setSeverity,
    includeDisabled,
    setIncludeDisabled,
    filteredDrafts,
    filteredLearnedDrafts,
  };
}

function usePromptEngineActionsImpl(args: {
  drafts: RuleDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<RuleDraft[]>>;
  learnedDrafts: RuleDraft[];
  setLearnedDrafts: React.Dispatch<React.SetStateAction<RuleDraft[]>>;
  setIsDirty: (val: boolean) => void;
  setLearnedDirty: (val: boolean) => void;
  setSaveError: (err: string | null) => void;
  rawSettings: string | null | undefined;
  settingsQuery: SingleQuery<Map<string, string>>;
  resolvedOnSaved?: () => void;
  activePatternTab: PatternCollectionTab;
  activeExploderSubTab: ExploderPatternSubTab;
}) {
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();

  const handleRuleTextChange = useCallback(
    (uid: string, nextText: string): void => {
      args.setDrafts((prev: RuleDraft[]) =>
        prev.map((draft: RuleDraft) => {
          if (draft.uid !== uid) return draft;
          try {
            const parsed = JSON.parse(nextText) as unknown;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
              return {
                ...draft,
                text: nextText,
                parsed: null,
                error: 'Rule JSON must be an object.',
              };
            }
            return {
              ...draft,
              text: nextText,
              parsed: parsed as PromptValidationRule,
              error: null,
            };
          } catch (error) {
            logClientError(error);
            return {
              ...draft,
              text: nextText,
              parsed: null,
              error: error instanceof Error ? error.message : 'Invalid JSON.',
            };
          }
        })
      );
      args.setIsDirty(true);
      args.setSaveError(null);
    },
    [args]
  );

  const handlePatchRule = useCallback(
    (uid: string, patch: RulePatch): void => {
      args.setDrafts((prev: RuleDraft[]) =>
        prev.map((draft: RuleDraft) => (draft.uid === uid ? applyRulePatch(draft, patch) : draft))
      );
      args.setIsDirty(true);
      args.setSaveError(null);
    },
    [args]
  );

  const handleToggleRuleEnabled = useCallback(
    (uid: string, enabled: boolean): void => {
      handlePatchRule(uid, { enabled });
    },
    [handlePatchRule]
  );

  const handleDuplicateRule = useCallback(
    (uid: string): void => {
      args.setDrafts((prev: RuleDraft[]) => {
        const draft = prev.find((item: RuleDraft) => item.uid === uid);
        if (!draft?.parsed) return prev;

        const existingIds = new Set(
          prev
            .map((item: RuleDraft) => item.parsed?.id)
            .filter((value: string | undefined): value is string => Boolean(value))
        );
        const base = `${draft.parsed.id}.copy`;
        let candidate = base;
        let counter = 2;
        while (existingIds.has(candidate)) {
          candidate = `${base}.${counter}`;
          counter += 1;
        }

        const duplicatedRule: PromptValidationRule = {
          ...draft.parsed,
          id: candidate,
          title: `${draft.parsed.title} (copy)`,
          sequence:
            typeof draft.parsed.sequence === 'number' && Number.isFinite(draft.parsed.sequence)
              ? Math.max(0, Math.floor(draft.parsed.sequence) + 10)
              : null,
        };
        return [createRuleDraft(duplicatedRule, `${duplicatedRule.id}-${Date.now()}`), ...prev];
      });
      args.setIsDirty(true);
      args.setSaveError(null);
    },
    [args]
  );

  const handleSequenceDrop = useCallback(
    (draggedUid: string, targetUid: string): void => {
      if (!draggedUid || !targetUid || draggedUid === targetUid) return;
      args.setDrafts((prev: RuleDraft[]) => {
        const ordered = sortRuleDraftsBySequence(prev);
        const fromIndex = ordered.findIndex((item: RuleDraft) => item.uid === draggedUid);
        const targetIndex = ordered.findIndex((item: RuleDraft) => item.uid === targetUid);
        if (fromIndex < 0 || targetIndex < 0) return prev;

        const dragged = ordered[fromIndex];
        const target = ordered[targetIndex];
        if (!dragged?.parsed || !target?.parsed) return prev;

        const reordered = [...ordered];
        const [removed] = reordered.splice(fromIndex, 1);
        if (!removed) return prev;
        let insertIndex = targetIndex + 1;
        if (fromIndex < insertIndex) insertIndex -= 1;
        reordered.splice(Math.max(0, Math.min(insertIndex, reordered.length)), 0, removed);

        const targetGroupId = getSequenceGroupId(target.parsed);
        const draggedGroupId = getSequenceGroupId(dragged.parsed);
        const nextGroupId = targetGroupId ?? createSequenceGroupId();
        const nextGroupLabel =
          target.parsed.sequenceGroupLabel?.trim() ||
          dragged.parsed.sequenceGroupLabel?.trim() ||
          'Sequence / Group';
        const nextGroupDebounceMs = normalizeSequenceGroupDebounceMs(
          target.parsed.sequenceGroupDebounceMs ?? dragged.parsed.sequenceGroupDebounceMs ?? 0
        );

        const updates = new Map<string, RulePatch>();
        const appendUpdate = (uid: string, patch: RulePatch): void => {
          const current = updates.get(uid) ?? {};
          updates.set(uid, { ...current, ...patch } as RulePatch);
        };

        for (const [index, draft] of reordered.entries()) {
          if (!draft.parsed) continue;
          const nextSequence = (index + 1) * DEFAULT_SEQUENCE_STEP;
          const currentSequence =
            typeof draft.parsed.sequence === 'number' && Number.isFinite(draft.parsed.sequence)
              ? Math.floor(draft.parsed.sequence)
              : null;
          if (currentSequence !== nextSequence) {
            appendUpdate(draft.uid, { sequence: nextSequence });
          }
        }

        appendUpdate(dragged.uid, {
          sequenceGroupId: nextGroupId,
          sequenceGroupLabel: nextGroupLabel,
          sequenceGroupDebounceMs: nextGroupDebounceMs,
        });
        if (!targetGroupId) {
          appendUpdate(target.uid, {
            sequenceGroupId: nextGroupId,
            sequenceGroupLabel: nextGroupLabel,
            sequenceGroupDebounceMs: nextGroupDebounceMs,
          });
        }

        if (draggedGroupId && draggedGroupId !== nextGroupId) {
          const remaining = reordered.filter(
            (draft: RuleDraft) =>
              getSequenceGroupId(draft.parsed) === draggedGroupId && draft.uid !== dragged.uid
          );
          if (remaining.length === 1) {
            const lone = remaining[0];
            if (lone) {
              appendUpdate(lone.uid, {
                sequenceGroupId: null,
                sequenceGroupLabel: null,
                sequenceGroupDebounceMs: 0,
              });
            }
          }
        }

        if (updates.size === 0) return prev;
        return reordered.map((draft: RuleDraft) => {
          const patch = updates.get(draft.uid);
          return patch ? applyRulePatch(draft, patch) : draft;
        });
      });
      args.setIsDirty(true);
      args.setSaveError(null);
    },
    [args]
  );

  const handleSaveSequenceGroup = useCallback(
    (groupId: string, label: string, debounceMs: number): void => {
      const normalizedLabel = label.trim() || 'Sequence / Group';
      const normalizedDebounce = normalizeSequenceGroupDebounceMs(debounceMs);
      args.setDrafts((prev: RuleDraft[]) =>
        prev.map((draft: RuleDraft) => {
          if (!draft.parsed) return draft;
          if (getSequenceGroupId(draft.parsed) !== groupId) return draft;
          return applyRulePatch(draft, {
            sequenceGroupId: groupId,
            sequenceGroupLabel: normalizedLabel,
            sequenceGroupDebounceMs: normalizedDebounce,
          });
        })
      );
      args.setIsDirty(true);
      args.setSaveError(null);
    },
    [args]
  );

  const handleUngroupSequenceGroup = useCallback(
    (groupId: string): void => {
      args.setDrafts((prev: RuleDraft[]) =>
        prev.map((draft: RuleDraft) => {
          if (!draft.parsed) return draft;
          if (getSequenceGroupId(draft.parsed) !== groupId) return draft;
          return applyRulePatch(draft, {
            sequenceGroupId: null,
            sequenceGroupLabel: null,
            sequenceGroupDebounceMs: 0,
          });
        })
      );
      args.setIsDirty(true);
      args.setSaveError(null);
    },
    [args]
  );

  const handleLearnedRuleTextChange = useCallback(
    (uid: string, nextText: string): void => {
      args.setLearnedDrafts((prev: RuleDraft[]) =>
        prev.map((draft: RuleDraft) => {
          if (draft.uid !== uid) return draft;
          try {
            const parsed = JSON.parse(nextText) as unknown;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
              return {
                ...draft,
                text: nextText,
                parsed: null,
                error: 'Rule JSON must be an object.',
              };
            }
            return {
              ...draft,
              text: nextText,
              parsed: parsed as PromptValidationRule,
              error: null,
            };
          } catch (error) {
            logClientError(error);
            return {
              ...draft,
              text: nextText,
              parsed: null,
              error: error instanceof Error ? error.message : 'Invalid JSON.',
            };
          }
        })
      );
      args.setLearnedDirty(true);
      args.setSaveError(null);
    },
    [args]
  );

  const handleAddRule = useCallback((): void => {
    const preset =
      args.activePatternTab === 'prompt_exploder'
        ? args.activeExploderSubTab === 'image_studio_rules'
          ? 'image_studio'
          : args.activeExploderSubTab === 'case_resolver_rules'
            ? 'case_resolver'
            : 'prompt_exploder'
        : 'core';
    const newRule = createNewRule(preset);
    args.setDrafts((prev: RuleDraft[]) => [createRuleDraft(newRule), ...prev]);
    args.setIsDirty(true);
    args.setSaveError(null);
  }, [args.activeExploderSubTab, args.activePatternTab, args]);

  const handleAddLearnedRule = useCallback((): void => {
    const newRule: PromptValidationRule = {
      ...createNewRule(),
      id: `learned.${Date.now()}`,
      title: 'Learned validation rule',
    };
    args.setLearnedDrafts((prev: RuleDraft[]) => [createRuleDraft(newRule), ...prev]);
    args.setLearnedDirty(true);
    args.setSaveError(null);
  }, [args]);

  const handleRemoveRule = useCallback(
    (uid: string): void => {
      args.setDrafts((prev: RuleDraft[]) => prev.filter((draft: RuleDraft) => draft.uid !== uid));
      args.setIsDirty(true);
      args.setSaveError(null);
    },
    [args]
  );

  const handleRemoveLearnedRule = useCallback(
    (uid: string): void => {
      args.setLearnedDrafts((prev: RuleDraft[]) =>
        prev.filter((draft: RuleDraft) => draft.uid !== uid)
      );
      args.setLearnedDirty(true);
      args.setSaveError(null);
    },
    [args]
  );

  const handleRefresh = useCallback(async (): Promise<void> => {
    args.setSaveError(null);
    await args.settingsQuery.refetch();
  }, [args]);

  const handleExport = useCallback((): void => {
    const invalidJson = args.drafts.filter((draft: RuleDraft) => draft.error || !draft.parsed);
    if (invalidJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidJson.length} rule(s) before exporting.`, {
        variant: 'error',
      });
      return;
    }
    const parsedRules = args.drafts.map((draft: RuleDraft) => draft.parsed!).filter(Boolean);
    const result = parsePromptValidationRules(JSON.stringify(parsedRules));
    if (!result.ok) {
      toast(result.error, { variant: 'error' });
      return;
    }
    const blob = new Blob([JSON.stringify(result.rules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `prompt-engine-validation-patterns-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [args.drafts, toast]);

  const handleExportLearned = useCallback((): void => {
    const invalidJson = args.learnedDrafts.filter(
      (draft: RuleDraft) => draft.error || !draft.parsed
    );
    if (invalidJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidJson.length} learned rule(s) before exporting.`, {
        variant: 'error',
      });
      return;
    }
    const parsedRules = args.learnedDrafts.map((draft: RuleDraft) => draft.parsed!).filter(Boolean);
    const result = parsePromptValidationRules(JSON.stringify(parsedRules));
    if (!result.ok) {
      toast(result.error, { variant: 'error' });
      return;
    }
    const blob = new Blob([JSON.stringify(result.rules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `prompt-engine-learned-patterns-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [args.learnedDrafts, toast]);

  const parseImportedRules = useCallback(
    (raw: string): { ok: true; rules: PromptValidationRule[] } | { ok: false; error: string } => {
      const direct = parsePromptValidationRules(raw);
      if (direct.ok) return direct;

      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const record = parsed as Record<string, unknown>;
          const nested = record['rules'] ?? record['patterns'];
          if (Array.isArray(nested)) {
            return parsePromptValidationRules(JSON.stringify(nested));
          }
        }
      } catch (error) {
        logClientError(error);
        // no-op
      }

      return direct;
    },
    []
  );

  const handleImport = useCallback(
    async (file: File): Promise<void> => {
      const text = await file.text();
      const result = parseImportedRules(text);
      if (!result.ok) {
        toast(result.error, { variant: 'error' });
        return;
      }
      args.setDrafts(
        result.rules.map((rule: PromptValidationRule, index: number) =>
          createRuleDraft(rule, `${rule.id}-${index}`)
        )
      );
      args.setIsDirty(true);
      args.setSaveError(null);
      toast('Validation patterns imported. Review and save to apply.', { variant: 'success' });
    },
    [parseImportedRules, toast, args]
  );

  const handleImportLearned = useCallback(
    async (file: File): Promise<void> => {
      const text = await file.text();
      const result = parseImportedRules(text);
      if (!result.ok) {
        toast(result.error, { variant: 'error' });
        return;
      }
      args.setLearnedDrafts(
        result.rules.map((rule: PromptValidationRule, index: number) =>
          createRuleDraft(rule, `${rule.id}-${index}`)
        )
      );
      args.setLearnedDirty(true);
      args.setSaveError(null);
      toast('Learned patterns imported. Review and save to apply.', { variant: 'success' });
    },
    [parseImportedRules, toast, args]
  );

  const handleSave = useCallback(async (): Promise<void> => {
    const invalidJson = args.drafts.filter((draft: RuleDraft) => draft.error || !draft.parsed);
    if (invalidJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidJson.length} rule(s) before saving.`, {
        variant: 'error',
      });
      return;
    }
    const invalidLearnedJson = args.learnedDrafts.filter(
      (draft: RuleDraft) => draft.error || !draft.parsed
    );
    if (invalidLearnedJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidLearnedJson.length} learned rule(s) before saving.`, {
        variant: 'error',
      });
      return;
    }

    try {
      const currentSettings = parsePromptEngineSettings(args.rawSettings);
      const nextSettings = {
        ...currentSettings,
        promptValidation: {
          ...currentSettings.promptValidation,
          rules: args.drafts.map((d) => d.parsed!),
          learnedRules: args.learnedDrafts.map((d) => d.parsed!),
        },
      };

      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });

      args.setIsDirty(false);
      args.setLearnedDirty(false);
      args.setSaveError(null);
      toast('Prompt engine settings saved successfully.', { variant: 'success' });
      if (args.resolvedOnSaved) args.resolvedOnSaved();
    } catch (error) {
      logClientError(error);
      logClientError(error, { context: { source: 'PromptEngineContext', action: 'handleSave' } });
      const message = error instanceof Error ? error.message : 'Failed to save settings.';
      args.setSaveError(message);
      toast(message, { variant: 'error' });
    }
  }, [args, toast, updateSetting]);

  return {
    handleRuleTextChange,
    handlePatchRule,
    handleToggleRuleEnabled,
    handleDuplicateRule,
    handleSequenceDrop,
    handleSaveSequenceGroup,
    handleUngroupSequenceGroup,
    handleLearnedRuleTextChange,
    handleAddRule,
    handleAddLearnedRule,
    handleRemoveRule,
    handleRemoveLearnedRule,
    handleRefresh,
    handleExport,
    handleExportLearned,
    handleImport,
    handleImportLearned,
    handleSave,
  };
}
