import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationTarget,
} from '@/shared/contracts/products/validation';
import { isPatternEnabledForValidationScope } from '@/shared/lib/products/utils/validator-instance-behavior';

import {
  allowsPatternExecutionWithoutRegexMatch,
  isPatternHiddenFromFieldValidation,
  isPatternInSequenceGroup,
  normalizePatternChainMode,
  normalizePatternMaxExecutions,
  normalizePostAcceptBehavior,
  normalizeReplacementFields,
  normalizeValidationDebounceMs,
} from './core-normalization';
import type { StaticPatternPlan } from './core-types';

const shouldUseStaticPatternPlan = (
  pattern: ProductValidationPattern,
  validationScope: ProductValidationInstanceScope
): boolean => {
  if (pattern.enabled !== true) return false;
  if (isPatternHiddenFromFieldValidation(pattern)) return false;
  if (!isPatternEnabledForValidationScope(pattern.appliesToScopes, validationScope)) return false;
  return pattern.runtimeEnabled !== true || pattern.runtimeType === 'none';
};

const buildStaticPatternPlan = (
  pattern: ProductValidationPattern,
  sequenceGroupCounts: Map<string, number>
): StaticPatternPlan => {
  const inSequenceGroup = isPatternInSequenceGroup(pattern, sequenceGroupCounts);
  const sequenceGroupId = pattern.sequenceGroupId?.trim() ?? '';
  return {
    pattern,
    replacementFields: normalizeReplacementFields(pattern.replacementFields),
    debounceMs: normalizeValidationDebounceMs(pattern.validationDebounceMs),
    postAcceptBehavior: normalizePostAcceptBehavior(pattern.postAcceptBehavior),
    maxExecutions: normalizePatternMaxExecutions(pattern),
    chainMode: normalizePatternChainMode(pattern),
    inSequenceGroup,
    sequenceGroupId: inSequenceGroup && sequenceGroupId.length > 0 ? sequenceGroupId : null,
    allowWithoutRegexMatch: allowsPatternExecutionWithoutRegexMatch(pattern),
  };
};

export const buildStaticPatternPlans = ({
  orderedPatterns,
  validationScope,
  sequenceGroupCounts,
}: {
  orderedPatterns: ProductValidationPattern[];
  validationScope: ProductValidationInstanceScope;
  sequenceGroupCounts: Map<string, number>;
}): Map<ProductValidationTarget, StaticPatternPlan[]> => {
  const byTarget = new Map<ProductValidationTarget, StaticPatternPlan[]>();
  for (const pattern of orderedPatterns) {
    if (!shouldUseStaticPatternPlan(pattern, validationScope)) continue;
    const nextPlan = buildStaticPatternPlan(pattern, sequenceGroupCounts);
    byTarget.set(pattern.target, [...(byTarget.get(pattern.target) ?? []), nextPlan]);
  }
  return byTarget;
};
