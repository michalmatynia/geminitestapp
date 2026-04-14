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

const normalizeParameterId = (value: unknown): string | null => {
  const direct = asTrimmedString(value);
  return direct && direct.length > 0 ? direct : null;
};

const resolveParameterTranslationValue = (record: Record<string, unknown>): string | null => {
  const valuesByLanguage = asRecord(record['valuesByLanguage']);
  const polishValue = asTrimmedString(valuesByLanguage?.['pl']);
  if (polishValue) return polishValue;
  return asTrimmedString(record['value']);
};

const normalizeParameterTranslations = (value: unknown): TranslationParameterUpdate[] => {
  if (!Array.isArray(value)) return [];

  const updatesById = new Map<string, TranslationParameterUpdate>();
  value.forEach((entry: unknown) => {
    const record = asRecord(entry);
    if (!record) return;
    const parameterId =
      normalizeParameterId(record['parameterId']) ??
      normalizeParameterId(record['id']) ??
      normalizeParameterId(record['_id']);
    const translatedValue = resolveParameterTranslationValue(record);
    if (!parameterId || !translatedValue) return;
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
  if (!base) return next;
  if (!next) return base;

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

const resolveTranslationFromUpdateDoc = (value: unknown): TranslationEnPlAiPathResult | null => {
  const record = asRecord(value);
  if (!record) return null;

  const updateDoc =
    asRecord(record['updateDoc']) ??
    asRecord(asRecord(record['debugPayload'])?.['updateDoc']) ??
    asRecord(record['update']) ??
    null;
  if (!updateDoc) return null;

  const setRecord = asRecord(updateDoc['$set']) ?? updateDoc;
  if (!setRecord) return null;

  const descriptionPl = asTrimmedString(setRecord['description_pl']);
  const parameterTranslations = normalizeParameterTranslations(setRecord['parameters']);
  if (!descriptionPl && parameterTranslations.length === 0) return null;

  return {
    descriptionPl,
    parameterTranslations,
  };
};

const resolveTranslationFromPayload = (
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>()
): TranslationEnPlAiPathResult | null => {
  const parsedJsonValue = tryParseJsonValue(value);
  const sourceValue = parsedJsonValue ?? value;

  if (Array.isArray(sourceValue)) {
    if (seen.has(sourceValue)) return null;
    seen.add(sourceValue);
    let merged: TranslationEnPlAiPathResult | null = null;
    for (let index = sourceValue.length - 1; index >= 0; index -= 1) {
      merged = mergeTranslationResults(
        merged,
        resolveTranslationFromPayload(sourceValue[index], seen)
      );
    }
    return merged;
  }

  const record = asRecord(sourceValue);
  if (!record) return null;
  if (seen.has(record)) return null;
  seen.add(record);

  let merged: TranslationEnPlAiPathResult | null = null;

  const directDescription = asTrimmedString(record['description_pl']);
  const directParameterTranslations = normalizeParameterTranslations(record['parameters']);
  if (directDescription || directParameterTranslations.length > 0) {
    merged = {
      descriptionPl: directDescription,
      parameterTranslations: directParameterTranslations,
    };
  }

  merged = mergeTranslationResults(merged, resolveTranslationFromUpdateDoc(record));

  for (const key of NESTED_RESULT_KEYS) {
    merged = mergeTranslationResults(merged, resolveTranslationFromPayload(record[key], seen));
  }

  return merged;
};

const resolveTranslationFromNodes = (nodes: unknown): TranslationEnPlAiPathResult | null => {
  if (!Array.isArray(nodes)) return null;

  let merged: TranslationEnPlAiPathResult | null = null;
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
  if (!runtimeState) return null;

  const nodeOutputs = asRecord(runtimeState['nodeOutputs']) ?? asRecord(runtimeState['outputs']);
  if (!nodeOutputs) return null;

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
  if (!detailRecord) return null;

  const resolved = mergeTranslationResults(
    resolveTranslationFromNodes(detailRecord['nodes']),
    resolveTranslationFromRuntimeState(asRecord(detailRecord['run'])?.['runtimeState'])
  );

  if (!resolved) return null;
  if (!resolved.descriptionPl && resolved.parameterTranslations.length === 0) return null;
  return resolved;
};
