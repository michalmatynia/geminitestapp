import {
  asNullableNumber,
  asRecord,
  asRecordArray,
  asTrimmedString,
} from './extractNormalizeProductNameFromAiPathRunDetail.primitives';
import type {
  NormalizeDbSchemaCollectionState,
  NormalizeDbSchemaContextState,
} from './extractNormalizeProductNameFromAiPathRunDetail.types';

const resolveDbSchemaCollectionState = (
  value: unknown
): NormalizeDbSchemaCollectionState | null => {
  const record = asRecord(value);
  if (record === null) return null;

  const name = asTrimmedString(record['name']);
  if (name === null) return null;

  const documentsCount = Array.isArray(record['documents']) ? record['documents'].length : null;
  const explicitDocumentsCount = asNullableNumber(record['documentsCount']);

  return {
    name,
    documentsCount: explicitDocumentsCount ?? documentsCount,
    error: asTrimmedString(record['error']),
  };
};

const appendUniqueCollection = (
  collections: NormalizeDbSchemaCollectionState[],
  collection: NormalizeDbSchemaCollectionState | null
): void => {
  if (collection === null) return;
  if (collections.some((entry) => entry.name === collection.name)) return;
  collections.push(collection);
};

const resolveCollectionMapStates = (value: unknown): NormalizeDbSchemaCollectionState[] => {
  const collectionMap = asRecord(value);
  if (collectionMap === null) return [];
  return Object.values(collectionMap)
    .map((entry: unknown) => resolveDbSchemaCollectionState(entry))
    .filter((entry): entry is NormalizeDbSchemaCollectionState => entry !== null);
};

export const resolveNormalizeDbSchemaContextState = (
  value: unknown
): NormalizeDbSchemaContextState | null => {
  const record = asRecord(value);
  if (record === null) return null;

  const liveContext = asRecord(record['liveContext']);
  if (liveContext === null) return null;

  const collections = asRecordArray(liveContext['collections'])
    .map((entry: Record<string, unknown>) => resolveDbSchemaCollectionState(entry))
    .filter((entry): entry is NormalizeDbSchemaCollectionState => entry !== null);
  for (const collection of resolveCollectionMapStates(liveContext['collectionMap'])) {
    appendUniqueCollection(collections, collection);
  }

  const query = asTrimmedString(liveContext['query']);
  if (collections.length === 0 && query === null) return null;

  return {
    query,
    collections,
  };
};

export const resolveNormalizeDbSchemaContextFromNodes = (
  value: unknown
): NormalizeDbSchemaContextState | null => {
  if (!Array.isArray(value)) return null;

  const nodeEntries = value
    .map((entry: unknown) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);

  for (const entry of nodeEntries) {
    const outputs = asRecord(entry['outputs']);
    const resolved =
      resolveNormalizeDbSchemaContextState(outputs?.['context']) ??
      resolveNormalizeDbSchemaContextState(outputs);
    if (resolved !== null) return resolved;
  }

  return null;
};

export const resolveNormalizeDbSchemaContextFromRuntimeState = (
  value: unknown
): NormalizeDbSchemaContextState | null => {
  const runtimeState = asRecord(value);
  if (runtimeState === null) return null;

  const nodeOutputs = asRecord(runtimeState['nodeOutputs']) ?? asRecord(runtimeState['outputs']);
  if (nodeOutputs === null) return null;

  for (const entry of Object.values(nodeOutputs)) {
    const resolved = resolveNormalizeDbSchemaContextState(entry);
    if (resolved !== null) return resolved;
  }

  return null;
};
