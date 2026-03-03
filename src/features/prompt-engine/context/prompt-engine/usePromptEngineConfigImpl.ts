'use client';

import { useState, useEffect } from 'react';
import { 
  PatternCollectionTab, 
  ExploderPatternSubTab 
} from './PromptEngineConfigContext';
import { ScopeFilter } from './PromptEngineFiltersContext';

export type PromptEngineConfigImplProps = {
  resolvedLockedPatternTab?: PatternCollectionTab;
  resolvedInitialPatternTab?: PatternCollectionTab;
  resolvedLockedExploderSubTab?: ExploderPatternSubTab;
  resolvedInitialExploderSubTab?: ExploderPatternSubTab;
  resolvedLockedScope?: ScopeFilter;
  resolvedInitialScope?: ScopeFilter;
};

export function usePromptEngineConfigImpl(props: PromptEngineConfigImplProps) {
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
