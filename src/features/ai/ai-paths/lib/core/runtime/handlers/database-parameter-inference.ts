import type { DatabaseConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';

import {
  coerceInput,
  getValueAtMappingPath,
  parseJsonSafe,
} from '../../utils';

type ParameterDefinitionRecord = {
  id: string;
  selectorType: string;
  optionLabels: string[];
};

const SELECTOR_TYPES_REQUIRING_OPTIONS = new Set<string>([
  'radio',
  'select',
  'dropdown',
  'checklist',
]);

const MULTI_VALUE_DELIMITER = '|';

const normalizeValueTokenCase = (value: string): string => {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return '';

  const hasLowerCaseLetters = compact !== compact.toLocaleUpperCase();
  const hasUpperCaseLetters = compact !== compact.toLocaleLowerCase();
  if (hasLowerCaseLetters && hasUpperCaseLetters) {
    return compact;
  }

  return compact.replace(/\p{L}[\p{L}\p{M}]*/gu, (token: string): string => {
    if (token.length <= 3 && token === token.toLocaleUpperCase()) {
      return token;
    }
    const letters = Array.from(token);
    const first = letters[0] ?? '';
    const rest = letters.slice(1).join('');
    return `${first.toLocaleUpperCase()}${rest.toLocaleLowerCase()}`;
  });
};

const normalizeMultiValueDelimiter = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const tokens = trimmed
    .split(/\s*\|\s*|\s*;\s*|\s*\r?\n+\s*|\s*,\s*/)
    .map((entry: string) => normalizeValueTokenCase(entry))
    .filter(Boolean);
  if (tokens.length <= 1) {
    return tokens[0] ?? normalizeValueTokenCase(trimmed);
  }
  const seen = new Set<string>();
  const canonicalTokens: string[] = [];
  tokens.forEach((entry: string) => {
    const key = entry.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    canonicalTokens.push(entry);
  });
  return canonicalTokens.join(MULTI_VALUE_DELIMITER);
};

const parseChecklistValues = (value: string): string[] => {
  const seen = new Set<string>();
  return value
    .split(/[|,;\n]/)
    .map((entry: string) => entry.trim())
    .filter((entry: string) => {
      if (!entry) return false;
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const resolveChecklistValue = (raw: unknown): string | null => {
  const arrayLike = coerceArrayLike(raw)
    .map((entry: unknown): string | null => normalizeNonEmptyString(entry))
    .filter((entry: string | null): entry is string => Boolean(entry));
  if (arrayLike.length > 0) {
    return normalizeMultiValueDelimiter(arrayLike.join(MULTI_VALUE_DELIMITER));
  }
  const resolved = resolveParameterValue(raw);
  return resolved ? normalizeMultiValueDelimiter(resolved) : null;
};

export class ParameterInferenceGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParameterInferenceGateError';
  }
}

export const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const coerceArrayLike = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const nested =
      record['items'] ??
      record['rows'] ??
      record['results'] ??
      record['data'];
    if (Array.isArray(nested)) return nested;
  }
  if (typeof value === 'string') {
    const parsed = parseJsonSafe(value);
    if (Array.isArray(parsed)) return parsed;
    return [];
  }
  return [];
};

const coerceParameterInferenceCandidates = (
  value: unknown
): { candidates: unknown[]; repaired: boolean } => {
  if (Array.isArray(value)) {
    return { candidates: value, repaired: false };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const nested = coerceArrayLike(value);
    if (nested.length > 0) {
      return { candidates: nested, repaired: false };
    }
  }
  if (typeof value !== 'string') {
    return { candidates: [], repaired: false };
  }
  const direct = parseJsonSafe(value);
  if (Array.isArray(direct)) {
    return { candidates: direct, repaired: false };
  }
  const openIndex = value.indexOf('[');
  const closeIndex = value.lastIndexOf(']');
  if (openIndex < 0 || closeIndex <= openIndex) {
    return { candidates: [], repaired: false };
  }
  const repairedCandidate = value.slice(openIndex, closeIndex + 1);
  const repaired = parseJsonSafe(repairedCandidate);
  if (Array.isArray(repaired)) {
    return { candidates: repaired, repaired: true };
  }
  return { candidates: [], repaired: false };
};

export const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const resolveObjectPathValue = (
  source: Record<string, unknown> | null,
  path: string
): unknown => {
  if (!source) return undefined;
  if (!path) return undefined;
  if (Object.prototype.hasOwnProperty.call(source, path)) {
    return source[path];
  }
  return getValueAtMappingPath(source, path);
};

const normalizeParameterId = (value: unknown): string | null =>
  normalizeNonEmptyString(value);

const resolveParameterDefinitionRows = (
  definitionsValue: unknown,
  definitionsPath: string
): unknown[] => {
  let source: unknown = definitionsValue;
  if (
    definitionsPath &&
    source &&
    typeof source === 'object' &&
    !Array.isArray(source)
  ) {
    const resolved = getValueAtMappingPath(source, definitionsPath);
    source = resolved ?? source;
  }
  if (
    source &&
    typeof source === 'object' &&
    !Array.isArray(source)
  ) {
    const nested =
      (source as Record<string, unknown>)['items'] ??
      (source as Record<string, unknown>)['rows'] ??
      (source as Record<string, unknown>)['results'] ??
      (source as Record<string, unknown>)['data'];
    if (Array.isArray(nested)) return nested;
  }
  return coerceArrayLike(source);
};

const normalizeParameterDefinitions = (
  definitionsValue: unknown,
  definitionsPath: string
): Map<string, ParameterDefinitionRecord> => {
  const map = new Map<string, ParameterDefinitionRecord>();
  const rows = resolveParameterDefinitionRows(definitionsValue, definitionsPath);
  rows.forEach((row: unknown) => {
    if (!row || typeof row !== 'object') return;
    const record = row as Record<string, unknown>;
    const id =
      normalizeNonEmptyString(record['id']) ??
      normalizeNonEmptyString(record['_id']) ??
      normalizeNonEmptyString(record['parameterId']);
    if (!id) return;
    const selectorType =
      normalizeNonEmptyString(record['selectorType'])?.toLowerCase() ?? 'text';
    const optionLabels = coerceArrayLike(record['optionLabels'])
      .map((option: unknown): string | null => normalizeNonEmptyString(option))
      .filter((option: string | null): option is string => Boolean(option));
    map.set(id, {
      id,
      selectorType,
      optionLabels,
    });
  });
  return map;
};

const resolveParameterValue = (value: unknown): string | null => {
  if (typeof value === 'string') return normalizeNonEmptyString(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = resolveParameterValue(item);
      if (resolved) return resolved;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const direct =
    resolveParameterValue(record['value']) ??
    resolveParameterValue(record['value_en']) ??
    resolveParameterValue(record['en']) ??
    resolveParameterValue(record['english']) ??
    resolveParameterValue(record['label']);
  if (direct) return direct;
  const valuesByLanguage = record['valuesByLanguage'];
  if (valuesByLanguage && typeof valuesByLanguage === 'object') {
    const localized = valuesByLanguage as Record<string, unknown>;
    return (
      resolveParameterValue(localized['en']) ??
      resolveParameterValue(localized['en-US']) ??
      resolveParameterValue(localized['english']) ??
      null
    );
  }
  return null;
};

export const normalizeParameterEntries = (
  value: unknown,
  options: { allowEmptyValue: boolean }
): Array<{ parameterId: string; value: string; raw: Record<string, unknown> }> => {
  const entries = coerceArrayLike(value);
  const normalized: Array<{ parameterId: string; value: string; raw: Record<string, unknown> }> = [];
  const seen = new Set<string>();
  entries.forEach((entry: unknown) => {
    const record = toRecord(entry);
    if (!record) return;
    const parameterId =
      normalizeParameterId(record['parameterId']) ??
      normalizeParameterId(record['id']);
    if (!parameterId || seen.has(parameterId)) return;
    const resolvedValue = resolveParameterValue(record['value']);
    if (!resolvedValue && !options.allowEmptyValue) return;
    normalized.push({
      parameterId,
      value: resolvedValue ?? '',
      raw: { ...record },
    });
    seen.add(parameterId);
  });
  return normalized;
};

export const resolveExistingParameterValueFromInputs = (
  templateInputs: RuntimePortValues,
  targetPath: string
): unknown => {
  const candidates: unknown[] = [];
  const pushFromRecord = (value: unknown): void => {
    const record = toRecord(value);
    if (!record) return;
    candidates.push(resolveObjectPathValue(record, targetPath));
    const nestedKeys = ['entity', 'entityJson', 'product', 'item', 'data', 'current'];
    nestedKeys.forEach((key: string) => {
      candidates.push(resolveObjectPathValue(toRecord(record[key]), targetPath));
    });
  };
  pushFromRecord(templateInputs);
  pushFromRecord(coerceInput(templateInputs['context']));
  pushFromRecord(coerceInput(templateInputs['bundle']));
  pushFromRecord(coerceInput(templateInputs['value']));
  pushFromRecord(coerceInput(templateInputs['result']));
  for (const candidate of candidates) {
    if (coerceArrayLike(candidate).length > 0) {
      return candidate;
    }
  }
  return undefined;
};

export const mergeParameterInferenceUpdates = (args: {
  targetPath: string;
  updates: Record<string, unknown>;
  templateInputs: RuntimePortValues;
}): {
  updates: Record<string, unknown>;
  applied: boolean;
  meta?: Record<string, unknown>;
} => {
  // Runtime merge logic updates only the existing `parameters` payload.
  if (args.targetPath !== 'parameters') {
    return { updates: args.updates, applied: false };
  }

  const inferred = normalizeParameterEntries(args.updates[args.targetPath], {
    allowEmptyValue: false,
  });
  if (inferred.length === 0) {
    return { updates: args.updates, applied: false };
  }

  const existingSource = resolveExistingParameterValueFromInputs(
    args.templateInputs,
    args.targetPath
  );
  const existing = normalizeParameterEntries(existingSource, {
    allowEmptyValue: true,
  });
  if (existing.length === 0) {
    const nextUpdates: Record<string, unknown> = { ...args.updates };
    delete nextUpdates[args.targetPath];
    return {
      updates: nextUpdates,
      applied: true,
      meta: {
        targetPath: args.targetPath,
        existingCount: 0,
        inferredCount: inferred.length,
        finalCount: 0,
        merged: {
          filledBlank: 0,
          preservedNonEmpty: 0,
          skippedNotExisting: inferred.length,
        },
        writeCandidates: 0,
        skipped: {
          reason: 'missing_existing_parameters',
        },
      },
    };
  }

  const nextRecords = existing.map((entry) => ({ ...entry.raw }));
  const indexByParameterId = new Map<string, number>();
  existing.forEach((entry, index) => {
    indexByParameterId.set(entry.parameterId, index);
  });

  let filledBlankCount = 0;
  let preservedNonEmptyCount = 0;
  let skippedNotExistingCount = 0;

  inferred.forEach((entry) => {
    const existingIndex = indexByParameterId.get(entry.parameterId);
    if (existingIndex === undefined) {
      skippedNotExistingCount += 1;
      return;
    }
    const current = nextRecords[existingIndex] ?? {};
    const currentValue = resolveParameterValue(current['value']);
    if (currentValue) {
      preservedNonEmptyCount += 1;
      return;
    }
    nextRecords[existingIndex] = {
      ...current,
      parameterId: entry.parameterId,
      value: entry.value,
    };
    filledBlankCount += 1;
  });

  const nextUpdates: Record<string, unknown> = { ...args.updates };
  if (filledBlankCount > 0) {
    nextUpdates[args.targetPath] = nextRecords;
  } else {
    delete nextUpdates[args.targetPath];
  }
  return {
    updates: nextUpdates,
    applied: true,
    meta: {
      targetPath: args.targetPath,
      existingCount: existing.length,
      inferredCount: inferred.length,
      finalCount: nextRecords.length,
      merged: {
        filledBlank: filledBlankCount,
        preservedNonEmpty: preservedNonEmptyCount,
        skippedNotExisting: skippedNotExistingCount,
      },
      writeCandidates: filledBlankCount,
    },
  };
};

export const resolveParameterIdsFromInputs = (inputs: RuntimePortValues): string[] => {
  const ids = new Set<string>();
  const collectFromParameters = (value: unknown): void => {
    const entries = coerceArrayLike(value);
    entries.forEach((entry: unknown) => {
      const record = toRecord(entry);
      if (!record) return;
      const parameterId =
        normalizeParameterId(record['parameterId']) ??
        normalizeParameterId(record['id']) ??
        normalizeParameterId(record['_id']);
      if (parameterId) ids.add(parameterId);
    });
  };
  const collectFromRecord = (value: unknown): void => {
    const record = toRecord(value);
    if (!record) return;
    collectFromParameters(record['parameters']);
    ['entity', 'entityJson', 'product', 'item', 'data'].forEach((key: string) => {
      const nested = toRecord(record[key]);
      if (!nested) return;
      collectFromParameters(nested['parameters']);
    });
  };
  collectFromRecord(inputs);
  collectFromRecord(coerceInput(inputs['context']));
  collectFromRecord(coerceInput(inputs['bundle']));
  collectFromRecord(coerceInput(inputs['value']));
  collectFromRecord(coerceInput(inputs['result']));
  return Array.from(ids);
};

const isMissingCatalogIdQuery = (query: unknown): boolean => {
  const record = toRecord(query);
  if (!record) return false;
  if (Object.prototype.hasOwnProperty.call(record, 'catalogId')) {
    const catalogId = normalizeNonEmptyString(record['catalogId']);
    return !catalogId;
  }
  const orConditions = coerceArrayLike(record['$or']);
  return orConditions.some((candidate: unknown) => isMissingCatalogIdQuery(candidate));
};

export const shouldRunParameterDefinitionFallback = (args: {
  collection: string;
  query: unknown;
  count: number;
  queryTemplate: string;
}): boolean => {
  if (args.count > 0) return false;
  if (args.collection.trim().toLowerCase() !== 'product_parameters') return false;
  if (args.queryTemplate.includes('catalogId')) return true;
  return isMissingCatalogIdQuery(args.query);
};

export const applyParameterInferenceGuard = (args: {
  dbConfig: DatabaseConfig;
  updates: Record<string, unknown>;
  templateInputs: RuntimePortValues;
}): {
  updates: Record<string, unknown>;
  applied: boolean;
  blocked?: boolean;
  errorMessage?: string;
  meta?: Record<string, unknown>;
} => {
  const guard = args.dbConfig.parameterInferenceGuard;
  if (!guard?.enabled) {
    return { updates: args.updates, applied: false };
  }

  const targetPath =
    normalizeNonEmptyString(guard.targetPath) ?? 'parameters';
  const rawCandidate = args.updates[targetPath];
  if (rawCandidate === undefined) {
    return { updates: args.updates, applied: false };
  }

  const definitionsPort =
    normalizeNonEmptyString(guard.definitionsPort) ?? 'result';
  const definitionsPath =
    normalizeNonEmptyString(guard.definitionsPath) ?? '';
  const definitions = normalizeParameterDefinitions(
    args.templateInputs[definitionsPort],
    definitionsPath
  );
  const allowUnknownParameterIds = Boolean(guard.allowUnknownParameterIds);
  const enforceOptionLabels = guard.enforceOptionLabels !== false;

  const {
    candidates,
    repaired: candidateRepairApplied,
  } = coerceParameterInferenceCandidates(rawCandidate);
  const accepted: Array<{ parameterId: string; value: string }> = [];
  const acceptedIds = new Set<string>();
  let unknownParameterIdCount = 0;
  let invalidOptionCount = 0;
  let emptyValueCount = 0;
  let duplicateCount = 0;
  let invalidShapeCount = 0;

  if (definitions.size === 0 && !allowUnknownParameterIds) {
    const nextUpdates: Record<string, unknown> = { ...args.updates };
    delete nextUpdates[targetPath];
    const errorMessage = 'No parameter definitions resolved for parameter inference.';
    return {
      updates: nextUpdates,
      applied: true,
      blocked: true,
      errorMessage,
      meta: {
        targetPath,
        definitionsPort,
        definitionsPath,
        candidates: candidates.length,
        accepted: 0,
        definitions: 0,
        repairedCandidates: candidateRepairApplied,
        blocked: {
          reason: 'missing_definitions',
          message: errorMessage,
        },
      },
    };
  }

  candidates.forEach((entry: unknown) => {
    const record = toRecord(entry);
    if (!record) {
      invalidShapeCount += 1;
      return;
    }
    const parameterId =
      normalizeNonEmptyString(record['parameterId']) ??
      normalizeNonEmptyString(record['id']);
    if (!parameterId) {
      unknownParameterIdCount += 1;
      return;
    }
    if (acceptedIds.has(parameterId)) {
      duplicateCount += 1;
      return;
    }

    const definition = definitions.get(parameterId);
    if (!definition && !allowUnknownParameterIds) {
      unknownParameterIdCount += 1;
      return;
    }

    let value =
      definition?.selectorType === 'checklist'
        ? resolveChecklistValue(record['value'])
        : resolveParameterValue(record['value']);
    if (!value) {
      emptyValueCount += 1;
      return;
    }

    if (
      definition &&
      enforceOptionLabels &&
      SELECTOR_TYPES_REQUIRING_OPTIONS.has(definition.selectorType) &&
      definition.optionLabels.length > 0
    ) {
      const lookup = new Map<string, string>();
      definition.optionLabels.forEach((option: string) => {
        lookup.set(option.trim().toLowerCase(), option);
      });
      if (definition.selectorType === 'checklist') {
        const entries = parseChecklistValues(value);
        if (entries.length === 0) {
          invalidOptionCount += 1;
          return;
        }
        const canonicalEntries: string[] = [];
        const seen = new Set<string>();
        for (const entry of entries) {
          const canonical = lookup.get(entry.trim().toLowerCase());
          if (!canonical) {
            invalidOptionCount += 1;
            return;
          }
          const key = canonical.trim().toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          canonicalEntries.push(canonical);
        }
        value = canonicalEntries.join(MULTI_VALUE_DELIMITER);
      } else {
        const canonical = lookup.get(value.trim().toLowerCase());
        if (!canonical) {
          invalidOptionCount += 1;
          return;
        }
        value = canonical;
      }
    }

    value = normalizeMultiValueDelimiter(value);
    accepted.push({ parameterId, value });
    acceptedIds.add(parameterId);
  });

  const nextUpdates: Record<string, unknown> = { ...args.updates };
  if (accepted.length > 0) {
    nextUpdates[targetPath] = accepted;
  } else {
    delete nextUpdates[targetPath];
  }

  return {
    updates: nextUpdates,
    applied: true,
    meta: {
      targetPath,
      definitionsPort,
      definitionsPath,
      candidates: candidates.length,
      accepted: accepted.length,
      definitions: definitions.size,
      repairedCandidates: candidateRepairApplied,
      dropped: {
        unknownParameterId: unknownParameterIdCount,
        invalidOption: invalidOptionCount,
        emptyValue: emptyValueCount,
        duplicate: duplicateCount,
        invalidShape: invalidShapeCount,
      },
    },
  };
};
