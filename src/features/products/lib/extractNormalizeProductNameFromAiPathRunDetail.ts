const NORMALIZE_PRODUCT_NAME_PATH_ID = 'path_name_normalize_v1';

export type NormalizeProductNameAiPathResult = {
  normalizedName: string | null;
  title: string | null;
  size: string | null;
  material: string | null;
  category: string | null;
  theme: string | null;
  isValid: boolean | null;
  validationError: string | null;
  confidence: number | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asNullableBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const asNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const resolveNameFromUpdateDoc = (value: unknown): string | null => {
  const updateDoc = asRecord(value);
  if (!updateDoc) return null;
  const setDoc = asRecord(updateDoc['$set']);
  if (!setDoc) return null;
  return asTrimmedString(setDoc['name_en']);
};

const resolveNormalizePayload = (value: unknown): NormalizeProductNameAiPathResult | null => {
  const record = asRecord(value);
  if (!record) return null;

  const debugPayload = asRecord(record['debugPayload']);
  const bundle = asRecord(record['bundle']);
  const nestedValue = asRecord(record['value']);
  const candidates = [
    debugPayload ? asRecord(debugPayload['updateDoc']) : null,
    bundle,
    nestedValue,
    record,
  ].filter((candidate): candidate is Record<string, unknown> => candidate !== null);

  for (const candidate of candidates) {
    const normalizedName =
      resolveNameFromUpdateDoc(candidate) ??
      asTrimmedString(candidate['normalizedName']) ??
      asTrimmedString(candidate['result']);
    const title = asTrimmedString(candidate['title']);
    const size = asTrimmedString(candidate['size']);
    const material = asTrimmedString(candidate['material']);
    const category = asTrimmedString(candidate['category']);
    const theme = asTrimmedString(candidate['theme']);
    const validationError = asTrimmedString(candidate['validationError']);
    const isValid = asNullableBoolean(candidate['isValid']);
    const confidence = asNullableNumber(candidate['confidence']);

    if (
      normalizedName ||
      title ||
      size ||
      material ||
      category ||
      theme ||
      validationError ||
      isValid !== null ||
      confidence !== null
    ) {
      return {
        normalizedName,
        title,
        size,
        material,
        category,
        theme,
        isValid,
        validationError,
        confidence,
      };
    }
  }

  return null;
};

const resolveNormalizePayloadFromNodes = (
  value: unknown
): NormalizeProductNameAiPathResult | null => {
  if (!Array.isArray(value)) return null;

  const nodeEntries = value
    .map((entry: unknown) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
  const orderedCandidates = [
    ...nodeEntries.filter((entry) => entry['nodeType'] === 'database'),
    ...nodeEntries.filter((entry) => entry['nodeType'] === 'mapper'),
    ...nodeEntries.filter((entry) => entry['nodeType'] === 'regex'),
    ...nodeEntries,
  ];

  for (const entry of orderedCandidates) {
    const payload = resolveNormalizePayload(asRecord(entry['outputs']));
    if (payload) return payload;
  }

  return null;
};

const resolveNormalizePayloadFromRuntimeState = (
  value: unknown
): NormalizeProductNameAiPathResult | null => {
  const runtimeState = asRecord(value);
  if (!runtimeState) return null;

  const nodeOutputs = asRecord(runtimeState['nodeOutputs']) ?? asRecord(runtimeState['outputs']);
  if (!nodeOutputs) return null;

  for (const entry of Object.values(nodeOutputs)) {
    const payload = resolveNormalizePayload(entry);
    if (payload) return payload;
  }

  return null;
};

export const isNormalizeProductNamePath = (pathId: unknown): boolean =>
  asTrimmedString(pathId) === NORMALIZE_PRODUCT_NAME_PATH_ID;

export const extractNormalizeProductNameResultFromAiPathRunDetail = (
  detail: unknown
): NormalizeProductNameAiPathResult | null => {
  const record = asRecord(detail);
  if (!record) return null;

  return (
    resolveNormalizePayloadFromNodes(record['nodes']) ??
    resolveNormalizePayloadFromRuntimeState(asRecord(record['run'])?.['runtimeState']) ??
    resolveNormalizePayload(asRecord(record['run'])?.['result']) ??
    null
  );
};

export const extractNormalizeProductNameFromAiPathRunDetail = (
  detail: unknown
): string | null => extractNormalizeProductNameResultFromAiPathRunDetail(detail)?.normalizedName ?? null;
