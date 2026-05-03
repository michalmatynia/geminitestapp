import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import {
  isPatternLocaleMatch,
  isReplacementAllowedForField,
  resolveFieldTargetAndLocale,
  sortValidatorPatterns,
} from '@/features/products/validation-engine/core';

import type { ValidatorPatternSequenceTraceStep } from './validator-pattern-simulator.types';
import { runTracePattern } from './validator-pattern-simulator.sequence-execution';

type BuildSequenceTracePatternsArgs = {
  previewPattern: ProductValidationPattern;
  orderedPatterns: ProductValidationPattern[];
  editingPattern: ProductValidationPattern | null;
  fieldName: string;
};

type BuildSequenceTraceArgs = {
  tracePatterns: ProductValidationPattern[];
  previewPattern: ProductValidationPattern;
  fieldValue: string;
  validationScope: ProductValidationInstanceScope;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
};

export const buildSequenceTracePatterns = ({
  previewPattern,
  orderedPatterns,
  editingPattern,
  fieldName,
}: BuildSequenceTracePatternsArgs): ProductValidationPattern[] => {
  const groupId = previewPattern.sequenceGroupId?.trim() ?? '';
  if (groupId.length === 0) return [previewPattern];
  const { locale: fieldLocale } = resolveFieldTargetAndLocale(fieldName);
  const filtered = orderedPatterns.filter((pattern) => {
    const patternGroupId = pattern.sequenceGroupId?.trim() ?? '';
    if (patternGroupId !== groupId) return false;
    if (pattern.target !== previewPattern.target) return false;
    if (!isPatternLocaleMatch(pattern.locale ?? null, fieldLocale)) return false;
    return isReplacementAllowedForField(pattern, fieldName);
  });
  const withoutEdited =
    editingPattern === null ? filtered : filtered.filter((pattern) => pattern.id !== editingPattern.id);
  return sortValidatorPatterns([...withoutEdited, previewPattern]);
};

export const buildSequenceTrace = ({
  tracePatterns,
  previewPattern,
  fieldValue,
  validationScope,
  values,
  latestProductValues,
}: BuildSequenceTraceArgs): {
  steps: ValidatorPatternSequenceTraceStep[];
  finalValue: string;
} => {
  const steps: ValidatorPatternSequenceTraceStep[] = [];
  let candidateValue = fieldValue;
  for (const pattern of tracePatterns) {
    const result = runTracePattern({
      candidateValue,
      latestProductValues,
      pattern,
      previewPattern,
      validationScope,
      values,
    });
    candidateValue = result.candidateValue;
    steps.push(result.step);
    if (result.step.stopReason !== null) break;
  }
  return { finalValue: candidateValue, steps };
};
