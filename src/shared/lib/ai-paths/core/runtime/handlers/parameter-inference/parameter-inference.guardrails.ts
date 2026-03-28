'use client';

import type { DatabaseConfig } from '@/shared/contracts/ai-paths';
import {
  SELECTOR_TYPES_REQUIRING_OPTIONS,
  normalizeParameterDefinitions,
  parseChecklistValues,
  resolveObjectPathValue,
} from '../database-parameter-inference-utils';
import {
  coerceParameterRecordArray,
  normalizeParameterEntries,
} from './parameter-inference.normalizer';

export class ParameterInferenceGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParameterInferenceGateError';
  }
}

export const assertParameterInferenceGuardrails = (args: {
  databaseConfig: DatabaseConfig;
  definitionsValue: unknown;
  updates: Record<string, unknown>;
}): void => {
  const guard = args.databaseConfig.parameterInferenceGuard;
  if (!guard?.enabled) return;

  const definitionsPath = guard.definitionsPath ?? '';
  const definitions = normalizeParameterDefinitions(args.definitionsValue, definitionsPath);
  const targetPath = guard.targetPath ?? 'parameters';
  const updatesValue = resolveObjectPathValue(args.updates, targetPath);
  const updatedRecords = coerceParameterRecordArray(updatesValue);
  const normalizedUpdates = normalizeParameterEntries(updatedRecords, { allowEmptyValue: false });

  normalizedUpdates.forEach((update) => {
    const definition = definitions.get(update.parameterId);
    if (!definition) {
      if (guard.allowUnknownParameterIds === false) {
        throw new ParameterInferenceGateError(
          `Inferred parameter ID "${update.parameterId}" is not present in the allowed definitions list.`
        );
      }
      return;
    }

    if (guard.enforceOptionLabels !== false && SELECTOR_TYPES_REQUIRING_OPTIONS.has(definition.selectorType)) {
      const allowedLabels = new Set(
        definition.optionLabels.map((label) => label.trim().toLowerCase())
      );
      if (allowedLabels.size > 0) {
        const inferredValues =
          definition.selectorType === 'checklist'
            ? parseChecklistValues(update.value)
            : [update.value];

        inferredValues.forEach((val) => {
          if (!allowedLabels.has(val.trim().toLowerCase())) {
            throw new ParameterInferenceGateError(
              `Inferred value "${val}" for parameter "${update.parameterId}" is not among the allowed options: ${definition.optionLabels.join(', ')}.`
            );
          }
        });
      }
    }
  });
};
