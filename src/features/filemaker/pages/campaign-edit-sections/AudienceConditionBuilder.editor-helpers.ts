import type {
  FilemakerAudienceCondition,
  FilemakerAudienceConditionGroup,
  FilemakerAudienceField,
  FilemakerAudienceOperator,
} from '@/shared/contracts/filemaker';

import {
  buildDefaultAudienceConditionGroup,
  normalizeAudienceCondition,
} from '../../settings/campaign-audience-normalization.helpers';

type AudienceChild = FilemakerAudienceCondition | FilemakerAudienceConditionGroup;

export const replaceAudienceChild = (
  group: FilemakerAudienceConditionGroup,
  childId: string,
  next: AudienceChild | null
): FilemakerAudienceConditionGroup => ({
  ...group,
  children: group.children.reduce<AudienceChild[]>((accumulator, child) => {
    if (child.id === childId) {
      if (next !== null) accumulator.push(next);
      return accumulator;
    }
    if (child.type === 'group') {
      accumulator.push(replaceAudienceChild(child, childId, next));
      return accumulator;
    }
    accumulator.push(child);
    return accumulator;
  }, []),
});

export const moveAudienceChild = (
  group: FilemakerAudienceConditionGroup,
  childId: string,
  direction: -1 | 1
): FilemakerAudienceConditionGroup | null => {
  const currentIndex = group.children.findIndex((child) => child.id === childId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= group.children.length) return null;

  const children = [...group.children];
  const [child] = children.splice(currentIndex, 1);
  if (child === undefined) return null;
  children.splice(targetIndex, 0, child);
  return { ...group, children };
};

export const duplicateAudienceChildWithNewIds = (child: AudienceChild): AudienceChild => {
  if (child.type === 'condition') {
    return (
      normalizeAudienceCondition({
        field: child.field,
        operator: child.operator,
        value: child.value,
      }) ?? child
    );
  }

  return {
    ...child,
    id: buildDefaultAudienceConditionGroup().id,
    children: child.children.map(duplicateAudienceChildWithNewIds),
  };
};

export const duplicateAudienceChild = (
  group: FilemakerAudienceConditionGroup,
  childId: string
): FilemakerAudienceConditionGroup | null => {
  const currentIndex = group.children.findIndex((child) => child.id === childId);
  const child = group.children[currentIndex];
  if (currentIndex < 0 || child === undefined) return null;

  const children = [...group.children];
  children.splice(currentIndex + 1, 0, duplicateAudienceChildWithNewIds(child));
  return { ...group, children };
};

export const createAudienceCondition = (
  field: FilemakerAudienceField,
  operator: FilemakerAudienceOperator
): FilemakerAudienceCondition | null =>
  normalizeAudienceCondition({ field, operator, value: '' });
