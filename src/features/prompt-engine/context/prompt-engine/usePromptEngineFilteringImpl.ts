'use client';

import { useState, useMemo } from 'react';
import { SeverityFilter, ScopeFilter } from './PromptEngineFiltersContext';
import {
  RuleDraft,
  isImageStudioRule,
  isCaseResolverPromptExploderRule,
  isPromptExploderRule,
  ruleSearchText,
} from '../prompt-engine-context-utils';
import { PatternCollectionTab, ExploderPatternSubTab } from './PromptEngineConfigContext';
import { DEFAULT_PROMPT_VALIDATION_SCOPES } from '../../settings';

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
