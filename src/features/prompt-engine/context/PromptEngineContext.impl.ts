'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { SingleQuery } from '@/shared/contracts/ui/queries';
import {
  DEFAULT_PROMPT_VALIDATION_SCOPES,
  PROMPT_ENGINE_SETTINGS_KEY,
  defaultPromptEngineSettings,
  parsePromptEngineSettings,
  parsePromptValidationRules,
  type PromptValidationRule,
} from '@/shared/lib/prompt-engine/settings';
import { useToast } from '@/shared/ui/primitives.public';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import type {
  ExploderPatternSubTab,
  PatternCollectionTab,
  ScopeFilter,
  SeverityFilter,
} from './PromptEngineContext';
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

export function usePromptEngineConfigImpl(props: {
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

export function usePromptEngineDataImpl(args: {
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

export function usePromptEngineFilteringImpl(args: {
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

export function usePromptEngineActionsImpl(args: {
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
          rules: args.drafts.map((draft) => draft.parsed!),
          learnedRules: args.learnedDrafts.map((draft) => draft.parsed!),
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
      logClientCatch(error, { source: 'PromptEngineContext', action: 'handleSave' });
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
