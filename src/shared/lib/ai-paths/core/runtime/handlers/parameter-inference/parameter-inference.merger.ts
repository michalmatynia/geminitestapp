import type { RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';
import {
  coerceArrayLike,
  normalizeNonEmptyString,
  resolveObjectPathValue,
  resolveParameterValue,
  toRecord,
} from '../database-parameter-inference-utils';
import { coerceInput } from '@/shared/lib/ai-paths/core/utils/runtime';
import { normalizeParameterEntries } from './parameter-inference.normalizer';
import { stableStringify } from '@/shared/utils/stable-stringify';

const DEFAULT_PARAMETER_INFERENCE_LANGUAGE_CODE = 'en';

export const resolveExistingParameterValueFromInputs = (
  templateInputs: RuntimePortValues,
  targetPath: string,
  options: { includeDerivedPorts?: boolean } = {}
): unknown => {
  const includeDerivedPorts = options.includeDerivedPorts !== false;
  const candidates: unknown[] = [];
  const entityLikeKeys = ['entity', 'entityJson', 'product', 'item', 'data', 'current'];
  const pushFromRecord = (value: unknown, nestedKeys: string[] = entityLikeKeys): void => {
    const record = toRecord(value);
    if (!record) return;
    candidates.push(resolveObjectPathValue(record, targetPath));
    nestedKeys.forEach((key: string) => {
      candidates.push(resolveObjectPathValue(toRecord(record[key]), targetPath));
    });
  };
  pushFromRecord(coerceInput(templateInputs['context']));
  pushFromRecord(coerceInput(templateInputs['bundle']));
  pushFromRecord(templateInputs);
  if (includeDerivedPorts) {
    pushFromRecord(coerceInput(templateInputs['value']));
    pushFromRecord(coerceInput(templateInputs['result']));
  }
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
  languageCode?: string;
}): {
  updates: Record<string, unknown>;
  applied: boolean;
  meta?: Record<string, unknown>;
} => {
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
  const languageCode = resolveParameterInferenceLanguageCode(args.languageCode);

  let filledBlankCount = 0;
  let filledLocalizedCount = 0;
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
    if (currentValue && !entry.value) {
      preservedNonEmptyCount += 1;
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
    if (stableStringify(current) === stableStringify(mergeResult.next)) {
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

  const nextUpdates: Record<string, unknown> = { ...args.updates };
  const changed = !areParameterRecordArraysEqual(
    existing.map((entry) => entry.raw),
    nextRecords
  );
  if (changed) {
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
      languageCode,
      merged: {
        filledBlank: filledBlankCount,
        filledLocalized: filledLocalizedCount,
        preservedNonEmpty: preservedNonEmptyCount,
        skippedNotExisting: skippedNotExistingCount,
      },
      writeCandidates: changed ? nextRecords.length : 0,
    },
  };
};

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
  const next = { ...args.current };
  let filledScalar = false;
  let filledLocalized = false;

  if (args.allowScalarFill) {
    next['value'] = args.inferredValue;
    filledScalar = true;
  }

  const valuesByLanguage = toRecord(next['valuesByLanguage']) ?? {};
  const currentLocalized = resolveLocalizedValueByLanguage(valuesByLanguage, args.languageCode);
  if (!currentLocalized) {
    next['valuesByLanguage'] = {
      ...valuesByLanguage,
      [args.languageCode]: args.inferredValue,
    };
    filledLocalized = true;
  }

  return { next, filledScalar, filledLocalized };
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
