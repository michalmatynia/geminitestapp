'use client';

import { useMemo } from 'react';
import type { ValidatorPatternList } from '@/shared/contracts/admin';
import { VALIDATOR_SCOPE_DESCRIPTIONS, VALIDATOR_SCOPE_LABELS } from '../validator-scope';

export function useValidatorListsFiltering(lists: ValidatorPatternList[], query: string): {
  filteredLists: ValidatorPatternList[];
  totalLocked: number;
} {
  const filteredLists = useMemo((): ValidatorPatternList[] => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) return lists;
    return lists.filter((list: ValidatorPatternList) => {
      const scopeLabel = VALIDATOR_SCOPE_LABELS[list.scope].toLowerCase();
      const scopeDescription = VALIDATOR_SCOPE_DESCRIPTIONS[list.scope].toLowerCase();
      return (
        list.name.toLowerCase().includes(normalizedQuery) ||
        list.id.toLowerCase().includes(normalizedQuery) ||
        list.description.toLowerCase().includes(normalizedQuery) ||
        scopeLabel.includes(normalizedQuery) ||
        scopeDescription.includes(normalizedQuery)
      );
    });
  }, [lists, query]);

  const totalLocked = useMemo(
    () => lists.filter((list: ValidatorPatternList) => list.deletionLocked).length,
    [lists]
  );

  return {
    filteredLists,
    totalLocked,
  };
}
