import {
  asNullableBoolean,
  asNullableNumber,
  asRecord,
  asTrimmedString,
} from './extractNormalizeProductNameFromAiPathRunDetail.primitives';
import type {
  NormalizeProductNameCategoryContext,
  NormalizeProductNameCategoryLeaf,
} from './extractNormalizeProductNameFromAiPathRunDetail.types';

type CategoryContextValueState = Omit<NormalizeProductNameCategoryContext, 'catalogId'> & {
  catalogId: string | null;
};

const resolveNormalizeCategoryLeaf = (
  value: unknown
): NormalizeProductNameCategoryLeaf | null => {
  const record = asRecord(value);
  if (record === null) return null;

  const label = asTrimmedString(record['label']) ?? asTrimmedString(record['name']);
  if (label === null) return null;

  return {
    id: asTrimmedString(record['id']),
    label,
    fullPath: asTrimmedString(record['fullPath']),
    parentId: asTrimmedString(record['parentId']),
    isCurrent: asNullableBoolean(record['isCurrent']),
  };
};

const resolveNormalizeCategoryLeafList = (
  value: unknown
): NormalizeProductNameCategoryLeaf[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown) => resolveNormalizeCategoryLeaf(entry))
    .filter((entry): entry is NormalizeProductNameCategoryLeaf => entry !== null);
};

const resolveAllowedLeafLabels = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown) => asTrimmedString(entry))
    .filter((entry): entry is string => entry !== null);
};

const hasCategoryListContext = (state: CategoryContextValueState): boolean =>
  state.leafCategories.length > 0 || state.allowedLeafLabels.length > 0;

const hasCategoryMetadataContext = (state: CategoryContextValueState): boolean =>
  state.totalCategories !== null ||
  state.totalLeafCategories !== null ||
  state.catalogId !== null ||
  state.currentCategoryId !== null ||
  state.fetchedAt !== null;

const hasCategoryContextValue = (state: CategoryContextValueState): boolean =>
  hasCategoryListContext(state) || hasCategoryMetadataContext(state);

export const resolveNormalizeCategoryContext = (
  value: unknown
): NormalizeProductNameCategoryContext | null => {
  const record = asRecord(value);
  if (record === null) return null;

  const state: CategoryContextValueState = {
    catalogId: asTrimmedString(record['catalogId']),
    currentCategoryId: asTrimmedString(record['currentCategoryId']),
    leafCategories: resolveNormalizeCategoryLeafList(record['leafCategories']),
    allowedLeafLabels: resolveAllowedLeafLabels(record['allowedLeafLabels']),
    totalCategories: asNullableNumber(record['totalCategories']),
    totalLeafCategories: asNullableNumber(record['totalLeafCategories']),
    fetchedAt: asTrimmedString(record['fetchedAt']),
  };

  return hasCategoryContextValue(state) ? state : null;
};

export const resolveNormalizeCategoryContextFromValue = (
  value: unknown
): NormalizeProductNameCategoryContext | null => {
  const record = asRecord(value);
  if (record === null) return null;

  return (
    resolveNormalizeCategoryContext(record['categoryContext']) ??
    resolveNormalizeCategoryContext(asRecord(record['bundle'])?.['categoryContext']) ??
    resolveNormalizeCategoryContext(asRecord(record['value'])?.['categoryContext']) ??
    null
  );
};

export const resolveNormalizeCategoryContextFromNodes = (
  value: unknown
): NormalizeProductNameCategoryContext | null => {
  if (!Array.isArray(value)) return null;

  const nodeEntries = value
    .map((entry: unknown) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);

  for (const entry of nodeEntries) {
    const categoryContext = resolveNormalizeCategoryContextFromValue(entry['outputs']);
    if (categoryContext !== null) return categoryContext;
  }

  return null;
};

export const resolveNormalizeCategoryContextFromRuntimeState = (
  value: unknown
): NormalizeProductNameCategoryContext | null => {
  const runtimeState = asRecord(value);
  if (runtimeState === null) return null;

  const nodeOutputs = asRecord(runtimeState['nodeOutputs']) ?? asRecord(runtimeState['outputs']);
  if (nodeOutputs === null) return null;

  for (const entry of Object.values(nodeOutputs)) {
    const categoryContext = resolveNormalizeCategoryContextFromValue(entry);
    if (categoryContext !== null) return categoryContext;
  }

  return null;
};
