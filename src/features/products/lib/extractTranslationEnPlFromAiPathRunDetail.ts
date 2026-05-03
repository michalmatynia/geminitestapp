type TranslationParameterUpdate = {
  parameterId: string;
  value: string;
};

type TranslationEnPlAiPathResult = {
  descriptionPl: string | null;
  parameterTranslations: TranslationParameterUpdate[];
};

const NESTED_RESULT_KEYS = [
  'bundle',
  'result',
  'value',
  'payload',
  'data',
  'output',
  'outputs',
  'debugPayload',
] as const;
const NON_RESULT_NODE_TYPES = new Set(['trigger', 'fetcher', 'parser', 'prompt', 'viewer', 'context']);

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

const normalizeParameterId = (value: unknown): string | null => {
  const direct = asTrimmedString(value);
  return direct;
};

const resolveParameterTranslationValue = (record: Record<string, unknown>): string | null => {
  const valuesByLanguage = asRecord(record['valuesByLanguage']);
  const polishValue = asTrimmedString(valuesByLanguage?.['pl']);
  if (polishValue !== null) return polishValue;
  return asTrimmedString(record['value']);
};

const normalizeParameterTranslations = (value: unknown): TranslationParameterUpdate[] => {
  if (!Array.isArray(value)) return [];

  const updatesById = new Map<string, TranslationParameterUpdate>();
  value.forEach((entry: unknown) => {
    const record = asRecord(entry);
    if (record === null) return;
    const parameterId =
      normalizeParameterId(record['parameterId']) ??
      normalizeParameterId(record['id']) ??
      normalizeParameterId(record['_id']);
    const translatedValue = resolveParameterTranslationValue(record);
    if (parameterId === null || translatedValue === null) return;
    updatesById.set(parameterId, {
      parameterId,
      value: translatedValue,
    });
  });

  return Array.from(updatesById.values());
};

const mergeTranslationResults = (
  base: TranslationEnPlAiPathResult | null,
  next: TranslationEnPlAiPathResult | null
): TranslationEnPlAiPathResult | null => {
  if (base === null) return next;
  if (next === null) return base;

  const parameterUpdatesById = new Map<string, TranslationParameterUpdate>();
  base.parameterTranslations.forEach((entry) => {
    parameterUpdatesById.set(entry.parameterId, entry);
  });
  next.parameterTranslations.forEach((entry) => {
    parameterUpdatesById.set(entry.parameterId, entry);
  });

  return {
    descriptionPl: next.descriptionPl ?? base.descriptionPl,
    parameterTranslations: Array.from(parameterUpdatesById.values()),
  };
};

const hasTranslationResult = (result: TranslationEnPlAiPathResult): boolean =>
  result.descriptionPl !== null || result.parameterTranslations.length > 0;

const resolveTranslationUpdateDocRecord = (
  record: Record<string, unknown>
): Record<string, unknown> | null => {
  const debugPayload = asRecord(record['debugPayload']);
  const updateDoc =
    asRecord(record['updateDoc']) ??
    asRecord(debugPayload?.['updateDoc']) ??
    asRecord(record['update']) ??
    null;
  if (updateDoc === null) return null;
  return asRecord(updateDoc['$set']) ?? updateDoc;
};

const resolveTranslationFromSetRecord = (
  setRecord: Record<string, unknown>
): TranslationEnPlAiPathResult | null => {
  const result = {
    descriptionPl: asTrimmedString(setRecord['description_pl']),
    parameterTranslations: normalizeParameterTranslations(setRecord['parameters']),
  };
  return hasTranslationResult(result) ? result : null;
};

const resolveTranslationFromUpdateDoc = (value: unknown): TranslationEnPlAiPathResult | null => {
  const record = asRecord(value);
  if (record === null) return null;

  const setRecord = resolveTranslationUpdateDocRecord(record);
  if (setRecord === null) return null;

  return resolveTranslationFromSetRecord(setRecord);
};

const resolveParsedTranslationSourceValue = (value: unknown): unknown => {
  const parsedJsonValue = tryParseJsonValue(value);
  return parsedJsonValue === null ? value : parsedJsonValue.value;
};

const trackSeenObject = (value: object, seen: WeakSet<object>): boolean => {
  if (seen.has(value)) return false;
  seen.add(value);
  return true;
};

const resolveTranslationFromArrayPayload = (
  sourceValue: unknown[],
  seen: WeakSet<object>
): TranslationEnPlAiPathResult | null => {
  if (!trackSeenObject(sourceValue, seen)) return null;

  let merged: TranslationEnPlAiPathResult | null = null;
  for (let index = sourceValue.length - 1; index >= 0; index -= 1) {
    merged = mergeTranslationResults(
      merged,
      resolveTranslationFromPayload(sourceValue[index], seen)
    );
  }
  return merged;
};

const resolveDirectTranslationFromRecord = (
  record: Record<string, unknown>
): TranslationEnPlAiPathResult | null => {
  const result = {
    descriptionPl: asTrimmedString(record['description_pl']),
    parameterTranslations: normalizeParameterTranslations(record['parameters']),
  };
  return hasTranslationResult(result) ? result : null;
};

const resolveNestedTranslationFromRecord = (
  record: Record<string, unknown>,
  seen: WeakSet<object>
): TranslationEnPlAiPathResult | null => {
  let merged: TranslationEnPlAiPathResult | null = null;
  for (const key of NESTED_RESULT_KEYS) {
    merged = mergeTranslationResults(merged, resolveTranslationFromPayload(record[key], seen));
  }
  return merged;
};

const resolveTranslationFromRecordPayload = (
  record: Record<string, unknown>,
  seen: WeakSet<object>
): TranslationEnPlAiPathResult | null => {
  let merged = resolveDirectTranslationFromRecord(record);
  merged = mergeTranslationResults(merged, resolveTranslationFromUpdateDoc(record));
  return mergeTranslationResults(merged, resolveNestedTranslationFromRecord(record, seen));
};

const resolveTranslationFromPayload = (
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>()
): TranslationEnPlAiPathResult | null => {
  const sourceValue = resolveParsedTranslationSourceValue(value);

  if (Array.isArray(sourceValue)) {
    return resolveTranslationFromArrayPayload(sourceValue, seen);
  }

  const record = asRecord(sourceValue);
  if (record === null) return null;
  if (!trackSeenObject(record, seen)) return null;

  return resolveTranslationFromRecordPayload(record, seen);
};

const resolveNodeType = (nodeRecord: Record<string, unknown>): string => {
  const type = asTrimmedString(nodeRecord['type']);
  if (type !== null) return type.toLowerCase();

  const nodeType = asTrimmedString(nodeRecord['nodeType']);
  if (nodeType !== null) return nodeType.toLowerCase();

  return '';
};

const resolveTranslationFromNodes = (nodes: unknown): TranslationEnPlAiPathResult | null => {
  if (!Array.isArray(nodes)) return null;

  let merged: TranslationEnPlAiPathResult | null = null;
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const nodeRecord = asRecord(nodes[index]);
    if (nodeRecord === null) continue;
    const nodeType = resolveNodeType(nodeRecord);
    if (NON_RESULT_NODE_TYPES.has(nodeType)) continue;

    merged = mergeTranslationResults(
      merged,
      resolveTranslationFromPayload({
        outputs: nodeRecord['outputs'],
        bundle: nodeRecord['bundle'],
        result: nodeRecord['result'],
        value: nodeRecord['value'],
        payload: nodeRecord['payload'],
        debugPayload: nodeRecord['debugPayload'],
        updateDoc: nodeRecord['updateDoc'],
        update: nodeRecord['update'],
      })
    );
  }

  return merged;
};

const resolveTranslationFromRuntimeState = (value: unknown): TranslationEnPlAiPathResult | null => {
  const runtimeState = asRecord(value);
  if (runtimeState === null) return null;

  const nodeOutputs = asRecord(runtimeState['nodeOutputs']) ?? asRecord(runtimeState['outputs']);
  if (nodeOutputs === null) return null;

  let merged: TranslationEnPlAiPathResult | null = null;
  const outputValues = Object.values(nodeOutputs);
  for (let index = outputValues.length - 1; index >= 0; index -= 1) {
    merged = mergeTranslationResults(
      merged,
      resolveTranslationFromPayload(outputValues[index])
    );
  }

  return merged;
};

export type { TranslationEnPlAiPathResult, TranslationParameterUpdate };

export const extractTranslationEnPlFromAiPathRunDetail = (
  detail: unknown
): TranslationEnPlAiPathResult | null => {
  const detailRecord = asRecord(detail);
  if (detailRecord === null) return null;

  const resolved = mergeTranslationResults(
    resolveTranslationFromNodes(detailRecord['nodes']),
    resolveTranslationFromRuntimeState(asRecord(detailRecord['run'])?.['runtimeState'])
  );

  if (resolved === null) return null;
  if (resolved.descriptionPl === null && resolved.parameterTranslations.length === 0) return null;
  return resolved;
};
