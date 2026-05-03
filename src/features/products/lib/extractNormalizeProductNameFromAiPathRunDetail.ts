import {
  resolveNormalizeCategoryContextFromNodes,
  resolveNormalizeCategoryContextFromRuntimeState,
  resolveNormalizeCategoryContextFromValue,
} from './extractNormalizeProductNameFromAiPathRunDetail.category-context';
import {
  resolveNormalizeDbSchemaContextFromNodes,
  resolveNormalizeDbSchemaContextFromRuntimeState,
} from './extractNormalizeProductNameFromAiPathRunDetail.db-schema-context';
import {
  asNullableBoolean,
  asNullableNumber,
  asRecord,
  asTrimmedString,
} from './extractNormalizeProductNameFromAiPathRunDetail.primitives';
import type {
  NormalizeDbSchemaCollectionState,
  NormalizeDbSchemaContextState,
  NormalizeProductNameAiPathResult,
  NormalizeProductNameCategoryContext,
} from './extractNormalizeProductNameFromAiPathRunDetail.types';

export type {
  NormalizeDbSchemaCollectionState,
  NormalizeDbSchemaContextState,
  NormalizeProductNameAiPathResult,
  NormalizeProductNameCategoryContext,
  NormalizeProductNameCategoryLeaf,
} from './extractNormalizeProductNameFromAiPathRunDetail.types';

const NORMALIZE_PRODUCT_NAME_PATH_ID = 'path_name_normalize_v1';

type NormalizeCategoryUnavailableArgs = {
  validationError: string | null;
  categoryContext: NormalizeProductNameCategoryContext | null;
  dbSchemaContext: NormalizeDbSchemaContextState | null;
};

const isCategoryContextUnavailableError = (validationError: string | null): boolean =>
  validationError?.trim().toLowerCase() === 'category context unavailable';

const resolveProductCategoriesCollection = (
  dbSchemaContext: NormalizeDbSchemaContextState | null
): NormalizeDbSchemaCollectionState | null =>
  dbSchemaContext?.collections.find((entry) => entry.name === 'product_categories') ?? null;

const hasCategoryCollectionError = (collectionError: string | null): collectionError is string =>
  collectionError !== null;

const resolveCategoryCollectionErrorMessage = (
  collection: NormalizeDbSchemaCollectionState | null
): string | null => {
  if (hasCategoryCollectionError(collection?.error ?? null)) {
    return `Category context unavailable: ${collection.error}`;
  }
  return null;
};

const resolveEmptyCategoryCollectionMessage = (
  categoryContext: NormalizeProductNameCategoryContext | null
): string => {
  const catalogId = categoryContext?.catalogId ?? null;
  if (catalogId !== null) {
    return `Category context unavailable: no product_categories rows matched catalog "${catalogId}".`;
  }
  return 'Category context unavailable: no product_categories rows were returned.';
};

const normalizeCategoryUnavailableValidationError = (
  args: NormalizeCategoryUnavailableArgs
): string | null => {
  if (!isCategoryContextUnavailableError(args.validationError)) return args.validationError;

  const collection = resolveProductCategoriesCollection(args.dbSchemaContext);
  const collectionErrorMessage = resolveCategoryCollectionErrorMessage(collection);
  if (collectionErrorMessage !== null) return collectionErrorMessage;
  if (collection?.documentsCount !== 0) return args.validationError;
  return resolveEmptyCategoryCollectionMessage(args.categoryContext);
};

const resolveNameFromUpdateDoc = (value: unknown): string | null => {
  const updateDoc = asRecord(value);
  if (updateDoc === null) return null;
  const setDoc = asRecord(updateDoc['$set']);
  if (setDoc === null) return null;
  return asTrimmedString(setDoc['name_en']);
};

const resolveNormalizePayloadCandidates = (
  record: Record<string, unknown>
): Record<string, unknown>[] => {
  const debugPayload = asRecord(record['debugPayload']);
  const candidates = [
    debugPayload === null ? null : asRecord(debugPayload['updateDoc']),
    asRecord(record['bundle']),
    asRecord(record['value']),
    record,
  ];
  return candidates.filter((candidate): candidate is Record<string, unknown> => candidate !== null);
};

const hasTextPayloadSignal = (payload: NormalizeProductNameAiPathResult): boolean =>
  [
    payload.normalizedName,
    payload.title,
    payload.size,
    payload.material,
    payload.category,
    payload.theme,
    payload.validationError,
  ].some((value) => value !== null);

const hasNormalizePayloadSignal = (payload: NormalizeProductNameAiPathResult): boolean =>
  hasTextPayloadSignal(payload) || payload.isValid !== null || payload.confidence !== null;

const resolveCandidateNormalizePayload = (
  candidate: Record<string, unknown>
): NormalizeProductNameAiPathResult | null => {
  const payload: NormalizeProductNameAiPathResult = {
    normalizedName:
      resolveNameFromUpdateDoc(candidate) ??
      asTrimmedString(candidate['normalizedName']) ??
      asTrimmedString(candidate['result']),
    title: asTrimmedString(candidate['title']),
    size: asTrimmedString(candidate['size']),
    material: asTrimmedString(candidate['material']),
    category: asTrimmedString(candidate['category']),
    theme: asTrimmedString(candidate['theme']),
    validationError: asTrimmedString(candidate['validationError']),
    isValid: asNullableBoolean(candidate['isValid']),
    confidence: asNullableNumber(candidate['confidence']),
  };

  return hasNormalizePayloadSignal(payload) ? payload : null;
};

const resolveNormalizePayload = (value: unknown): NormalizeProductNameAiPathResult | null => {
  const record = asRecord(value);
  if (record === null) return null;

  for (const candidate of resolveNormalizePayloadCandidates(record)) {
    const payload = resolveCandidateNormalizePayload(candidate);
    if (payload !== null) return payload;
  }

  return null;
};

const resolveNodeEntries = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
};

const filterNodeEntriesByType = (
  nodeEntries: Array<Record<string, unknown>>,
  nodeType: string
): Array<Record<string, unknown>> => nodeEntries.filter((entry) => entry['nodeType'] === nodeType);

const resolveOrderedNormalizePayloadNodeEntries = (
  nodeEntries: Array<Record<string, unknown>>
): Array<Record<string, unknown>> => [
  ...filterNodeEntriesByType(nodeEntries, 'database'),
  ...filterNodeEntriesByType(nodeEntries, 'mapper'),
  ...filterNodeEntriesByType(nodeEntries, 'regex'),
  ...nodeEntries,
];

const resolveNormalizePayloadFromNodes = (
  value: unknown
): NormalizeProductNameAiPathResult | null => {
  for (const entry of resolveOrderedNormalizePayloadNodeEntries(resolveNodeEntries(value))) {
    const payload = resolveNormalizePayload(asRecord(entry['outputs']));
    if (payload !== null) return payload;
  }

  return null;
};

const resolveNormalizePayloadFromRuntimeState = (
  value: unknown
): NormalizeProductNameAiPathResult | null => {
  const runtimeState = asRecord(value);
  if (runtimeState === null) return null;

  const nodeOutputs = asRecord(runtimeState['nodeOutputs']) ?? asRecord(runtimeState['outputs']);
  if (nodeOutputs === null) return null;

  for (const entry of Object.values(nodeOutputs)) {
    const payload = resolveNormalizePayload(entry);
    if (payload !== null) return payload;
  }

  return null;
};

const resolveRunRecord = (record: Record<string, unknown>): Record<string, unknown> | null =>
  asRecord(record['run']);

const resolveRunRuntimeState = (record: Record<string, unknown>): unknown =>
  resolveRunRecord(record)?.['runtimeState'];

const resolveRunResult = (record: Record<string, unknown>): unknown =>
  resolveRunRecord(record)?.['result'];

const resolveNormalizePayloadFromDetailRecord = (
  record: Record<string, unknown>
): NormalizeProductNameAiPathResult | null =>
  resolveNormalizePayloadFromNodes(record['nodes']) ??
  resolveNormalizePayloadFromRuntimeState(resolveRunRuntimeState(record)) ??
  resolveNormalizePayload(resolveRunResult(record)) ??
  null;

const resolveCategoryContextFromDetailRecord = (
  record: Record<string, unknown>
): NormalizeProductNameCategoryContext | null =>
  resolveNormalizeCategoryContextFromNodes(record['nodes']) ??
  resolveNormalizeCategoryContextFromRuntimeState(resolveRunRuntimeState(record)) ??
  resolveNormalizeCategoryContextFromValue(resolveRunResult(record)) ??
  null;

const resolveDbSchemaContextFromDetailRecord = (
  record: Record<string, unknown>
): NormalizeDbSchemaContextState | null =>
  resolveNormalizeDbSchemaContextFromNodes(record['nodes']) ??
  resolveNormalizeDbSchemaContextFromRuntimeState(resolveRunRuntimeState(record)) ??
  null;

export const isNormalizeProductNamePath = (pathId: unknown): boolean =>
  asTrimmedString(pathId) === NORMALIZE_PRODUCT_NAME_PATH_ID;

export const extractNormalizeProductNameResultFromAiPathRunDetail = (
  detail: unknown
): NormalizeProductNameAiPathResult | null => {
  const record = asRecord(detail);
  if (record === null) return null;

  const payload = resolveNormalizePayloadFromDetailRecord(record);
  if (payload === null) return null;

  const categoryContext = resolveCategoryContextFromDetailRecord(record);
  const validationError = normalizeCategoryUnavailableValidationError({
    validationError: payload.validationError,
    categoryContext,
    dbSchemaContext: resolveDbSchemaContextFromDetailRecord(record),
  });
  const enrichedPayload = {
    ...payload,
    validationError,
  };

  return categoryContext !== null ? { ...enrichedPayload, categoryContext } : enrichedPayload;
};

export const extractNormalizeProductNameFromAiPathRunDetail = (detail: unknown): string | null =>
  extractNormalizeProductNameResultFromAiPathRunDetail(detail)?.normalizedName ?? null;
