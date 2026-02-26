'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import { useOptionalPromptEngineValidationPageContext } from './PromptEngineValidationPageContext';
import {
  DEFAULT_PROMPT_VALIDATION_SCOPES,
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
  parsePromptValidationRules,
  defaultPromptEngineSettings,
  type PromptValidationRule,
} from '../settings';
import {
  applyRulePatch,
  createNewRule,
  createRuleDraft,
  createSequenceGroupId,
  getSequenceGroupId,
  isCaseResolverPromptExploderRule,
  isImageStudioRule,
  isPromptExploderRule,
  normalizeSequenceGroupDebounceMs,
  ruleSearchText,
  sortRuleDraftsBySequence,
  type RuleDraft,
  type RulePatch,
  DEFAULT_SEQUENCE_STEP,
} from './prompt-engine-context-utils';

import { 
  ConfigContext, 
  type PromptEngineConfig, 
  type PatternCollectionTab, 
  type ExploderPatternSubTab 
} from './prompt-engine/PromptEngineConfigContext';

export type { PatternCollectionTab, ExploderPatternSubTab };
import { 
  FiltersContext, 
  type PromptEngineFilters, 
  type SeverityFilter, 
  type ScopeFilter 
} from './prompt-engine/PromptEngineFiltersContext';
import { 
  DataContext, 
  type PromptEngineData 
} from './prompt-engine/PromptEngineDataContext';
import { 
  ActionsContext, 
  type PromptEngineActions 
} from './prompt-engine/PromptEngineActionsContext';
import type { AdminMenuTreeContextValue } from '../admin/components/menu/NavTree';

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

export interface PromptEngineContextValue extends PromptEngineConfig, PromptEngineFilters, PromptEngineData, PromptEngineActions {}

const PromptEngineContext = createContext<PromptEngineContextValue | undefined>(undefined);

export type AdminMenuTreeContextValueAlias = AdminMenuTreeContextValue;

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
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const pageContext = useOptionalPromptEngineValidationPageContext();
  const resolvedOnSaved = onSaved ?? pageContext?.onSaved;
  const resolvedInitialPatternTab = initialPatternTab ?? pageContext?.initialPatternTab;
  const resolvedInitialExploderSubTab =
    initialExploderSubTab ?? pageContext?.initialExploderSubTab;
  const resolvedLockedPatternTab = lockedPatternTab ?? pageContext?.lockedPatternTab;
  const resolvedLockedExploderSubTab =
    lockedExploderSubTab ?? pageContext?.lockedExploderSubTab;
  const resolvedInitialScope = initialScope ?? pageContext?.initialScope;
  const resolvedLockedScope = lockedScope ?? pageContext?.lockedScope;

  const rawSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const promptEngineSettings = useMemo(() => parsePromptEngineSettings(rawSettings), [rawSettings]);
  
  const [query, setQuery] = useState<string>('');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>(
    resolvedLockedScope ?? resolvedInitialScope ?? 'all'
  );
  const [patternTab, setPatternTab] = useState<PatternCollectionTab>(
    resolvedLockedPatternTab ?? resolvedInitialPatternTab ?? 'core'
  );
  const [exploderSubTab, setExploderSubTab] =
    useState<ExploderPatternSubTab>(
      resolvedLockedExploderSubTab ??
        resolvedInitialExploderSubTab ??
        'prompt_exploder_rules'
    );
  const [includeDisabled, setIncludeDisabled] = useState<boolean>(true);
  const [drafts, setDrafts] = useState<RuleDraft[]>([]);
  const [initializedAt, setInitializedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [learnedDrafts, setLearnedDrafts] = useState<RuleDraft[]>([]);
  const [learnedDirty, setLearnedDirty] = useState<boolean>(false);
  const activePatternTab = resolvedLockedPatternTab ?? patternTab;
  const activeExploderSubTab = resolvedLockedExploderSubTab ?? exploderSubTab;
  const patternTabLocked = Boolean(resolvedLockedPatternTab);
  const exploderSubTabLocked = Boolean(resolvedLockedExploderSubTab);
  const scopeLocked = Boolean(resolvedLockedScope);

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

  useEffect(() => {
    if (settingsQuery.isSuccess && initializedAt !== settingsQuery.dataUpdatedAt) {
      setInitializedAt(settingsQuery.dataUpdatedAt);
      const settings = parsePromptEngineSettings(rawSettings);
      const rules = settings.promptValidation.rules ?? defaultPromptEngineSettings.promptValidation.rules;
      setDrafts(rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
      const learnedRules = settings.promptValidation.learnedRules ?? [];
      setLearnedDrafts(learnedRules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
      setSaveError(null);
      setIsDirty(false);
      setLearnedDirty(false);
    }
  }, [settingsQuery.isSuccess, settingsQuery.dataUpdatedAt, rawSettings, initializedAt]);

  const sortedDrafts = useMemo((): RuleDraft[] => sortRuleDraftsBySequence(drafts), [drafts]);

  const filteredDrafts = useMemo((): RuleDraft[] => {
    const term = query.trim().toLowerCase();
    return sortedDrafts.filter((draft: RuleDraft): boolean => {
      const rule = draft.parsed;
      if (!rule) {
        if (severity !== 'all') return false;
        if (!term) return true;
        return draft.text.toLowerCase().includes(term);
      }
      if (activePatternTab === 'prompt_exploder') {
        if (
          activeExploderSubTab === 'image_studio_rules' &&
          !isImageStudioRule(rule)
        ) {
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
        scope !== 'all' &&
        !(rule.appliesToScopes ?? DEFAULT_PROMPT_VALIDATION_SCOPES).includes(scope)
      ) {
        return false;
      }
      if (!term) return true;
      return ruleSearchText(rule).includes(term);
    });
  }, [
    activeExploderSubTab,
    activePatternTab,
    includeDisabled,
    query,
    scope,
    severity,
    sortedDrafts,
  ]);

  const filteredLearnedDrafts = useMemo((): RuleDraft[] => {
    const term = query.trim().toLowerCase();
    return learnedDrafts.filter((draft: RuleDraft): boolean => {
      const rule = draft.parsed;
      if (!rule) {
        if (severity !== 'all') return false;
        if (!term) return true;
        return draft.text.toLowerCase().includes(term);
      }
      if (activePatternTab === 'prompt_exploder') {
        if (
          activeExploderSubTab === 'image_studio_rules' &&
          !isImageStudioRule(rule)
        ) {
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
        scope !== 'all' &&
        !(rule.appliesToScopes ?? DEFAULT_PROMPT_VALIDATION_SCOPES).includes(scope)
      ) {
        return false;
      }
      if (!term) return true;
      return ruleSearchText(rule).includes(term);
    });
  }, [
    activeExploderSubTab,
    activePatternTab,
    includeDisabled,
    learnedDrafts,
    query,
    scope,
    severity,
  ]);

  const handleRuleTextChange = useCallback((uid: string, nextText: string): void => {
    setDrafts((prev: RuleDraft[]) =>
      prev.map((draft: RuleDraft) => {
        if (draft.uid !== uid) return draft;
        try {
          const parsed = JSON.parse(nextText) as unknown;
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { ...draft, text: nextText, parsed: null, error: 'Rule JSON must be an object.' };
          }
          return { ...draft, text: nextText, parsed: parsed as PromptValidationRule, error: null };
        } catch (error) {
          return {
            ...draft,
            text: nextText,
            parsed: null,
            error: error instanceof Error ? error.message : 'Invalid JSON.',
          };
        }
      })
    );
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handlePatchRule = useCallback((uid: string, patch: RulePatch): void => {
    setDrafts((prev: RuleDraft[]) =>
      prev.map((draft: RuleDraft) => (draft.uid === uid ? applyRulePatch(draft, patch) : draft))
    );
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleToggleRuleEnabled = useCallback((uid: string, enabled: boolean): void => {
    handlePatchRule(uid, { enabled });
  }, [handlePatchRule]);

  const handleDuplicateRule = useCallback((uid: string): void => {
    setDrafts((prev: RuleDraft[]) => {
      const draft = prev.find((item: RuleDraft) => item.uid === uid);
      if (!draft?.parsed) return prev;

      const existingIds = new Set(
        prev
          .map((item: RuleDraft) => item.parsed?.id)
          .filter((value: string | undefined): value is string => Boolean(value)),
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
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleSequenceDrop = useCallback((draggedUid: string, targetUid: string): void => {
    if (!draggedUid || !targetUid || draggedUid === targetUid) return;
    setDrafts((prev: RuleDraft[]) => {
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
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleSaveSequenceGroup = useCallback((groupId: string, label: string, debounceMs: number): void => {
    const normalizedLabel = label.trim() || 'Sequence / Group';
    const normalizedDebounce = normalizeSequenceGroupDebounceMs(debounceMs);
    setDrafts((prev: RuleDraft[]) =>
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
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleUngroupSequenceGroup = useCallback((groupId: string): void => {
    setDrafts((prev: RuleDraft[]) =>
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
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleLearnedRuleTextChange = useCallback((uid: string, nextText: string): void => {
    setLearnedDrafts((prev: RuleDraft[]) =>
      prev.map((draft: RuleDraft) => {
        if (draft.uid !== uid) return draft;
        try {
          const parsed = JSON.parse(nextText) as unknown;
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { ...draft, text: nextText, parsed: null, error: 'Rule JSON must be an object.' };
          }
          return { ...draft, text: nextText, parsed: parsed as PromptValidationRule, error: null };
        } catch (error) {
          return {
            ...draft,
            text: nextText,
            parsed: null,
            error: error instanceof Error ? error.message : 'Invalid JSON.',
          };
        }
      })
    );
    setLearnedDirty(true);
    setSaveError(null);
  }, []);

  const handleSetPatternTab = useCallback((tab: PatternCollectionTab): void => {
    if (resolvedLockedPatternTab) return;
    setPatternTab(tab);
  }, [resolvedLockedPatternTab]);

  const handleSetExploderSubTab = useCallback((subTab: ExploderPatternSubTab): void => {
    if (resolvedLockedExploderSubTab) return;
    setExploderSubTab(subTab);
  }, [resolvedLockedExploderSubTab]);
  const handleSetScope = useCallback((nextScope: ScopeFilter): void => {
    if (resolvedLockedScope) return;
    setScope(nextScope);
  }, [resolvedLockedScope]);

  const handleAddRule = useCallback((): void => {
    const preset =
      activePatternTab === 'prompt_exploder'
        ? activeExploderSubTab === 'image_studio_rules'
          ? 'image_studio'
          : activeExploderSubTab === 'case_resolver_rules'
            ? 'case_resolver'
            : 'prompt_exploder'
        : 'core';
    const newRule = createNewRule(preset);
    setDrafts((prev: RuleDraft[]) => [createRuleDraft(newRule), ...prev]);
    setIsDirty(true);
    setSaveError(null);
  }, [activeExploderSubTab, activePatternTab]);

  const handleAddLearnedRule = useCallback((): void => {
    const newRule: PromptValidationRule = {
      ...createNewRule(),
      id: `learned.${Date.now()}`,
      title: 'Learned validation rule',
    };
    setLearnedDrafts((prev: RuleDraft[]) => [createRuleDraft(newRule), ...prev]);
    setLearnedDirty(true);
    setSaveError(null);
  }, []);

  const handleRemoveRule = useCallback((uid: string): void => {
    setDrafts((prev: RuleDraft[]) => prev.filter((draft: RuleDraft) => draft.uid !== uid));
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleRemoveLearnedRule = useCallback((uid: string): void => {
    setLearnedDrafts((prev: RuleDraft[]) => prev.filter((draft: RuleDraft) => draft.uid !== uid));
    setLearnedDirty(true);
    setSaveError(null);
  }, []);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setSaveError(null);
    await settingsQuery.refetch();
  }, [settingsQuery]);

  const handleExport = useCallback((): void => {
    const invalidJson = drafts.filter((draft: RuleDraft) => draft.error || !draft.parsed);
    if (invalidJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidJson.length} rule(s) before exporting.`, { variant: 'error' });
      return;
    }
    const parsedRules = drafts.map((draft: RuleDraft) => draft.parsed!).filter(Boolean);
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
  }, [drafts, toast]);

  const handleExportLearned = useCallback((): void => {
    const invalidJson = learnedDrafts.filter((draft: RuleDraft) => draft.error || !draft.parsed);
    if (invalidJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidJson.length} learned rule(s) before exporting.`, { variant: 'error' });
      return;
    }
    const parsedRules = learnedDrafts.map((draft: RuleDraft) => draft.parsed!).filter(Boolean);
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
  }, [learnedDrafts, toast]);

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
      } catch {
        // no-op
      }

      return direct;
    },
    []
  );

  const handleImport = useCallback(async (file: File): Promise<void> => {
    const text = await file.text();
    const result = parseImportedRules(text);
    if (!result.ok) {
      toast(result.error, { variant: 'error' });
      return;
    }
    setDrafts(result.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
    setIsDirty(true);
    setSaveError(null);
    toast('Validation patterns imported. Review and save to apply.', { variant: 'success' });
  }, [parseImportedRules, toast]);

  const handleImportLearned = useCallback(async (file: File): Promise<void> => {
    const text = await file.text();
    const result = parseImportedRules(text);
    if (!result.ok) {
      toast(result.error, { variant: 'error' });
      return;
    }
    setLearnedDrafts(result.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
    setLearnedDirty(true);
    setSaveError(null);
    toast('Learned patterns imported. Review and save to apply.', { variant: 'success' });
  }, [parseImportedRules, toast]);

  const handleSave = useCallback(async (): Promise<void> => {
    const invalidJson = drafts.filter((draft: RuleDraft) => draft.error || !draft.parsed);
    if (invalidJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidJson.length} rule(s) before saving.`, { variant: 'error' });
      return;
    }
    const invalidLearnedJson = learnedDrafts.filter((draft: RuleDraft) => draft.error || !draft.parsed);
    if (invalidLearnedJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidLearnedJson.length} learned rule(s) before saving.`, { variant: 'error' });
      return;
    }

    const parsedRules = drafts.map((draft: RuleDraft) => draft.parsed!).filter(Boolean);
    const parsedLearnedRules = learnedDrafts.map((draft: RuleDraft) => draft.parsed!).filter(Boolean);
    
    const invalidRuleIds: string[] = [];
    parsedRules.forEach((rule, index) => {
      const result = parsePromptValidationRules(JSON.stringify([rule]));
      if (!result.ok) invalidRuleIds.push(rule.id || `#${index + 1}`);
    });
    if (invalidRuleIds.length > 0) {
      toast(`Invalid rule(s): ${invalidRuleIds.join(', ')}.`, { variant: 'error' });
      return;
    }

    const invalidLearnedIds: string[] = [];
    parsedLearnedRules.forEach((rule, index) => {
      const result = parsePromptValidationRules(JSON.stringify([rule]));
      if (!result.ok) invalidLearnedIds.push(rule.id || `#${index + 1}`);
    });
    if (invalidLearnedIds.length > 0) {
      toast(`Invalid learned rule(s): ${invalidLearnedIds.join(', ')}.`, { variant: 'error' });
      return;
    }

    const result = parsePromptValidationRules(JSON.stringify(parsedRules));
    if (!result.ok) {
      toast(result.error, { variant: 'error' });
      return;
    }
    const learnedResult = parsePromptValidationRules(JSON.stringify(parsedLearnedRules));
    if (!learnedResult.ok) {
      toast(learnedResult.error, { variant: 'error' });
      return;
    }

    try {
      const currentSettings = parsePromptEngineSettings(rawSettings);
      const nextSettings = {
        ...currentSettings,
        promptValidation: {
          ...currentSettings.promptValidation,
          rules: result.rules,
          learnedRules: learnedResult.rules,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setDrafts(result.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
      setLearnedDrafts(learnedResult.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
      setIsDirty(false);
      setLearnedDirty(false);
      toast('Validation patterns saved.', { variant: 'success' });
      resolvedOnSaved?.();
    } catch (error) {
      logClientError(error, { context: { source: 'PromptEngineContext', action: 'saveRules' } });
      toast('Failed to save rules.', { variant: 'error' });
    }
  }, [drafts, learnedDrafts, resolvedOnSaved, rawSettings, toast, updateSetting]);

  const handleCopy = async (value: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copied.`, { variant: 'success' });
    } catch {
      toast('Failed to copy.', { variant: 'error' });
    }
  };

  const configValue = useMemo<PromptEngineConfig>(() => ({
    promptEngineSettings,
    patternTab: activePatternTab,
    exploderSubTab: activeExploderSubTab,
    patternTabLocked,
    exploderSubTabLocked,
    scopeLocked,
    isUsingDefaults: !rawSettings,
  }), [promptEngineSettings, activePatternTab, activeExploderSubTab, patternTabLocked, exploderSubTabLocked, scopeLocked, rawSettings]);

  const filtersValue = useMemo<PromptEngineFilters>(() => ({
    query,
    setQuery,
    severity,
    setSeverity,
    scope,
    setScope: handleSetScope,
    includeDisabled,
    setIncludeDisabled,
  }), [query, severity, scope, handleSetScope, includeDisabled]);

  const dataValue = useMemo<PromptEngineData>(() => ({
    drafts,
    learnedDrafts,
    filteredDrafts,
    filteredLearnedDrafts,
    isDirty,
    learnedDirty,
    saveError,
    isLoading: settingsQuery.isLoading,
    isSaving: updateSetting.isPending,
  }), [drafts, learnedDrafts, filteredDrafts, filteredLearnedDrafts, isDirty, learnedDirty, saveError, settingsQuery.isLoading, updateSetting.isPending]);

  const actionsValue = useMemo<PromptEngineActions>(() => ({
    setPatternTab: handleSetPatternTab,
    setExploderSubTab: handleSetExploderSubTab,
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
    handleCopy,
  }), [handleSetPatternTab, handleSetExploderSubTab, handleRuleTextChange, handlePatchRule, handleToggleRuleEnabled, handleDuplicateRule, handleSequenceDrop, handleSaveSequenceGroup, handleUngroupSequenceGroup, handleLearnedRuleTextChange, handleAddRule, handleAddLearnedRule, handleRemoveRule, handleRemoveLearnedRule, handleRefresh, handleExport, handleExportLearned, handleImport, handleImportLearned, handleSave, handleCopy]);

  const aggregatedValue = useMemo<PromptEngineContextValue>(() => ({
    ...configValue,
    ...filtersValue,
    ...dataValue,
    ...actionsValue,
  }), [configValue, filtersValue, dataValue, actionsValue]);

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

export function usePromptEngine(): PromptEngineContextValue {
  const context = useContext(PromptEngineContext);
  if (context === undefined) {
    throw new Error('usePromptEngine must be used within a PromptEngineProvider');
  }
  return context;
}
