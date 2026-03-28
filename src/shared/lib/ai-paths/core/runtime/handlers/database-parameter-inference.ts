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
    if (JSON.stringify(left[index]) !== JSON.stringify(right[index])) {
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

  const directLocalized =
    normalizeNonEmptyString(record[languageCode]) ??
    normalizeNonEmptyString(record[languageCode.toLowerCase()]) ??
    normalizeNonEmptyString(record[languageCode.toUpperCase()]);
  if (directLocalized) return directLocalized;

  return (
    resolveParameterValue(record['value']) ??
    resolveParameterValue(record['translatedValue']) ??
    null
  );
};

export const mergeTranslatedParameterUpdates = (args: {
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

  const targetPath = normalizeNonEmptyString(guard.targetPath) ?? 'parameters';
  if (targetPath !== 'parameters') {
    const nextUpdates: Record<string, unknown> = { ...args.updates };
    delete nextUpdates[targetPath];
    const errorMessage =
      'Parameter inference guard targetPath must use canonical "parameters" path.';
    return {
      updates: nextUpdates,
      applied: true,
      blocked: true,
      errorMessage,
      meta: {
        targetPath,
        blocked: {
          reason: 'unsupported_target_path',
          message: errorMessage,
        },
      },
    };
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
      normalizeNonEmptyString(record['parameterId']) ?? normalizeNonEmptyString(record['id']);
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
