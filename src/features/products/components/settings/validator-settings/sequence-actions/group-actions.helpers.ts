import type { ProductValidationPattern } from '@/shared/contracts/products/validation';

import {
  DEFAULT_SEQUENCE_STEP,
  getPatternSequence,
  getSequenceGroupId,
  normalizeSequenceGroupDebounceMs,
  sortRuleDraftsBySequence,
} from '../helpers';

import type { UpdatePatternMutation } from './types';

export const normalizeSequenceGroupLabel = (label: string): string => {
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : 'Sequence / Group';
};

export const normalizeSequenceGroupDraftDebounceMs = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return normalizeSequenceGroupDebounceMs(Number.isNaN(parsed) ? 0 : parsed);
};

export const persistPatternSequences = (
  patterns: ProductValidationPattern[],
  updatePattern: UpdatePatternMutation
): Promise<unknown[]> =>
  Promise.all(
    patterns.map((pattern, index) => {
      const nextSequence = (index + 1) * DEFAULT_SEQUENCE_STEP;
      if (getPatternSequence(pattern, index) === nextSequence) return Promise.resolve();
      return updatePattern.mutateAsync({
        id: pattern.id,
        data: { sequence: nextSequence },
      });
    })
  );

const moveArrayItem = <TItem>(
  items: TItem[],
  fromIndex: number,
  targetIndex: number
): TItem[] | null => {
  const moved = items[fromIndex];
  if (moved === undefined) return null;

  const result = [...items];
  result.splice(fromIndex, 1);
  result.splice(Math.max(0, Math.min(targetIndex, result.length)), 0, moved);
  return result;
};

const replaceGroupMembersInOrder = (
  ordered: ProductValidationPattern[],
  groupId: string,
  nextGroupMembers: ProductValidationPattern[]
): ProductValidationPattern[] => {
  let groupWriteIndex = 0;
  return ordered.map((pattern) => {
    if (getSequenceGroupId(pattern) !== groupId) return pattern;
    const nextPattern = nextGroupMembers[groupWriteIndex];
    groupWriteIndex += 1;
    return nextPattern ?? pattern;
  });
};

export const buildReorderedGroupResult = (
  patterns: ProductValidationPattern[],
  patternId: string,
  targetIndex: number
): ProductValidationPattern[] | null => {
  const pattern = patterns.find((candidate) => candidate.id === patternId);
  if (pattern === undefined) return null;

  const groupId = getSequenceGroupId(pattern);
  if (groupId === null) return null;

  const ordered = sortRuleDraftsBySequence(patterns);
  const groupMembers = ordered.filter((candidate) => getSequenceGroupId(candidate) === groupId);
  const movedIndex = groupMembers.findIndex((candidate) => candidate.id === patternId);
  if (movedIndex < 0) return null;

  const nextGroupMembers = moveArrayItem(groupMembers, movedIndex, targetIndex);
  return nextGroupMembers === null
    ? null
    : replaceGroupMembersInOrder(ordered, groupId, nextGroupMembers);
};
