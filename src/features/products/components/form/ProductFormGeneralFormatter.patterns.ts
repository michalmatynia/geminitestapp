import {
  allowsPatternExecutionWithoutRegexMatch,
  buildSequenceGroupCounts,
  isPatternConfiguredForFormatterAutoApply,
  isRuntimePatternEnabled,
  sortValidatorPatterns,
} from '@/features/products/validation-engine/core';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type {
  CompiledProductValidationPattern,
  FormatterRuntime,
  ProductFormGeneralFormatterInput,
} from './ProductFormGeneralFormatter.types';

export const compileProductValidationPattern = (
  pattern: ProductValidationPattern
): CompiledProductValidationPattern => {
  try {
    return {
      pattern,
      compiledRegex: new RegExp(pattern.regex, pattern.flags ?? undefined),
    };
  } catch (error) {
    logClientError(error);
    return { pattern, compiledRegex: null };
  }
};

export const buildFormatterInputSignature = (
  input: ProductFormGeneralFormatterInput
): string => {
  const values = input.watchedValues;
  return JSON.stringify([
    input.validationInstanceScope,
    values.nameEn,
    values.namePl,
    values.nameDe,
    values.descEn,
    values.descPl,
    values.descDe,
    values.sku,
    values.price,
    values.stock,
    values.weight,
    values.sizeLength,
    values.sizeWidth,
    values.fieldLength,
    values.supplierName,
    values.supplierLink,
    values.priceComment,
  ]);
};

export const coerceFormatterRawValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

export const buildCompiledRegexByPatternId = (
  compiledPatterns: CompiledProductValidationPattern[]
): Map<string, RegExp | null> =>
  new Map(compiledPatterns.map((compiled) => [compiled.pattern.id, compiled.compiledRegex]));

export const buildFormatterRuntime = (
  input: ProductFormGeneralFormatterInput
): FormatterRuntime => {
  const orderedPatterns = sortValidatorPatterns(
    input.compiledPatterns.map((compiled) => compiled.pattern)
  );
  const sequenceGroupDebounceRef = input.sequenceGroupDebounceRef;
  return {
    currentValues: input.getValues() as Record<string, unknown>,
    latestProductValues: input.latestProductValues,
    validationInstanceScope: input.validationInstanceScope,
    orderedPatterns,
    sequenceGroupCounts: buildSequenceGroupCounts(orderedPatterns),
    compiledRegexByPatternId: buildCompiledRegexByPatternId(input.compiledPatterns),
    focusedFieldName: input.focusedFieldName,
    sequenceGroupDebounceRef: input.sequenceGroupDebounceRef,
    formatterLoopGuardRef: input.formatterLoopGuardRef,
    readSequenceGroupDebounce: (key: string): number =>
      sequenceGroupDebounceRef.current[key] ?? 0,
    setSequenceGroupDebounce: (key: string, value: number): void => {
      sequenceGroupDebounceRef.current[key] = value;
    },
  };
};

export const resolveReplacementPatterns = (
  runtime: FormatterRuntime,
  fieldName: string
): ProductValidationPattern[] =>
  runtime.orderedPatterns.filter((pattern) => {
    if (isRuntimePatternEnabled(pattern)) return false;
    return isPatternConfiguredForFormatterAutoApply({
      pattern,
      fieldName,
      validationScope: runtime.validationInstanceScope,
    });
  });

export const shouldProcessReplacementPatterns = (
  rawValue: string,
  replacementPatterns: ProductValidationPattern[]
): boolean => {
  if (replacementPatterns.length === 0) return false;
  if (rawValue !== '') return true;
  const hasExternalLaunchSource = replacementPatterns.some(
    (pattern) => pattern.launchEnabled && pattern.launchSourceMode !== 'current_field'
  );
  const hasRegexOptionalExecutionBehavior = replacementPatterns.some((pattern) =>
    allowsPatternExecutionWithoutRegexMatch(pattern)
  );
  return hasExternalLaunchSource || hasRegexOptionalExecutionBehavior;
};

export const patternNeedsLatestProductSource = (pattern: ProductValidationPattern): boolean => {
  const dynamicRecipe = parseDynamicReplacementRecipe(pattern.replacementValue);
  return (
    dynamicRecipe?.sourceMode === 'latest_product_field' ||
    (pattern.launchEnabled && pattern.launchSourceMode === 'latest_product_field')
  );
};
