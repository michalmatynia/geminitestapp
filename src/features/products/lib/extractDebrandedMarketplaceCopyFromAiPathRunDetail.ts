type DebrandedMarketplaceCopyAiPathResult = {
  title: string | null;
  description: string | null;
};

const TITLE_KEYS = ['debrandedTitle', 'alternateTitle', 'marketplaceTitle', 'title'] as const;
const DESCRIPTION_KEYS = [
  'debrandedDescription',
  'alternateDescription',
  'marketplaceDescription',
  'description',
] as const;
const NESTED_RESULT_KEYS = ['bundle', 'result', 'value', 'payload', 'data', 'output'] as const;
const NON_RESULT_NODE_TYPES = new Set(['trigger', 'fetcher', 'parser', 'prompt', 'viewer']);

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const extractJsonCandidate = (value: string): string => {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fencedMatch?.[1]?.trim() ?? trimmed;
};

type ParsedJsonValue = {
  value: unknown;
};

const tryParseJsonValue = (value: unknown): ParsedJsonValue | null => {
  const trimmed = asTrimmedString(value);
  if (trimmed === null) return null;

  const candidate = extractJsonCandidate(trimmed);
  if (!candidate.startsWith('{') && !candidate.startsWith('[')) return null;

  try {
    return { value: JSON.parse(candidate) as unknown };
  } catch {
    return null;
  }
};

const resolveFirstString = (
  record: Record<string, unknown>,
  keys: readonly string[]
): string | null => {
  for (const key of keys) {
    const resolved = asTrimmedString(record[key]);
    if (resolved !== null) return resolved;
  }
  return null;
};

const hasMarketplaceCopyResult = (
  result: DebrandedMarketplaceCopyAiPathResult
): boolean => result.title !== null || result.description !== null;

const resolveMarketplaceCopyResultFromSetRecord = (
  setRecord: Record<string, unknown>
): DebrandedMarketplaceCopyAiPathResult => {
  const directTitle = resolveFirstString(setRecord, TITLE_KEYS);
  const directDescription = resolveFirstString(setRecord, DESCRIPTION_KEYS);
  let nestedTitle: string | null = null;
  let nestedDescription: string | null = null;

  Object.entries(setRecord).forEach(([key, entryValue]) => {
    const normalizedKey = key.trim().toLowerCase();
    if (
      nestedTitle === null &&
      normalizedKey.startsWith('marketplacecontentoverrides.') &&
      normalizedKey.endsWith('.title')
    ) {
      nestedTitle = asTrimmedString(entryValue);
    }
    if (
      nestedDescription === null &&
      normalizedKey.startsWith('marketplacecontentoverrides.') &&
      normalizedKey.endsWith('.description')
    ) {
      nestedDescription = asTrimmedString(entryValue);
    }
  });

  return {
    title: directTitle ?? nestedTitle,
    description: directDescription ?? nestedDescription,
  };
};

const resolveUpdateDocRecord = (record: Record<string, unknown>): Record<string, unknown> | null => {
  const debugPayload = asRecord(record['debugPayload']);
  const updateDoc =
    asRecord(record['updateDoc']) ??
    asRecord(debugPayload?.['updateDoc']) ??
    asRecord(record['$set']) ??
    null;
  return asRecord(updateDoc?.['$set']) ?? updateDoc;
};

const resolveMarketplaceCopyResultFromUpdateDoc = (
  value: unknown
): DebrandedMarketplaceCopyAiPathResult | null => {
  const record = asRecord(value);
  if (record === null) return null;

  const setRecord = resolveUpdateDocRecord(record);
  if (setRecord === null) return null;

  const result = resolveMarketplaceCopyResultFromSetRecord(setRecord);
  return hasMarketplaceCopyResult(result) ? result : null;
};

const resolveMarketplaceCopyDirectResult = (
  record: Record<string, unknown>
): DebrandedMarketplaceCopyAiPathResult | null => {
  const result = {
    title: resolveFirstString(record, TITLE_KEYS),
    description: resolveFirstString(record, DESCRIPTION_KEYS),
  };
  return hasMarketplaceCopyResult(result) ? result : null;
};

const resolveMarketplaceCopyResultFromArray = (
  sourceValue: unknown[],
  seen: WeakSet<object>
): DebrandedMarketplaceCopyAiPathResult | null => {
  if (seen.has(sourceValue)) return null;
  seen.add(sourceValue);
  for (let index = sourceValue.length - 1; index >= 0; index -= 1) {
    const nestedResult = resolveMarketplaceCopyResultPayload(sourceValue[index], seen);
    if (nestedResult !== null) return nestedResult;
  }
  return null;
};

const resolveNestedMarketplaceCopyResultByKeys = (
  record: Record<string, unknown>,
  seen: WeakSet<object>
): DebrandedMarketplaceCopyAiPathResult | null => {
  for (const key of NESTED_RESULT_KEYS) {
    const nestedResult = resolveMarketplaceCopyResultPayload(record[key], seen);
    if (nestedResult !== null) return nestedResult;
  }
  return null;
};

const resolveNestedMarketplaceCopyResultByValues = (
  record: Record<string, unknown>,
  seen: WeakSet<object>
): DebrandedMarketplaceCopyAiPathResult | null => {
  for (const entryValue of Object.values(record)) {
    const nestedResult = resolveMarketplaceCopyResultPayload(entryValue, seen);
    if (nestedResult !== null) return nestedResult;
  }
  return null;
};

const resolveParsedMarketplaceCopySourceValue = (value: unknown): unknown => {
  const parsedJsonValue = tryParseJsonValue(value);
  return parsedJsonValue === null ? value : parsedJsonValue.value;
};

const trackSeenRecord = (record: Record<string, unknown>, seen: WeakSet<object>): boolean => {
  if (seen.has(record)) return false;
  seen.add(record);
  return true;
};

const resolveMarketplaceCopyResultFromRecord = (
  record: Record<string, unknown>,
  seen: WeakSet<object>
): DebrandedMarketplaceCopyAiPathResult | null => {
  const directResult = resolveMarketplaceCopyDirectResult(record);
  if (directResult !== null) return directResult;

  const updateDocResult = resolveMarketplaceCopyResultFromUpdateDoc(record);
  if (updateDocResult !== null) return updateDocResult;

  const nestedKeyResult = resolveNestedMarketplaceCopyResultByKeys(record, seen);
  if (nestedKeyResult !== null) return nestedKeyResult;

  return resolveNestedMarketplaceCopyResultByValues(record, seen);
};

const resolveMarketplaceCopyResultPayload = (
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>()
): DebrandedMarketplaceCopyAiPathResult | null => {
  const sourceValue = resolveParsedMarketplaceCopySourceValue(value);

  if (Array.isArray(sourceValue)) {
    return resolveMarketplaceCopyResultFromArray(sourceValue, seen);
  }

  const record = asRecord(sourceValue);
  if (record === null) return null;
  if (!trackSeenRecord(record, seen)) return null;

  return resolveMarketplaceCopyResultFromRecord(record, seen);
};

const resolveNodeType = (nodeRecord: Record<string, unknown>): string => {
  const type = asTrimmedString(nodeRecord['type']);
  if (type !== null) return type.toLowerCase();

  const nodeType = asTrimmedString(nodeRecord['nodeType']);
  if (nodeType !== null) return nodeType.toLowerCase();

  return '';
};

const resolveMarketplaceCopyResultFromNodes = (
  nodes: unknown
): DebrandedMarketplaceCopyAiPathResult | null => {
  if (!Array.isArray(nodes)) return null;

  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const nodeRecord = asRecord(nodes[index]);
    if (nodeRecord === null) continue;
    const nodeType = resolveNodeType(nodeRecord);
    if (NON_RESULT_NODE_TYPES.has(nodeType)) continue;

    const outputs = asRecord(nodeRecord['outputs']);
    const resolved =
      resolveMarketplaceCopyResultPayload(outputs) ??
      resolveMarketplaceCopyResultPayload(nodeRecord);
    if (resolved !== null) return resolved;
  }

  return null;
};

const resolveMarketplaceCopyResultFromRuntimeState = (
  value: unknown
): DebrandedMarketplaceCopyAiPathResult | null => {
  const runtimeState = asRecord(value);
  if (runtimeState === null) return null;

  const nodeOutputs = asRecord(runtimeState['nodeOutputs']) ?? asRecord(runtimeState['outputs']);
  if (nodeOutputs === null) return null;

  const outputValues = Object.values(nodeOutputs);
  for (let index = outputValues.length - 1; index >= 0; index -= 1) {
    const resolved = resolveMarketplaceCopyResultPayload(outputValues[index]);
    if (resolved !== null) return resolved;
  }

  return null;
};

const resolveMarketplaceCopyResultFromDetailPayload = (
  detailRecord: Record<string, unknown>
): DebrandedMarketplaceCopyAiPathResult | null => {
  const directResult = resolveMarketplaceCopyDirectResult(detailRecord);
  if (directResult !== null) return directResult;

  const updateDocResult = resolveMarketplaceCopyResultFromUpdateDoc(detailRecord);
  if (updateDocResult !== null) return updateDocResult;

  for (const key of NESTED_RESULT_KEYS) {
    const nestedResult = resolveMarketplaceCopyResultPayload(detailRecord[key]);
    if (nestedResult !== null) return nestedResult;
  }

  return null;
};

export type { DebrandedMarketplaceCopyAiPathResult };

export const extractDebrandedMarketplaceCopyResultFromAiPathRunDetail = (
  detail: unknown
): DebrandedMarketplaceCopyAiPathResult | null => {
  const detailRecord = asRecord(detail);
  if (detailRecord === null) return null;

  return (
    resolveMarketplaceCopyResultFromNodes(detailRecord['nodes']) ??
    resolveMarketplaceCopyResultFromRuntimeState(asRecord(detailRecord['run'])?.['runtimeState']) ??
    resolveMarketplaceCopyResultFromDetailPayload(detailRecord)
  );
};
