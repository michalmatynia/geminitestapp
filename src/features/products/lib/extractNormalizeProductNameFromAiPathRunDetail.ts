const NORMALIZE_PRODUCT_NAME_PATH_ID = 'path_name_normalize_v1';

export type NormalizeProductNameCategoryLeaf = {
  id: string | null;
  label: string;
  fullPath: string | null;
  parentId: string | null;
  isCurrent: boolean | null;
};

export type NormalizeProductNameCategoryContext = {
  catalogId: string | null;
  currentCategoryId: string | null;
  leafCategories: NormalizeProductNameCategoryLeaf[];
  allowedLeafLabels: string[];
  totalCategories: number | null;
  totalLeafCategories: number | null;
  fetchedAt: string | null;
};

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
  categoryContext?: NormalizeProductNameCategoryContext | null;
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

const resolveNormalizeCategoryLeaf = (value: unknown): NormalizeProductNameCategoryLeaf | null => {
  const record = asRecord(value);
  if (!record) return null;

  const label = asTrimmedString(record['label']) ?? asTrimmedString(record['name']);
  if (!label) return null;

  return {
    id: asTrimmedString(record['id']),
    label,
    fullPath: asTrimmedString(record['fullPath']),
    parentId: asTrimmedString(record['parentId']),
    isCurrent: asNullableBoolean(record['isCurrent']),
  };
};

const resolveNormalizeCategoryContext = (
  value: unknown
): NormalizeProductNameCategoryContext | null => {
  const record = asRecord(value);
  if (!record) return null;

  const leafCategories = Array.isArray(record['leafCategories'])
    ? record['leafCategories']
        .map((entry: unknown) => resolveNormalizeCategoryLeaf(entry))
        .filter((entry): entry is NormalizeProductNameCategoryLeaf => entry !== null)
    : [];
  const allowedLeafLabels = Array.isArray(record['allowedLeafLabels'])
    ? record['allowedLeafLabels']
        .map((entry: unknown) => asTrimmedString(entry))
        .filter((entry): entry is string => entry !== null)
    : [];
  const totalCategories = asNullableNumber(record['totalCategories']);
  const totalLeafCategories = asNullableNumber(record['totalLeafCategories']);
  const catalogId = asTrimmedString(record['catalogId']);
  const currentCategoryId = asTrimmedString(record['currentCategoryId']);
  const fetchedAt = asTrimmedString(record['fetchedAt']);

  if (
    leafCategories.length === 0 &&
    allowedLeafLabels.length === 0 &&
    totalCategories === null &&
    totalLeafCategories === null &&
    catalogId === null &&
    currentCategoryId === null &&
    fetchedAt === null
  ) {
    return null;
  }

  return {
    catalogId,
    currentCategoryId,
    leafCategories,
    allowedLeafLabels,
    totalCategories,
    totalLeafCategories,
    fetchedAt,
  };
};

const resolveNormalizeCategoryContextFromValue = (
  value: unknown
): NormalizeProductNameCategoryContext | null => {
  const record = asRecord(value);
  if (!record) return null;

  return (
    resolveNormalizeCategoryContext(record['categoryContext']) ??
    resolveNormalizeCategoryContext(asRecord(record['bundle'])?.['categoryContext']) ??
    resolveNormalizeCategoryContext(asRecord(record['value'])?.['categoryContext']) ??
    null
  );
};

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

const resolveNormalizeCategoryContextFromNodes = (
  value: unknown
): NormalizeProductNameCategoryContext | null => {
  if (!Array.isArray(value)) return null;

  const nodeEntries = value
    .map((entry: unknown) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);

  for (const entry of nodeEntries) {
    const categoryContext = resolveNormalizeCategoryContextFromValue(entry['outputs']);
    if (categoryContext) return categoryContext;
  }

  return null;
};

const resolveNormalizeCategoryContextFromRuntimeState = (
  value: unknown
): NormalizeProductNameCategoryContext | null => {
  const runtimeState = asRecord(value);
  if (!runtimeState) return null;

  const nodeOutputs = asRecord(runtimeState['nodeOutputs']) ?? asRecord(runtimeState['outputs']);
  if (!nodeOutputs) return null;

  for (const entry of Object.values(nodeOutputs)) {
    const categoryContext = resolveNormalizeCategoryContextFromValue(entry);
    if (categoryContext) return categoryContext;
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

  const payload =
    resolveNormalizePayloadFromNodes(record['nodes']) ??
    resolveNormalizePayloadFromRuntimeState(asRecord(record['run'])?.['runtimeState']) ??
    resolveNormalizePayload(asRecord(record['run'])?.['result']) ??
    null;
  if (!payload) return null;

  const categoryContext =
    resolveNormalizeCategoryContextFromNodes(record['nodes']) ??
    resolveNormalizeCategoryContextFromRuntimeState(asRecord(record['run'])?.['runtimeState']) ??
    resolveNormalizeCategoryContextFromValue(asRecord(record['run'])?.['result']) ??
    null;

  return categoryContext ? { ...payload, categoryContext } : payload;
};

export const extractNormalizeProductNameFromAiPathRunDetail = (
  detail: unknown
): string | null => extractNormalizeProductNameResultFromAiPathRunDetail(detail)?.normalizedName ?? null;
