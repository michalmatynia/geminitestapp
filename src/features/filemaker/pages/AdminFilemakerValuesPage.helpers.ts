import type { FilemakerValue } from '../types';
import { includeQuery } from './filemaker-page-utils';

export const buildValueSearchValues = (value: FilemakerValue): string[] => [
  value.label,
  value.value,
  value.description ?? '',
];

export const compareFilemakerValues = (
  left: FilemakerValue,
  right: FilemakerValue
): number => {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  return left.label.localeCompare(right.label);
};

const addAncestorValueIds = (
  valueById: Map<string, FilemakerValue>,
  sourceIds: Set<string>,
  includedIds: Set<string>
): void => {
  sourceIds.forEach((sourceId: string): void => {
    const visitedIds = new Set<string>();
    let parentId = valueById.get(sourceId)?.parentId ?? null;

    while (parentId !== null && valueById.has(parentId) && !visitedIds.has(parentId)) {
      includedIds.add(parentId);
      visitedIds.add(parentId);
      parentId = valueById.get(parentId)?.parentId ?? null;
    }
  });
};

const addDescendantValueIds = (
  values: FilemakerValue[],
  sourceIds: Set<string>,
  includedIds: Set<string>
): void => {
  const childIdsByParentId = new Map<string, string[]>();
  values.forEach((value: FilemakerValue): void => {
    const parentId = value.parentId ?? null;
    if (parentId === null) return;
    childIdsByParentId.set(parentId, [...(childIdsByParentId.get(parentId) ?? []), value.id]);
  });

  const pendingIds = Array.from(sourceIds);
  while (pendingIds.length > 0) {
    const parentId = pendingIds.shift() ?? '';
    const childIds = childIdsByParentId.get(parentId) ?? [];
    childIds.forEach((childId: string): void => {
      if (includedIds.has(childId)) return;
      includedIds.add(childId);
      pendingIds.push(childId);
    });
  }
};

export function filterFilemakerValuesWithHierarchy(
  values: FilemakerValue[],
  query: string
): FilemakerValue[] {
  const sortedValues = values.slice().sort(compareFilemakerValues);
  const normalizedQuery = query.trim();
  if (normalizedQuery.length === 0) return sortedValues;

  const matchingIds = new Set(
    values
      .filter((value: FilemakerValue): boolean =>
        includeQuery(buildValueSearchValues(value), normalizedQuery)
      )
      .map((value: FilemakerValue): string => value.id)
  );
  if (matchingIds.size === 0) return [];

  const includedIds = new Set(matchingIds);
  const valueById = new Map<string, FilemakerValue>(
    values.map((value: FilemakerValue) => [value.id, value])
  );
  addAncestorValueIds(valueById, matchingIds, includedIds);
  addDescendantValueIds(values, matchingIds, includedIds);

  return sortedValues.filter((value: FilemakerValue): boolean => includedIds.has(value.id));
}
