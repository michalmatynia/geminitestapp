import {
  allowsPatternExecutionWithoutRegexMatch,
  applyResolvedReplacement,
  normalizePatternChainMode,
  normalizePatternMaxExecutions,
  resolvePatternReplacementValue,
  shouldLaunchPattern,
} from '@/features/products/validation-engine/core';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { isPatternReplacementEnabledForValidationScope } from '@/shared/lib/products/utils/validator-instance-behavior';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type {
  FormatterRuntime,
  ReplacementPatternExecutionResult,
} from './ProductFormGeneralFormatter.types';

const testPatternMatch = (
  runtime: FormatterRuntime,
  pattern: ProductValidationPattern,
  candidateValue: string
): boolean => {
  const precompiled = runtime.compiledRegexByPatternId.get(pattern.id) ?? null;
  if (precompiled === null) return false;
  try {
    return precompiled.test(candidateValue);
  } catch (error) {
    logClientError(error);
    return false;
  }
};

const resolvePatternReplacement = (
  runtime: FormatterRuntime,
  pattern: ProductValidationPattern,
  candidateValue: string
): string | null => {
  try {
    const replacement = resolvePatternReplacementValue({
      pattern,
      fieldValue: candidateValue,
      values: runtime.currentValues,
      latestProductValues: runtime.latestProductValues,
    });
    const replacementEnabled = isPatternReplacementEnabledForValidationScope(
      pattern.replacementAppliesToScopes,
      runtime.validationInstanceScope
    );
    return applyResolvedReplacement({
      value: candidateValue,
      pattern,
      replacement: replacementEnabled ? replacement : null,
    });
  } catch (error) {
    logClientError(error);
    return null;
  }
};

const executeReplacementPatternOnce = (
  runtime: FormatterRuntime,
  pattern: ProductValidationPattern,
  candidateValue: string
): { value: string; matched: boolean; replaced: boolean; shouldStop: boolean } => {
  if (
    shouldLaunchPattern({
      pattern,
      validationScope: runtime.validationInstanceScope,
      fieldValue: candidateValue,
      values: runtime.currentValues,
      latestProductValues: runtime.latestProductValues,
    }) === false
  ) {
    return { value: candidateValue, matched: false, replaced: false, shouldStop: true };
  }
  const hasMatch = testPatternMatch(runtime, pattern, candidateValue);
  if (hasMatch === false && allowsPatternExecutionWithoutRegexMatch(pattern) === false) {
    return { value: candidateValue, matched: false, replaced: false, shouldStop: true };
  }
  const replacedValue = resolvePatternReplacement(runtime, pattern, candidateValue);
  if (replacedValue === null || replacedValue === candidateValue) {
    return { value: candidateValue, matched: true, replaced: false, shouldStop: true };
  }
  return { value: replacedValue, matched: true, replaced: true, shouldStop: false };
};

export const executeReplacementPattern = (
  runtime: FormatterRuntime,
  pattern: ProductValidationPattern,
  candidateValue: string
): ReplacementPatternExecutionResult => {
  let nextCandidateValue = candidateValue;
  let matched = false;
  let replaced = false;
  const maxExecutions = normalizePatternMaxExecutions(pattern);
  for (let execution = 0; execution < maxExecutions; execution += 1) {
    const result = executeReplacementPatternOnce(runtime, pattern, nextCandidateValue);
    matched = matched || result.matched;
    replaced = replaced || result.replaced;
    nextCandidateValue = result.value;
    if (result.shouldStop) break;
  }
  return { candidateValue: nextCandidateValue, matched, replaced };
};

export const shouldStopPatternChain = (
  pattern: ProductValidationPattern,
  result: ReplacementPatternExecutionResult
): boolean => {
  const chainMode = normalizePatternChainMode(pattern);
  if (result.matched && chainMode === 'stop_on_match') return true;
  if (result.replaced && chainMode === 'stop_on_replace') return true;
  return result.replaced && pattern.passOutputToNext === false;
};
