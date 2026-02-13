'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

import { logClientError } from '@/features/observability';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  DEFAULT_PROMPT_VALIDATION_SCOPES,
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
  parsePromptValidationRules,
  defaultPromptEngineSettings,
  type PromptValidationScope,
  type PromptValidationRule,
  type PromptValidationSeverity,
  type PromptEngineSettings,
  type PromptAutofixOperation,
} from '../settings';

export type SeverityFilter = PromptValidationSeverity | 'all';
export type ScopeFilter = PromptValidationScope | 'all';
export type PatternCollectionTab = 'core' | 'prompt_exploder';
export type ExploderPatternSubTab = 'prompt_exploder_rules' | 'image_studio_rules';

export type RuleDraft = {
  uid: string;
  text: string;
  parsed: PromptValidationRule | null;
  error: string | null;
};

type RulePatch = Partial<PromptValidationRule>;

interface PromptEngineContextType {
  // State
  promptEngineSettings: PromptEngineSettings;
  query: string;
  severity: SeverityFilter;
  scope: ScopeFilter;
  patternTab: PatternCollectionTab;
  exploderSubTab: ExploderPatternSubTab;
  includeDisabled: boolean;
  drafts: RuleDraft[];
  learnedDrafts: RuleDraft[];
  isDirty: boolean;
  learnedDirty: boolean;
  saveError: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isUsingDefaults: boolean;
  
  // Derived state
  filteredDrafts: RuleDraft[];
  filteredLearnedDrafts: RuleDraft[];
  
  // Actions
  setQuery: (query: string) => void;
  setSeverity: (severity: SeverityFilter) => void;
  setScope: (scope: ScopeFilter) => void;
  setPatternTab: (tab: PatternCollectionTab) => void;
  setExploderSubTab: (subTab: ExploderPatternSubTab) => void;
  setIncludeDisabled: (include: boolean) => void;
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

const PromptEngineContext = createContext<PromptEngineContextType | undefined>(undefined);

const createRuleDraft = (rule: PromptValidationRule, uid: string = rule.id): RuleDraft => ({
  uid,
  text: JSON.stringify(rule, null, 2),
  parsed: rule,
  error: null,
});

const DEFAULT_SEQUENCE_STEP = 10;
const IMAGE_STUDIO_SCOPE_VALUES: PromptValidationScope[] = [
  'image_studio_prompt',
  'image_studio_extraction',
  'image_studio_generation',
];
const IMAGE_STUDIO_SCOPE_SET = new Set<PromptValidationScope>(
  IMAGE_STUDIO_SCOPE_VALUES
);

const createSequenceGroupId = (): string => {
  const random = Math.random().toString(36).slice(2, 8);
  return `seq_${Date.now().toString(36)}_${random}`;
};

const normalizeSequenceGroupDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

const getSequenceGroupId = (rule: PromptValidationRule | null | undefined): string | null => {
  const value = rule?.sequenceGroupId?.trim();
  return value ? value : null;
};

const getRuleSequence = (rule: PromptValidationRule, fallbackIndex: number): number => {
  if (typeof rule.sequence === 'number' && Number.isFinite(rule.sequence)) {
    return Math.max(0, Math.floor(rule.sequence));
  }
  return (fallbackIndex + 1) * DEFAULT_SEQUENCE_STEP;
};

const normalizeRuleScopes = (
  scopes: PromptValidationScope[] | null | undefined
): PromptValidationScope[] => {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [...DEFAULT_PROMPT_VALIDATION_SCOPES];
  }
  const known = [...DEFAULT_PROMPT_VALIDATION_SCOPES];
  const deduped: PromptValidationScope[] = [];
  for (const scope of scopes) {
    if (!known.includes(scope) || deduped.includes(scope)) continue;
    deduped.push(scope);
  }
  return deduped.length > 0 ? deduped : [...DEFAULT_PROMPT_VALIDATION_SCOPES];
};

const hasOnlyImageStudioScopes = (scopes: PromptValidationScope[]): boolean =>
  scopes.some((scope) => IMAGE_STUDIO_SCOPE_SET.has(scope)) &&
  scopes.every((scope) => IMAGE_STUDIO_SCOPE_SET.has(scope) || scope === 'global');

const isImageStudioRule = (rule: PromptValidationRule): boolean => {
  const id = rule.id.toLowerCase();
  if (id.includes('image_studio') || id.includes('image-studio')) {
    return true;
  }

  const appliesToScopes = normalizeRuleScopes(rule.appliesToScopes);
  const launchScopes = normalizeRuleScopes(rule.launchAppliesToScopes);
  return hasOnlyImageStudioScopes(appliesToScopes) || hasOnlyImageStudioScopes(launchScopes);
};

const sortRuleDraftsBySequence = (drafts: RuleDraft[]): RuleDraft[] =>
  drafts
    .map((draft: RuleDraft, index: number) => ({ draft, index }))
    .sort((a, b) => {
      if (!a.draft.parsed && !b.draft.parsed) return 0;
      if (!a.draft.parsed) return 1;
      if (!b.draft.parsed) return -1;
      const aSeq = getRuleSequence(a.draft.parsed, a.index);
      const bSeq = getRuleSequence(b.draft.parsed, b.index);
      if (aSeq !== bSeq) return aSeq - bSeq;
      return a.draft.parsed.id.localeCompare(b.draft.parsed.id);
    })
    .map((entry) => entry.draft);

const applyRulePatch = (draft: RuleDraft, patch: RulePatch): RuleDraft => {
  if (!draft.parsed) return draft;
  const nextRule = { ...draft.parsed, ...patch } as PromptValidationRule;
  return {
    ...draft,
    parsed: nextRule,
    text: JSON.stringify(nextRule, null, 2),
    error: null,
  };
};

const createNewRule = (
  preset: 'core' | 'prompt_exploder' | 'image_studio' = 'core'
): PromptValidationRule => {
  const now = Date.now();
  const baseRule: PromptValidationRule = {
    kind: 'regex',
    id: `custom.rule.${now}`,
    enabled: true,
    severity: 'warning',
    title: 'New validation rule',
    description: null,
    pattern: '^$',
    flags: 'mi',
    message: 'Update this rule with the intended pattern and message.',
    similar: [],
    autofix: { enabled: true, operations: [] },
    appliesToScopes: [...DEFAULT_PROMPT_VALIDATION_SCOPES],
    launchAppliesToScopes: [...DEFAULT_PROMPT_VALIDATION_SCOPES],
    launchScopeBehavior: 'gate',
  };

  if (preset === 'prompt_exploder') {
    return {
      ...baseRule,
      id: `prompt_exploder.rule.${now}`,
      title: 'Prompt Exploder rule',
      description: 'Rule scoped to Prompt Exploder.',
      appliesToScopes: ['prompt_exploder'],
      launchAppliesToScopes: ['prompt_exploder'],
    };
  }

  if (preset === 'image_studio') {
    return {
      ...baseRule,
      id: `image_studio.rule.${now}`,
      title: 'Image Studio rule',
      description: 'Rule scoped to Image Studio prompt, extraction, and generation.',
      appliesToScopes: [...IMAGE_STUDIO_SCOPE_VALUES],
      launchAppliesToScopes: [...IMAGE_STUDIO_SCOPE_VALUES],
    };
  }

  return baseRule;
};

const ruleSearchText = (rule: PromptValidationRule): string => {
  const parts: string[] = [
    rule.id,
    rule.kind,
    rule.severity,
    rule.title,
    rule.message,
    rule.description ?? '',
  ];
  (rule.appliesToScopes ?? DEFAULT_PROMPT_VALIDATION_SCOPES).forEach((scope) =>
    parts.push(scope)
  );
  (rule.launchAppliesToScopes ?? DEFAULT_PROMPT_VALIDATION_SCOPES).forEach((scope) =>
    parts.push(scope)
  );
  if (rule.kind === 'regex') {
    parts.push(rule.pattern);
    parts.push(rule.flags);
  }
  (rule.similar ?? []).forEach((sim) => {
    parts.push(sim.pattern);
    parts.push(sim.flags ?? '');
    parts.push(sim.suggestion);
    parts.push(sim.comment ?? '');
  });
  (rule.autofix?.operations ?? []).forEach((op: PromptAutofixOperation) => {
    parts.push(op.kind);
    if (op.kind === 'replace') {
      parts.push(op.pattern);
      parts.push(op.flags ?? '');
      parts.push(op.replacement);
      parts.push(op.comment ?? '');
    } else {
      parts.push(op.comment ?? '');
    }
  });
  return parts.filter(Boolean).join(' ').toLowerCase();
};

const isPromptExploderRule = (rule: PromptValidationRule): boolean => {
  const id = rule.id.toLowerCase();
  if (id.includes('prompt_exploder') || id.includes('exploder') || id.startsWith('segment.')) {
    return true;
  }

  const appliesToScopes = rule.appliesToScopes ?? DEFAULT_PROMPT_VALIDATION_SCOPES;
  const launchScopes = rule.launchAppliesToScopes ?? DEFAULT_PROMPT_VALIDATION_SCOPES;

  const hasPromptScope = appliesToScopes.includes('prompt_exploder');
  const hasOnlyPromptOrGlobal =
    hasPromptScope &&
    appliesToScopes.every(
      (scope: PromptValidationScope) => scope === 'prompt_exploder' || scope === 'global'
    );
  if (hasOnlyPromptOrGlobal) return true;

  const hasPromptLaunchScope = launchScopes.includes('prompt_exploder');
  const hasOnlyPromptLaunchOrGlobal =
    hasPromptLaunchScope &&
    launchScopes.every(
      (scope: PromptValidationScope) => scope === 'prompt_exploder' || scope === 'global'
    );

  return hasOnlyPromptLaunchOrGlobal;
};

export function PromptEngineProvider({
  children,
  onSaved,
}: {
  children: React.ReactNode;
  onSaved?: (() => void) | undefined;
}): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const rawSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const promptEngineSettings = useMemo(() => parsePromptEngineSettings(rawSettings), [rawSettings]);
  
  const [query, setQuery] = useState<string>('');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [patternTab, setPatternTab] = useState<PatternCollectionTab>('core');
  const [exploderSubTab, setExploderSubTab] =
    useState<ExploderPatternSubTab>('prompt_exploder_rules');
  const [includeDisabled, setIncludeDisabled] = useState<boolean>(true);
  const [drafts, setDrafts] = useState<RuleDraft[]>([]);
  const [initializedAt, setInitializedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [learnedDrafts, setLearnedDrafts] = useState<RuleDraft[]>([]);
  const [learnedDirty, setLearnedDirty] = useState<boolean>(false);

  // Sync state with settings query
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
      if (patternTab === 'prompt_exploder') {
        if (
          exploderSubTab === 'image_studio_rules' &&
          !isImageStudioRule(rule)
        ) {
          return false;
        }
        if (
          exploderSubTab === 'prompt_exploder_rules' &&
          !isPromptExploderRule(rule)
        ) {
          return false;
        }
      }
      if (
        patternTab === 'core' &&
        (isPromptExploderRule(rule) || isImageStudioRule(rule))
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
    exploderSubTab,
    includeDisabled,
    patternTab,
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
      if (patternTab === 'prompt_exploder') {
        if (
          exploderSubTab === 'image_studio_rules' &&
          !isImageStudioRule(rule)
        ) {
          return false;
        }
        if (
          exploderSubTab === 'prompt_exploder_rules' &&
          !isPromptExploderRule(rule)
        ) {
          return false;
        }
      }
      if (
        patternTab === 'core' &&
        (isPromptExploderRule(rule) || isImageStudioRule(rule))
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
    exploderSubTab,
    includeDisabled,
    learnedDrafts,
    patternTab,
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
            ? Math.max(0, Math.floor(draft.parsed.sequence) + DEFAULT_SEQUENCE_STEP)
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
        updates.set(uid, { ...current, ...patch });
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

  const handleAddRule = useCallback((): void => {
    const preset =
      patternTab === 'prompt_exploder'
        ? exploderSubTab === 'image_studio_rules'
          ? 'image_studio'
          : 'prompt_exploder'
        : 'core';
    const newRule = createNewRule(preset);
    setDrafts((prev: RuleDraft[]) => [createRuleDraft(newRule), ...prev]);
    setIsDirty(true);
    setSaveError(null);
  }, [exploderSubTab, patternTab]);

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

  const handleImport = useCallback(async (file: File): Promise<void> => {
    const text = await file.text();
    const result = parsePromptValidationRules(text);
    if (!result.ok) {
      toast(result.error, { variant: 'error' });
      return;
    }
    setDrafts(result.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
    setIsDirty(true);
    setSaveError(null);
    toast('Validation patterns imported. Review and save to apply.', { variant: 'success' });
  }, [toast]);

  const handleImportLearned = useCallback(async (file: File): Promise<void> => {
    const text = await file.text();
    const result = parsePromptValidationRules(text);
    if (!result.ok) {
      toast(result.error, { variant: 'error' });
      return;
    }
    setLearnedDrafts(result.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
    setLearnedDirty(true);
    setSaveError(null);
    toast('Learned patterns imported. Review and save to apply.', { variant: 'success' });
  }, [toast]);

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
      onSaved?.();
    } catch (error) {
      logClientError(error, { context: { source: 'PromptEngineContext', action: 'saveRules' } });
      toast('Failed to save rules.', { variant: 'error' });
    }
  }, [drafts, learnedDrafts, onSaved, rawSettings, toast, updateSetting]);

  const handleCopy = async (value: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copied.`, { variant: 'success' });
    } catch {
      toast('Failed to copy.', { variant: 'error' });
    }
  };

  const value = useMemo(
    () => ({
      promptEngineSettings,
      query,
      severity,
      scope,
      patternTab,
      exploderSubTab,
      includeDisabled,
      drafts,
      learnedDrafts,
      isDirty,
      learnedDirty,
      saveError,
      isLoading: settingsQuery.isLoading,
      isSaving: updateSetting.isPending,
      isUsingDefaults: !rawSettings,
      filteredDrafts,
      filteredLearnedDrafts,
      setQuery,
      setSeverity,
      setScope,
      setPatternTab,
      setExploderSubTab,
      setIncludeDisabled,
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
    }),
    [
      promptEngineSettings,
      query,
      severity,
      scope,
      patternTab,
      exploderSubTab,
      includeDisabled,
      drafts,
      learnedDrafts,
      isDirty,
      learnedDirty,
      saveError,
      settingsQuery.isLoading,
      updateSetting.isPending,
      rawSettings,
      filteredDrafts,
      filteredLearnedDrafts,
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
    ]
  );

  return <PromptEngineContext.Provider value={value}>{children}</PromptEngineContext.Provider>;
}

export function usePromptEngine(): PromptEngineContextType {
  const context = useContext(PromptEngineContext);
  if (context === undefined) {
    throw new Error('usePromptEngine must be used within a PromptEngineProvider');
  }
  return context;
}
