'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

import { logClientError } from '@/features/observability';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
  parsePromptValidationRules,
  defaultPromptEngineSettings,
  type PromptValidationRule,
  type PromptValidationSeverity,
  type PromptEngineSettings,
  type PromptAutofixOperation,
} from '../settings';

export type SeverityFilter = PromptValidationSeverity | 'all';

export type RuleDraft = {
  uid: string;
  text: string;
  parsed: PromptValidationRule | null;
  error: string | null;
};

interface PromptEngineContextType {
  // State
  promptEngineSettings: PromptEngineSettings;
  query: string;
  severity: SeverityFilter;
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
  
  // Actions
  setQuery: (query: string) => void;
  setSeverity: (severity: SeverityFilter) => void;
  setIncludeDisabled: (include: boolean) => void;
  handleRuleTextChange: (uid: string, nextText: string) => void;
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

const createNewRule = (): PromptValidationRule => ({
  kind: 'regex',
  id: `custom.rule.${Date.now()}`,
  enabled: true,
  severity: 'warning',
  title: 'New validation rule',
  description: null,
  pattern: '^$',
  flags: 'mi',
  message: 'Update this rule with the intended pattern and message.',
  similar: [],
  autofix: { enabled: true, operations: [] },
});

const ruleSearchText = (rule: PromptValidationRule): string => {
  const parts: string[] = [
    rule.id,
    rule.kind,
    rule.severity,
    rule.title,
    rule.message,
    rule.description ?? '',
  ];
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

const SEVERITY_ORDER: Record<PromptValidationSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
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

  const sortedDrafts = useMemo((): RuleDraft[] => {
    const list = [...drafts];
    list.sort((a: RuleDraft, b: RuleDraft): number => {
      if (!a.parsed && !b.parsed) return 0;
      if (!a.parsed) return 1;
      if (!b.parsed) return -1;
      const severityCompare = (SEVERITY_ORDER[a.parsed.severity] ?? 99) - (SEVERITY_ORDER[b.parsed.severity] ?? 99);
      if (severityCompare !== 0) return severityCompare;
      return a.parsed.title.localeCompare(b.parsed.title);
    });
    return list;
  }, [drafts]);

  const filteredDrafts = useMemo((): RuleDraft[] => {
    const term = query.trim().toLowerCase();
    return sortedDrafts.filter((draft: RuleDraft): boolean => {
      const rule = draft.parsed;
      if (!rule) {
        if (severity !== 'all') return false;
        if (!term) return true;
        return draft.text.toLowerCase().includes(term);
      }
      if (!includeDisabled && !rule.enabled) return false;
      if (severity !== 'all' && rule.severity !== severity) return false;
      if (!term) return true;
      return ruleSearchText(rule).includes(term);
    });
  }, [includeDisabled, query, severity, sortedDrafts]);

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
    const newRule = createNewRule();
    setDrafts((prev: RuleDraft[]) => [createRuleDraft(newRule), ...prev]);
    setIsDirty(true);
    setSaveError(null);
  }, []);

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
      setQuery,
      setSeverity,
      setIncludeDisabled,
      handleRuleTextChange,
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
      includeDisabled,
      drafts,
      learnedDrafts,
      isDirty,
      learnedDirty,
      saveError,
      settingsQuery.isLoading,
      updateSetting.isPending,
      filteredDrafts,
      handleRuleTextChange,
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
