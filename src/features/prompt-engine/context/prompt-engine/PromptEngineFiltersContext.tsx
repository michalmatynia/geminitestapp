'use client';

import { createContext, useContext } from 'react';
import type {
  PromptValidationSeverity,
  PromptValidationScope,
} from '@/shared/lib/prompt-engine/settings';

export type SeverityFilter = PromptValidationSeverity | 'all';
export type ScopeFilter = PromptValidationScope | 'all';

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

export const FiltersContext = createContext<PromptEngineFilters | null>(null);

export const usePromptEngineFilters = () => {
  const context = useContext(FiltersContext);
  if (!context) throw new Error('usePromptEngineFilters must be used within PromptEngineProvider');
  return context;
};
