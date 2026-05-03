import type { DatabaseConfig } from '@/shared/contracts/ai-paths';
import type { RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

import {
  type ParameterDefinitionRecord,
  MULTI_VALUE_DELIMITER,
  SELECTOR_TYPES_REQUIRING_OPTIONS,
  coerceArrayLike,
  coerceParameterInferenceCandidates,
  normalizeMultiValueDelimiter,
  normalizeNonEmptyString,
  normalizeParameterDefinitions,
  parseChecklistValues,
  resolveChecklistValue,
  resolveParameterValue,
  toRecord,
} from './database-parameter-inference-utils';
import { coerceInput } from '../../utils';
import {
  ParameterInferenceGateError,
  assertParameterInferenceGuardrails,
} from './parameter-inference/parameter-inference.guardrails';
import {
  coerceParameterRecordArray,
  normalizeParameterEntries,
} from './parameter-inference/parameter-inference.normalizer';
import {
  mergeParameterInferenceUpdates,
  resolveExistingParameterValueFromInputs,
} from './parameter-inference/parameter-inference.merger';

import { stableStringify } from '@/shared/utils/stable-stringify';

export {
  coerceArrayLike,
  normalizeNonEmptyString,
  resolveObjectPathValue,
  toRecord,
} from './database-parameter-inference-utils';

export { ParameterInferenceGateError, assertParameterInferenceGuardrails };

export { normalizeParameterEntries, coerceParameterRecordArray };

export { mergeParameterInferenceUpdates, resolveExistingParameterValueFromInputs };

const DEFAULT_PARAMETER_INFERENCE_LANGUAGE_CODE = 'en';

const normalizeParameterId = (value: unknown): string | null => normalizeNonEmptyString(value);

const areParameterRecordArraysEqual = (
  left: Record<string, unknown>[],
  right: Record<string, unknown>[]
): boolean => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (stableStringify(left[index]) !== stableStringify(right[index])) {
      return false;
    }
  }
  return true;
};

const resolveLocalizedValueByLanguage = (
  valuesByLanguage: Record<string, unknown>,
  languageCode: string
): string | null => {
  const normalizedLanguageCode = languageCode.trim().toLowerCase();
  if (!normalizedLanguageCode) return null;

  const exact = Object.entries(valuesByLanguage).find(
    ([key]): boolean => normalizeNonEmptyString(key)?.toLowerCase() === normalizedLanguageCode
  );
  if (exact) {
    return normalizeNonEmptyString(exact[1]);
  }

  const prefixed = Object.entries(valuesByLanguage).find(([key]): boolean => {
    const normalizedKey = normalizeNonEmptyString(key)?.toLowerCase() ?? '';
    return normalizedKey.startsWith(`${normalizedLanguageCode}-`);
  });
  if (prefixed) {
    return normalizeNonEmptyString(prefixed[1]);
  }
  return null;
};

const resolveParameterInferenceLanguageCode = (value: unknown): string =>
  normalizeNonEmptyString(value)?.toLowerCase() ?? DEFAULT_PARAMETER_INFERENCE_LANGUAGE_CODE;

const mergeInferredParameterValueRecord = (args: {
  current: Record<string, unknown>;
  parameterId: string;
  inferredValue: string;
  languageCode: string;
  allowScalarFill: boolean;
}): {
  next: Record<string, unknown>;
  filledScalar: boolean;
  filledLocalized: boolean;
} => {
  const inferredValue = resolveParameterValue(args.inferredValue) ?? '';
  const currentValue = resolveParameterValue(args.current['value']) ?? '';
  const languageCode = resolveParameterInferenceLanguageCode(args.languageCode);
  const currentValuesByLanguage = toRecord(args.current['valuesByLanguage']) ?? {};
  const currentLocalizedValue =
    resolveLocalizedValueByLanguage(currentValuesByLanguage, languageCode) ?? '';

  let nextValue = currentValue;
  let filledScalar = false;
  if (!currentValue && args.allowScalarFill && inferredValue) {
    nextValue = inferredValue;
    filledScalar = true;
  }

  let nextValuesByLanguage = currentValuesByLanguage;
  let filledLocalized = false;
  if (!currentLocalizedValue) {
    const localizedCandidate = nextValue || inferredValue;
    if (localizedCandidate) {
      nextValuesByLanguage = {
        ...currentValuesByLanguage,
        [languageCode]: localizedCandidate,
      };
      filledLocalized = true;
    }
  }

  return {
    next: {
      ...args.current,
      parameterId: args.parameterId,
      value: nextValue,
      ...(Object.keys(nextValuesByLanguage).length > 0
        ? { valuesByLanguage: nextValuesByLanguage }
        : {}),
    },
    filledScalar,
    filledLocalized,
  };
};

const resolveTranslatedParameterValue = (
  record: Record<string, unknown>,
  languageCode: string
): string | null => {
  const valuesByLanguage = toRecord(record['valuesByLanguage']);

  if (valuesByLanguage) {
    const localized = resolveLocalizedValueByLanguage(valuesByLanguage, languageCode);
    if (localized) return localized;
  }

  const directLocalized = [
    record[languageCode],
    record[languageCode.toLowerCase()],
    record[languageCode.toUpperCase()],
  ]
    .map((value) => normalizeNonEmptyString(value))
    .find(Boolean);

  if (directLocalized) return directLocalized;

  return [record['value'], record['translatedValue']]
    .map((value) => resolveParameterValue(value))
    .find(Boolean) ?? null;
};

type ParameterInferenceCandidateStats = {
  duplicateCount: number;
  emptyValueCount: number;
  invalidOptionCount: number;
  invalidShapeCount: number;
  unknownParameterIdCount: number;
};

const createInitialParameterInferenceCandidateStats =
  (): ParameterInferenceCandidateStats => ({
    duplicateCount: 0,
    emptyValueCount: 0,
    invalidOptionCount: 0,
    invalidShapeCount: 0,
    unknownParameterIdCount: 0,
  });

const createBlockedParameterInferenceResult = (args: {
  targetPath: string;
  definitionsPort?: string;
  definitionsPath?: string;
  candidates?: number;
  definitions?: number;
  repairedCandidates?: boolean;
  updates: Record<string, unknown>;
  reason: string;
  errorMessage: string;
}): {
  updates: Record<string, unknown>;
  applied: boolean;
  blocked: boolean;
  errorMessage: string;
  meta: Record<string, unknown>;
} => ({
  updates: args.updates,
  applied: true,
  blocked: true,
  errorMessage: args.errorMessage,
  meta: {
    targetPath: args.targetPath,
    ...(args.definitionsPort ? { definitionsPort: args.definitionsPort } : {}),
    ...(args.definitionsPath !== undefined ? { definitionsPath: args.definitionsPath } : {}),
    ...(args.candidates !== undefined ? { candidates: args.candidates } : {}),
    ...(args.definitions !== undefined ? { definitions: args.definitions } : {}),
    ...(args.repairedCandidates !== undefined
      ? { repairedCandidates: args.repairedCandidates }
      : {}),
    blocked: {
      reason: args.reason,
      message: args.errorMessage,
    },
  },
});

const normalizeParameterInferenceTargetPath = (
  dbConfig: DatabaseConfig
): string => normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.targetPath) ?? 'parameters';

const createOptionLookup = (definition: ParameterDefinitionRecord): Map<string, string> => {
  const lookup = new Map<string, string>();
  definition.optionLabels.forEach((option: string) => {
    lookup.set(option.trim().toLowerCase(), option);
  });
  return lookup;
};

const normalizeChecklistCandidateValue = (args: {
  lookup: Map<string, string>;
  value: string;
}): string | null => {
  const entries = parseChecklistValues(args.value);

  if (entries.length === 0) {
    return null;
  }

  const canonicalEntries: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const canonical = args.lookup.get(entry.trim().toLowerCase());

    if (!canonical) {
      return null;
    }

    const key = canonical.trim().toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    canonicalEntries.push(canonical);
  }

  return canonicalEntries.join(MULTI_VALUE_DELIMITER);
};

const normalizeDefinitionCandidateValue = (args: {
  definition: ParameterDefinitionRecord;
  enforceOptionLabels: boolean;
  rawValue: unknown;
}): { reason: 'empty' | 'invalid_option'; value: string | null } => {
  const value =
    args.definition.selectorType === 'checklist'
      ? resolveChecklistValue(args.rawValue)
      : resolveParameterValue(args.rawValue);

  if (!value) {
    return { reason: 'empty', value: null };
  }

  if (
    !args.enforceOptionLabels ||
    !SELECTOR_TYPES_REQUIRING_OPTIONS.has(args.definition.selectorType) ||
    args.definition.optionLabels.length === 0
  ) {
    return { reason: 'invalid_option', value: normalizeMultiValueDelimiter(value) };
  }

  const lookup = createOptionLookup(args.definition);

  if (args.definition.selectorType === 'checklist') {
    return {
      reason: 'invalid_option',
      value: normalizeChecklistCandidateValue({ lookup, value }),
    };
  }

  const canonical = lookup.get(value.trim().toLowerCase());
  return {
    reason: 'invalid_option',
    value: canonical ? normalizeMultiValueDelimiter(canonical) : null,
  };
};

const resolveUnknownGuardParameterId = (
  record: Record<string, unknown>,
  definitions: Map<string, ParameterDefinitionRecord>,
  allowUnknownParameterIds: boolean
): string | null => {
  const parameterId =
    normalizeNonEmptyString(record['parameterId']) ?? normalizeNonEmptyString(record['id']);

  if (!parameterId) {
    return null;
  }

  if (!definitions.has(parameterId) && !allowUnknownParameterIds) {
    return null;
  }

  return parameterId;
};

const collectAcceptedParameterInferenceCandidates = (args: {
  allowUnknownParameterIds: boolean;
  candidates: unknown[];
  definitions: Map<string, ParameterDefinitionRecord>;
  enforceOptionLabels: boolean;
}): {
  accepted: Array<{ parameterId: string; value: string }>;
  stats: ParameterInferenceCandidateStats;
} => {
  const accepted: Array<{ parameterId: string; value: string }> = [];
  const acceptedIds = new Set<string>();
  const stats = createInitialParameterInferenceCandidateStats();

  args.candidates.forEach((entry: unknown) => {
    const record = toRecord(entry);

    if (!record) {
      stats.invalidShapeCount += 1;
      return;
    }

    const parameterId = resolveUnknownGuardParameterId(
      record,
      args.definitions,
      args.allowUnknownParameterIds
    );

    if (!parameterId) {
      stats.unknownParameterIdCount += 1;
      return;
    }

    if (acceptedIds.has(parameterId)) {
      stats.duplicateCount += 1;
      return;
    }

    const definition = args.definitions.get(parameterId);
    const normalizedDefinitionValue = definition
      ? normalizeDefinitionCandidateValue({
          definition,
          enforceOptionLabels: args.enforceOptionLabels,
          rawValue: record['value'],
        })
      : null;
    const value =
      normalizedDefinitionValue?.value ??
      normalizeMultiValueDelimiter(resolveParameterValue(record['value']) ?? '');

    if (!value) {
      if (normalizedDefinitionValue?.reason === 'empty' || !definition) {
        stats.emptyValueCount += 1;
      } else {
        stats.invalidOptionCount += 1;
      }
      return;
    }

    accepted.push({ parameterId, value });
    acceptedIds.add(parameterId);
  });

  return { accepted, stats };
};

export const mergeLocalizedParameterUpdates = (args: {
  targetPath: string;
  updates: Record<string, unknown>;
  templateInputs: RuntimePortValues;
  languageCode: string;
  requireFullCoverage?: boolean;
}): {
  updates: Record<string, unknown>;
  applied: boolean;
  meta?: Record<string, unknown>;
} => {
  const targetPath = normalizeNonEmptyString(args.targetPath);
  const languageCode = normalizeNonEmptyString(args.languageCode)?.toLowerCase() ?? '';
  const requireFullCoverage = args.requireFullCoverage === true;
  if (!targetPath || !languageCode) {
    return { updates: args.updates, applied: false };
  }

  const rawCandidate = args.updates[targetPath];
  if (rawCandidate === undefined) {
    return { updates: args.updates, applied: false };
  }

  const translatedEntries = coerceParameterRecordArray(rawCandidate);
  const existingSource = resolveExistingParameterValueFromInputs(args.templateInputs, targetPath);
  const existingRecords = coerceParameterRecordArray(existingSource);
  const nextUpdates: Record<string, unknown> = { ...args.updates };

  if (existingRecords.length === 0) {
    delete nextUpdates[targetPath];
    return {
      updates: nextUpdates,
      applied: true,
      meta: {
        targetPath,
        languageCode,
        translatedCount: translatedEntries.length,
        existingCount: 0,
        mergedCount: 0,
        skippedCount: translatedEntries.length,
        writeCandidates: 0,
        skipped: {
          reason: 'missing_existing_parameters',
        },
      },
    };
  }

  const nextRecords = existingRecords.map((entry: Record<string, unknown>) => ({ ...entry }));
  const indexByParameterId = new Map<string, number>();
  const existingParameterIds = new Set<string>();
  existingRecords.forEach((entry: Record<string, unknown>, index: number) => {
    const parameterId =
      normalizeParameterId(entry['parameterId']) ??
      normalizeParameterId(entry['id']) ??
      normalizeParameterId(entry['_id']);
    if (!parameterId) return;
    indexByParameterId.set(parameterId, index);
    existingParameterIds.add(parameterId);
  });

  let mergedCount = 0;
  let unchangedCount = 0;
  let skippedUnknownCount = 0;
  let skippedEmptyCount = 0;
  let skippedInvalidCount = 0;
  const coveredExistingParameterIds = new Set<string>();

  translatedEntries.forEach((entry: Record<string, unknown>) => {
    const parameterId =
      normalizeParameterId(entry['parameterId']) ??
      normalizeParameterId(entry['id']) ??
      normalizeParameterId(entry['_id']);
    if (!parameterId) {
      skippedInvalidCount += 1;
      return;
    }

    const existingIndex = indexByParameterId.get(parameterId);
    if (existingIndex === undefined) {
      skippedUnknownCount += 1;
      return;
    }
    coveredExistingParameterIds.add(parameterId);

    const translatedValue = resolveTranslatedParameterValue(entry, languageCode);
    if (!translatedValue) {
      skippedEmptyCount += 1;
      return;
    }

    const current = nextRecords[existingIndex] ?? {};
    const currentValuesByLanguage = toRecord(current['valuesByLanguage']) ?? {};
    const currentLocalizedValue =
      resolveLocalizedValueByLanguage(currentValuesByLanguage, languageCode) ?? null;
    const currentDirectValue = resolveParameterValue(current['value']);

    if (currentLocalizedValue === translatedValue) {
      unchangedCount += 1;
      return;
    }

    const nextValuesByLanguage: Record<string, unknown> = {
      ...currentValuesByLanguage,
      [languageCode]: translatedValue,
    };

    nextRecords[existingIndex] = {
      ...current,
      ...(!currentDirectValue &&
      !resolveLocalizedValueByLanguage(currentValuesByLanguage, 'default') &&
      !resolveLocalizedValueByLanguage(currentValuesByLanguage, 'en')
        ? { value: translatedValue }
        : {}),
      valuesByLanguage: nextValuesByLanguage,
    };
    mergedCount += 1;
  });

  const coverage = {
    requiredCount: existingParameterIds.size,
    matchedCount: coveredExistingParameterIds.size,
    complete:
      existingParameterIds.size === 0 ||
      coveredExistingParameterIds.size >= existingParameterIds.size,
  };

  if (requireFullCoverage && coverage.complete === false) {
    delete nextUpdates[targetPath];
    return {
      updates: nextUpdates,
      applied: true,
      meta: {
        targetPath,
        languageCode,
        translatedCount: translatedEntries.length,
        existingCount: existingRecords.length,
        finalCount: existingRecords.length,
        mergedCount,
        unchangedCount,
        skippedCount: skippedUnknownCount + skippedEmptyCount + skippedInvalidCount,
        writeCandidates: 0,
        coverage,
        skipped: {
          reason: 'incomplete_coverage',
          unknownParameterIds: skippedUnknownCount,
          emptyValues: skippedEmptyCount,
          invalidEntries: skippedInvalidCount,
        },
      },
    };
  }

  const changed = !areParameterRecordArraysEqual(existingRecords, nextRecords);
  if (changed) {
    nextUpdates[targetPath] = nextRecords;
  } else {
    delete nextUpdates[targetPath];
  }

  return {
    updates: nextUpdates,
    applied: true,
    meta: {
      targetPath,
      languageCode,
      translatedCount: translatedEntries.length,
      existingCount: existingRecords.length,
      finalCount: nextRecords.length,
      mergedCount,
      unchangedCount,
      skippedCount: skippedUnknownCount + skippedEmptyCount + skippedInvalidCount,
      writeCandidates: changed ? nextRecords.length : 0,
      coverage,
      skipped: {
        unknownParameterIds: skippedUnknownCount,
        emptyValues: skippedEmptyCount,
        invalidEntries: skippedInvalidCount,
      },
    },
  };
};

export const materializeParameterInferenceUpdates = (args: {
  targetPath: string;
  updates: Record<string, unknown>;
  templateInputs: RuntimePortValues;
  definitionsPort: string;
  definitionsPath: string;
  languageCode?: string;
}): {
  updates: Record<string, unknown>;
  applied: boolean;
  meta?: Record<string, unknown>;
} => {
  if (!args.targetPath) return { updates: args.updates, applied: false };

  const inferred = normalizeParameterEntries(args.updates[args.targetPath], {
    allowEmptyValue: true,
  });
  const existingSource = resolveExistingParameterValueFromInputs(
    args.templateInputs,
    args.targetPath
  );
  const existing = normalizeParameterEntries(existingSource, {
    allowEmptyValue: true,
  });
  const definitions = normalizeParameterDefinitions(
    args.templateInputs[args.definitionsPort],
    args.definitionsPath
  );
  const hasTargetPathInput = Object.prototype.hasOwnProperty.call(args.updates, args.targetPath);
  const shouldApply =
    hasTargetPathInput || inferred.length > 0 || existing.length > 0 || definitions.size > 0;
  if (!shouldApply) {
    return { updates: args.updates, applied: false };
  }

  const baseRecords = existing.map((entry) => ({ ...entry.raw }));
  const nextRecords = existing.map((entry) => ({ ...entry.raw }));
  const indexByParameterId = new Map<string, number>();
  existing.forEach((entry, index) => {
    indexByParameterId.set(entry.parameterId, index);
  });
  const languageCode = resolveParameterInferenceLanguageCode(args.languageCode);

  let appendedMissingCount = 0;
  definitions.forEach((_definition: ParameterDefinitionRecord, parameterId: string) => {
    if (indexByParameterId.has(parameterId)) return;
    indexByParameterId.set(parameterId, nextRecords.length);
    nextRecords.push({
      parameterId,
      value: '',
    });
    appendedMissingCount += 1;
  });

  let filledBlankCount = 0;
  let filledLocalizedCount = 0;
  let preservedNonEmptyCount = 0;
  let appendedUnknownInferredCount = 0;
  inferred.forEach((entry) => {
    const existingIndex = indexByParameterId.get(entry.parameterId);
    if (existingIndex === undefined) {
      indexByParameterId.set(entry.parameterId, nextRecords.length);
      nextRecords.push(
        mergeInferredParameterValueRecord({
          current: {
            parameterId: entry.parameterId,
            value: '',
          },
          parameterId: entry.parameterId,
          inferredValue: entry.value,
          languageCode,
          allowScalarFill: true,
        }).next
      );
      appendedUnknownInferredCount += 1;
      return;
    }

    const current = nextRecords[existingIndex] ?? {};
    const currentValue = resolveParameterValue(current['value']);
    if (currentValue && !entry.value) {
      preservedNonEmptyCount += 1;
      return;
    }

    if (!entry.value && !currentValue) {
      return;
    }
    if (currentValue) {
      preservedNonEmptyCount += 1;
    }

    const mergeResult = mergeInferredParameterValueRecord({
      current,
      parameterId: entry.parameterId,
      inferredValue: entry.value,
      languageCode,
      allowScalarFill: !currentValue,
    });
    if (JSON.stringify(current) === JSON.stringify(mergeResult.next)) {
      return;
    }

    nextRecords[existingIndex] = mergeResult.next;
    if (mergeResult.filledScalar) {
      filledBlankCount += 1;
    }
    if (mergeResult.filledLocalized) {
      filledLocalizedCount += 1;
    }
  });

  const changed = !areParameterRecordArraysEqual(baseRecords, nextRecords);
  const nextUpdates: Record<string, unknown> = { ...args.updates };
  if (nextRecords.length > 0) {
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
      definitionsCount: definitions.size,
      finalCount: nextRecords.length,
      languageCode,
      changed,
      merged: {
        filledBlank: filledBlankCount,
        filledLocalized: filledLocalizedCount,
        preservedNonEmpty: preservedNonEmptyCount,
        appendedMissing: appendedMissingCount,
        appendedUnknownInferred: appendedUnknownInferredCount,
      },
      writeCandidates: changed ? nextRecords.length : 0,
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

  const targetPath = normalizeParameterInferenceTargetPath(args.dbConfig);
  if (targetPath !== 'parameters') {
    const nextUpdates: Record<string, unknown> = { ...args.updates };
    delete nextUpdates[targetPath];
    const errorMessage =
      'Parameter inference guard targetPath must use canonical "parameters" path.';
    return createBlockedParameterInferenceResult({
      targetPath,
      updates: nextUpdates,
      reason: 'unsupported_target_path',
      errorMessage,
    });
  }

  const rawCandidate = args.updates[targetPath];
  if (rawCandidate === undefined) {
    return { updates: args.updates, applied: false };
  }

  const definitionsPort = normalizeNonEmptyString(guard.definitionsPort) ?? 'result';
  const definitionsPath = normalizeNonEmptyString(guard.definitionsPath) ?? '';
  const definitions = normalizeParameterDefinitions(
    args.templateInputs[definitionsPort],
    definitionsPath
  );
  const allowUnknownParameterIds = Boolean(guard.allowUnknownParameterIds);
  const enforceOptionLabels = guard.enforceOptionLabels !== false;

  const { candidates, repaired: candidateRepairApplied } =
    coerceParameterInferenceCandidates(rawCandidate);

  if (definitions.size === 0 && !allowUnknownParameterIds) {
    const nextUpdates: Record<string, unknown> = { ...args.updates };
    delete nextUpdates[targetPath];
    const errorMessage = 'No parameter definitions resolved for parameter inference.';
    return createBlockedParameterInferenceResult({
      targetPath,
      definitionsPort,
      definitionsPath,
      candidates: candidates.length,
      definitions: 0,
      repairedCandidates: candidateRepairApplied,
      updates: nextUpdates,
      reason: 'missing_definitions',
      errorMessage,
    });
  }

  const { accepted, stats } = collectAcceptedParameterInferenceCandidates({
    allowUnknownParameterIds,
    candidates,
    definitions,
    enforceOptionLabels,
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
        unknownParameterId: stats.unknownParameterIdCount,
        invalidOption: stats.invalidOptionCount,
        emptyValue: stats.emptyValueCount,
        duplicate: stats.duplicateCount,
        invalidShape: stats.invalidShapeCount,
      },
    },
  };
};
