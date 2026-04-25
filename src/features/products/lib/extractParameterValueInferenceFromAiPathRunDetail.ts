export type ParameterValueInferenceAiPathResult = {
  parameterId: string | null;
  value: string;
  confidence: number | null;
};

const VALUE_KEYS = ['value', 'inferredValue', 'parameterValue', 'answer'] as const;
const PARAMETER_ID_KEYS = ['parameterId', 'targetParameterId', 'id'] as const;
const NESTED_RESULT_KEYS = ['bundle', 'result', 'value', 'payload', 'data', 'output'] as const;
const PREFERRED_RESULT_KEYS = [
  'value',
  'result',
  'extracted',
  'payload',
  'data',
  'output',
  'bundle',
] as const;
const NON_RESULT_NODE_TYPES = new Set(['trigger', 'fetcher', 'parser', 'prompt', 'viewer']);
const RUNTIME_CONTEXT_OUTPUT_KEYS = new Set([
  'context',
  'entityJson',
  'entityId',
  'entityType',
  'prompt',
  'trigger',
  'triggerName',
]);

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  return value.trim();
};

const asNonEmptyString = (value: unknown): string | null => {
  const normalized = asString(value);
  return normalized !== null && normalized.length > 0 ? normalized : null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const extractJsonCandidate = (value: string): string => {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fencedMatch?.[1]?.trim() ?? trimmed;
};

const tryParseJsonValue = (value: unknown): Record<string, unknown> | unknown[] | null => {
  const trimmed = asNonEmptyString(value);
  if (trimmed === null) return null;

  const candidate = extractJsonCandidate(trimmed);
  if (!candidate.startsWith('{') && !candidate.startsWith('[')) return null;

  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (Array.isArray(parsed)) return parsed.map((entry: unknown) => entry);
    return asRecord(parsed);
  } catch {
    return null;
  }
};

const resolveStringByKeys = (
  record: Record<string, unknown>,
  keys: readonly string[],
  options: { allowEmpty: boolean }
): string | null => {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const resolved = asString(record[key]);
    if (resolved === null) continue;
    if (options.allowEmpty || resolved.length > 0) return resolved;
  }
  return null;
};

const resolveParameterValueResultFromArray = (
  value: unknown[],
  seen: WeakSet<object>
): ParameterValueInferenceAiPathResult | null => {
  if (seen.has(value)) return null;
  seen.add(value);
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const nestedResult = resolveParameterValueResultPayload(value[index], seen);
    if (nestedResult !== null) return nestedResult;
  }
  return null;
};

const resolveNestedParameterValueResult = (
  record: Record<string, unknown>,
  keys: readonly string[],
  seen: WeakSet<object>
): ParameterValueInferenceAiPathResult | null => {
  for (const key of keys) {
    const nestedResult = resolveParameterValueResultPayload(record[key], seen);
    if (nestedResult !== null) return nestedResult;
  }
  return null;
};

const resolveDirectParameterValueResult = (
  record: Record<string, unknown>
): ParameterValueInferenceAiPathResult | null => {
  const inferredValue = resolveStringByKeys(record, VALUE_KEYS, { allowEmpty: true });
  if (inferredValue === null) return null;

  return {
    parameterId: resolveStringByKeys(record, PARAMETER_ID_KEYS, { allowEmpty: false }),
    value: inferredValue,
    confidence: asNumber(record['confidence']),
  };
};

const hasAnyOwnKey = (record: Record<string, unknown>, keys: Iterable<string>): boolean => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return true;
  }
  return false;
};

const resolvePreferredParameterValueResult = (
  record: Record<string, unknown>
): ParameterValueInferenceAiPathResult | null =>
  resolveDirectParameterValueResult(record) ??
  resolveNestedParameterValueResult(record, PREFERRED_RESULT_KEYS, new WeakSet<object>());

const resolveParameterValueResultFromRecord = (
  record: Record<string, unknown>,
  seen: WeakSet<object>
): ParameterValueInferenceAiPathResult | null => {
  if (seen.has(record)) return null;
  seen.add(record);

  const directResult = resolveDirectParameterValueResult(record);
  if (directResult !== null) return directResult;

  const nestedKeyResult = resolveNestedParameterValueResult(record, NESTED_RESULT_KEYS, seen);
  if (nestedKeyResult !== null) return nestedKeyResult;

  return resolveNestedParameterValueResult(record, Object.keys(record), seen);
};

const resolveParameterValueResultPayload = (
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>()
): ParameterValueInferenceAiPathResult | null => {
  const parsedJsonValue = tryParseJsonValue(value);
  const sourceValue = parsedJsonValue ?? value;

  if (Array.isArray(sourceValue)) {
    return resolveParameterValueResultFromArray(sourceValue, seen);
  }

  const record = asRecord(sourceValue);
  return record === null ? null : resolveParameterValueResultFromRecord(record, seen);
};

const resolveNodeType = (nodeRecord: Record<string, unknown>): string => {
  const typeValue = nodeRecord['type'];
  if (typeof typeValue === 'string') return typeValue.trim().toLowerCase();
  const nodeTypeValue = nodeRecord['nodeType'];
  return typeof nodeTypeValue === 'string' ? nodeTypeValue.trim().toLowerCase() : '';
};

const resolveParameterValueResultFromNodeRecord = (
  nodeRecord: Record<string, unknown>
): ParameterValueInferenceAiPathResult | null => {
  const nodeType = resolveNodeType(nodeRecord);
  if (NON_RESULT_NODE_TYPES.has(nodeType)) return null;

  const outputs = asRecord(nodeRecord['outputs']);
  return (
    (outputs ? resolvePreferredParameterValueResult(outputs) : null) ??
    resolveParameterValueResultPayload(outputs) ??
    resolvePreferredParameterValueResult(nodeRecord) ??
    resolveParameterValueResultPayload(nodeRecord)
  );
};

const resolveParameterValueResultFromNodes = (
  nodes: unknown
): ParameterValueInferenceAiPathResult | null => {
  if (!Array.isArray(nodes)) return null;

  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const nodeRecord = asRecord(nodes[index]);
    if (nodeRecord === null) continue;

    const resolved = resolveParameterValueResultFromNodeRecord(nodeRecord);
    if (resolved !== null) return resolved;
  }

  return null;
};

const resolveParameterValueResultFromRuntimeOutput = (
  output: unknown
): ParameterValueInferenceAiPathResult | null => {
  const outputRecord = asRecord(output);
  const isContextOutput =
    outputRecord !== null && hasAnyOwnKey(outputRecord, RUNTIME_CONTEXT_OUTPUT_KEYS);
  if (isContextOutput) return null;

  return (
    (outputRecord ? resolvePreferredParameterValueResult(outputRecord) : null) ??
    resolveParameterValueResultPayload(output)
  );
};

const resolveParameterValueResultFromRuntimeState = (
  value: unknown
): ParameterValueInferenceAiPathResult | null => {
  const runtimeState = asRecord(value);
  if (!runtimeState) return null;

  const nodeOutputs = asRecord(runtimeState['nodeOutputs']) ?? asRecord(runtimeState['outputs']);
  if (!nodeOutputs) return null;

  const outputValues = Object.values(nodeOutputs);
  for (let index = outputValues.length - 1; index >= 0; index -= 1) {
    const resolved = resolveParameterValueResultFromRuntimeOutput(outputValues[index]);
    if (resolved !== null) return resolved;
  }

  return null;
};

const resolveParameterValueResultFromDetailPayload = (
  detailRecord: Record<string, unknown>
): ParameterValueInferenceAiPathResult | null =>
  resolvePreferredParameterValueResult(detailRecord);

export const extractParameterValueInferenceResultFromAiPathRunDetail = (
  detail: unknown
): ParameterValueInferenceAiPathResult | null => {
  const detailRecord = asRecord(detail);
  if (!detailRecord) return null;

  return (
    resolveParameterValueResultFromNodes(detailRecord['nodes']) ??
    resolveParameterValueResultFromRuntimeState(asRecord(detailRecord['run'])?.['runtimeState']) ??
    resolveParameterValueResultFromDetailPayload(detailRecord)
  );
};
