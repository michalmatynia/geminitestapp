import type { ValidatorPatternList } from '@/shared/contracts/admin';
import { normalizeValidatorPatternLists } from '../validator-scope';
import { VALIDATOR_LISTS_VIEW_TABS_ID_PREFIX, type ValidatorListsView } from './types';

export const createListId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `validator-list-${crypto.randomUUID()}`;
  }
  return `validator-list-${Math.random().toString(36).slice(2, 10)}`;
};

export const canonicalizeLists = (lists: ValidatorPatternList[]): string =>
  JSON.stringify(
    normalizeValidatorPatternLists(lists).map((list: ValidatorPatternList) => ({
      id: list.id,
      name: list.name.trim(),
      description: list.description.trim(),
      scope: list.scope,
      deletionLocked: list.deletionLocked,
      patterns: list.patterns,
      isActive: list.isActive,
    }))
  );

export const getViewTriggerId = (view: ValidatorListsView): string =>
  `${VALIDATOR_LISTS_VIEW_TABS_ID_PREFIX}-trigger-${view}`;

export const getViewContentId = (view: ValidatorListsView): string =>
  `${VALIDATOR_LISTS_VIEW_TABS_ID_PREFIX}-content-${view}`;

export const toValidatorListsView = (value: string | null): ValidatorListsView =>
  value === 'tooltips' ? 'tooltips' : 'lists';

export function mergeReorderedVisible(
  allLists: ValidatorPatternList[],
  reorderedVisible: ValidatorPatternList[]
): ValidatorPatternList[] {
  if (reorderedVisible.length === allLists.length) {
    return reorderedVisible;
  }
  const visibleIds = new Set(reorderedVisible.map((l) => l.id));
  const originalSlots: number[] = [];
  allLists.forEach((l, i) => {
    if (visibleIds.has(l.id)) originalSlots.push(i);
  });
  const result = [...allLists];
  reorderedVisible.forEach((item, newIdx) => {
    const slot = originalSlots[newIdx];
    if (slot !== undefined) result[slot] = item;
  });
  return result;
}
