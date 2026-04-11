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
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
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

const tryParseJsonValue = (value: unknown): unknown | null => {
  const trimmed = asTrimmedString(value);
  if (!trimmed) return null;

  const candidate = extractJsonCandidate(trimmed);
  if (!candidate.startsWith('{') && !candidate.startsWith('[')) return null;

  try {
    return JSON.parse(candidate) as unknown;
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
    if (resolved) return resolved;
  }
  return null;
};

const resolveMarketplaceCopyResultFromUpdateDoc = (
  value: unknown
): DebrandedMarketplaceCopyAiPathResult | null => {
  const record = asRecord(value);
  if (!record) return null;

  const debugPayload = asRecord(record['debugPayload']);
  const updateDoc =
    asRecord(record['updateDoc']) ??
    asRecord(debugPayload?.['updateDoc']) ??
    asRecord(record['$set']) ??
    null;
  const setRecord = asRecord(updateDoc?.['$set']) ?? updateDoc;
  if (!setRecord) return null;

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

  const title = directTitle ?? nestedTitle;
  const description = directDescription ?? nestedDescription;
  return title || description ? { title, description } : null;
};

const resolveMarketplaceCopyResultPayload = (
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>()
): DebrandedMarketplaceCopyAiPathResult | null => {
  const parsedJsonValue = tryParseJsonValue(value);
  const sourceValue = parsedJsonValue ?? value;

  if (Array.isArray(sourceValue)) {
    if (seen.has(sourceValue)) return null;
    seen.add(sourceValue);
    for (let index = sourceValue.length - 1; index >= 0; index -= 1) {
      const nestedResult = resolveMarketplaceCopyResultPayload(sourceValue[index], seen);
      if (nestedResult) return nestedResult;
    }
    return null;
  }

  const record = asRecord(sourceValue);
  if (!record) return null;
  if (seen.has(record)) return null;
  seen.add(record);

  const title = resolveFirstString(record, TITLE_KEYS);
  const description = resolveFirstString(record, DESCRIPTION_KEYS);
  if (title || description) {
    return {
      title,
      description,
    };
  }

  const updateDocResult = resolveMarketplaceCopyResultFromUpdateDoc(record);
  if (updateDocResult) return updateDocResult;

  for (const key of NESTED_RESULT_KEYS) {
    const nestedResult = resolveMarketplaceCopyResultPayload(record[key], seen);
    if (nestedResult) return nestedResult;
  }

  for (const entryValue of Object.values(record)) {
    const nestedResult = resolveMarketplaceCopyResultPayload(entryValue, seen);
    if (nestedResult) return nestedResult;
  }

  return null;
};

const resolveMarketplaceCopyResultFromNodes = (
  nodes: unknown
): DebrandedMarketplaceCopyAiPathResult | null => {
  if (!Array.isArray(nodes)) return null;

  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const nodeRecord = asRecord(nodes[index]);
    if (!nodeRecord) continue;
    const nodeType =
      typeof nodeRecord['type'] === 'string'
        ? nodeRecord['type'].trim().toLowerCase()
        : typeof nodeRecord['nodeType'] === 'string'
          ? nodeRecord['nodeType'].trim().toLowerCase()
          : '';
    if (NON_RESULT_NODE_TYPES.has(nodeType)) continue;

    const outputs = asRecord(nodeRecord['outputs']);
    const resolved =
      resolveMarketplaceCopyResultPayload(outputs) ??
      resolveMarketplaceCopyResultPayload(nodeRecord);
    if (resolved) return resolved;
  }

  return null;
};

const resolveMarketplaceCopyResultFromRuntimeState = (
  value: unknown
): DebrandedMarketplaceCopyAiPathResult | null => {
  const runtimeState = asRecord(value);
  if (!runtimeState) return null;

  const nodeOutputs = asRecord(runtimeState['nodeOutputs']) ?? asRecord(runtimeState['outputs']);
  if (!nodeOutputs) return null;

  const outputValues = Object.values(nodeOutputs);
  for (let index = outputValues.length - 1; index >= 0; index -= 1) {
    const resolved = resolveMarketplaceCopyResultPayload(outputValues[index]);
    if (resolved) return resolved;
  }

  return null;
};

const resolveMarketplaceCopyResultFromDetailPayload = (
  detailRecord: Record<string, unknown>
): DebrandedMarketplaceCopyAiPathResult | null => {
  const title = resolveFirstString(detailRecord, TITLE_KEYS);
  const description = resolveFirstString(detailRecord, DESCRIPTION_KEYS);
  if (title || description) return { title, description };

  const updateDocResult = resolveMarketplaceCopyResultFromUpdateDoc(detailRecord);
  if (updateDocResult) return updateDocResult;

  for (const key of NESTED_RESULT_KEYS) {
    const nestedResult = resolveMarketplaceCopyResultPayload(detailRecord[key]);
    if (nestedResult) return nestedResult;
  }

  return null;
};

export type { DebrandedMarketplaceCopyAiPathResult };

export const extractDebrandedMarketplaceCopyResultFromAiPathRunDetail = (
  detail: unknown
): DebrandedMarketplaceCopyAiPathResult | null => {
  const detailRecord = asRecord(detail);
  if (!detailRecord) return null;

  return (
    resolveMarketplaceCopyResultFromNodes(detailRecord['nodes']) ??
    resolveMarketplaceCopyResultFromRuntimeState(asRecord(detailRecord['run'])?.['runtimeState']) ??
    resolveMarketplaceCopyResultFromDetailPayload(detailRecord)
  );
};
