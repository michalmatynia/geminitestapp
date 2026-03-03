'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
 
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
 
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { useCallback } from 'react';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';
import { 
  PROMPT_ENGINE_SETTINGS_KEY, 
  parsePromptEngineSettings, 
  parsePromptValidationRules,
  PromptValidationRule
} from '../../settings';
import { 
  RuleDraft, 
  RulePatch, 
  applyRulePatch, 
  createRuleDraft, 
  getSequenceGroupId, 
  createSequenceGroupId, 
  normalizeSequenceGroupDebounceMs, 
  DEFAULT_SEQUENCE_STEP,
  sortRuleDraftsBySequence,
  createNewRule
} from '../prompt-engine-context-utils';
import { PatternCollectionTab, ExploderPatternSubTab } from './PromptEngineConfigContext';

export function usePromptEngineActionsImpl(args: {
  drafts: RuleDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<RuleDraft[]>>;
  learnedDrafts: RuleDraft[];
  setLearnedDrafts: React.Dispatch<React.SetStateAction<RuleDraft[]>>;
  setIsDirty: (val: boolean) => void;
  setLearnedDirty: (val: boolean) => void;
  setSaveError: (err: string | null) => void;
  rawSettings: any;
  settingsQuery: any;
  resolvedOnSaved?: () => void;
  activePatternTab: PatternCollectionTab;
  activeExploderSubTab: ExploderPatternSubTab;
}) {
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();

  const handleRuleTextChange = useCallback((uid: string, nextText: string): void => {
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
    args.setIsDirty(true);
    args.setSaveError(null);
  }, [args]);

  const handlePatchRule = useCallback((uid: string, patch: RulePatch): void => {
    args.setDrafts((prev: RuleDraft[]) =>
      prev.map((draft: RuleDraft) => (draft.uid === uid ? applyRulePatch(draft, patch) : draft))
    );
    args.setIsDirty(true);
    args.setSaveError(null);
  }, [args]);

  const handleToggleRuleEnabled = useCallback(
    (uid: string, enabled: boolean): void => {
      handlePatchRule(uid, { enabled });
    },
    [handlePatchRule]
  );

  const handleDuplicateRule = useCallback((uid: string): void => {
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
  }, [args]);

  const handleSequenceDrop = useCallback((draggedUid: string, targetUid: string): void => {
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
  }, [args]);

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

  const handleUngroupSequenceGroup = useCallback((groupId: string): void => {
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
  }, [args]);

  const handleLearnedRuleTextChange = useCallback((uid: string, nextText: string): void => {
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
    args.setLearnedDirty(true);
    args.setSaveError(null);
  }, [args]);

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

  const handleRemoveRule = useCallback((uid: string): void => {
    args.setDrafts((prev: RuleDraft[]) => prev.filter((draft: RuleDraft) => draft.uid !== uid));
    args.setIsDirty(true);
    args.setSaveError(null);
  }, [args]);

  const handleRemoveLearnedRule = useCallback((uid: string): void => {
    args.setLearnedDrafts((prev: RuleDraft[]) => prev.filter((draft: RuleDraft) => draft.uid !== uid));
    args.setLearnedDirty(true);
    args.setSaveError(null);
  }, [args]);

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
    const invalidJson = args.learnedDrafts.filter((draft: RuleDraft) => draft.error || !draft.parsed);
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
      } catch {
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
