export type AiPathsCollectionMap = Record<string, string>;

export const AI_PATHS_RUNTIME_COLLECTION_MAP_INPUT_KEY = '__aiPathsCollectionMap';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const normalizeAiPathsCollectionMap = (value: unknown): AiPathsCollectionMap => {
  const record = asRecord(value);
  if (!record) return {};

  const normalized: AiPathsCollectionMap = {};
  for (const [rawKey, rawValue] of Object.entries(record)) {
    if (typeof rawValue !== 'string') continue;
    const key = rawKey.trim();
    const mapped = rawValue.trim();
    if (!key || !mapped) continue;
    normalized[key] = mapped;
  }
  return normalized;
};

export const resolveAiPathsCollectionName = (
  requestedCollection: string,
  collectionMap?: AiPathsCollectionMap | null
): { collection: string; mappedFrom?: string } => {
  const requested = typeof requestedCollection === 'string' ? requestedCollection.trim() : '';
  if (!requested) return { collection: requested };

  const map = collectionMap ?? {};
  const directMatch = map[requested];
  if (typeof directMatch === 'string' && directMatch.trim()) {
    return {
      collection: directMatch.trim(),
      mappedFrom: requested,
    };
  }

  const requestedLower = requested.toLowerCase();
  const caseInsensitiveKey = Object.keys(map).find(
    (key: string) => key.toLowerCase() === requestedLower
  );
  if (caseInsensitiveKey) {
    const mapped = map[caseInsensitiveKey];
    if (typeof mapped === 'string' && mapped.trim()) {
      return {
        collection: mapped.trim(),
        mappedFrom: caseInsensitiveKey,
      };
    }
  }

  return { collection: requested };
};

export const extractAiPathsCollectionMapFromRunMeta = (
  runMeta: unknown
): AiPathsCollectionMap | undefined => {
  const metaRecord = asRecord(runMeta);
  if (!metaRecord) return undefined;
  const validationRecord = asRecord(metaRecord['aiPathsValidation']);
  if (!validationRecord) return undefined;
  const map = normalizeAiPathsCollectionMap(validationRecord['collectionMap']);
  return Object.keys(map).length > 0 ? map : undefined;
};

export const withAiPathsCollectionMapInput = (
  inputs: Record<string, unknown>,
  collectionMap?: AiPathsCollectionMap | null
): Record<string, unknown> => {
  if (!collectionMap || Object.keys(collectionMap).length === 0) {
    return inputs;
  }
  return {
    ...inputs,
    [AI_PATHS_RUNTIME_COLLECTION_MAP_INPUT_KEY]: collectionMap,
  };
};

export const getAiPathsCollectionMapFromInputs = (
  inputs: Record<string, unknown> | null | undefined
): AiPathsCollectionMap | undefined => {
  if (!inputs) return undefined;
  const map = normalizeAiPathsCollectionMap(inputs[AI_PATHS_RUNTIME_COLLECTION_MAP_INPUT_KEY]);
  return Object.keys(map).length > 0 ? map : undefined;
};
