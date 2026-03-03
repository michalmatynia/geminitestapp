'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
 
 
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { useState, useEffect, useMemo } from 'react';
import { 
  parsePromptEngineSettings, 
  defaultPromptEngineSettings,
  PromptValidationRule
} from '../../settings';
import { 
  RuleDraft, 
  createRuleDraft, 
  sortRuleDraftsBySequence 
} from '../prompt-engine-context-utils';

export function usePromptEngineDataImpl(args: {
  settingsQuery: any;
  rawSettings: any;
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
