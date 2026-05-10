import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationTarget,
} from '@/shared/contracts/products/validation';
import { isPatternEnabledForValidationScope } from '@/shared/lib/products/utils/validator-instance-behavior';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { shouldLaunchPattern } from './core-launch-replacement';
import {
  isRuntimePatternEnabled,
  normalizePatternMaxExecutions,
  sortValidatorPatterns,
} from './core-normalization';
import type { ProductValidationPatternRegexMatch } from './core-types';

const normalizeRegexMatchGroups = (
  groups: Record<string, string> | undefined
): Record<string, string> => (groups === undefined ? {} : { ...groups });

const shouldCollectPatternMatch = ({
  pattern,
  target,
  validationScope,
}: {
  pattern: ProductValidationPattern;
  target?: ProductValidationTarget | undefined;
  validationScope: ProductValidationInstanceScope;
}): boolean => {
  if (pattern.enabled !== true) return false;
  if (target !== undefined && pattern.target !== target) return false;
  if (isRuntimePatternEnabled(pattern)) return false;
  return isPatternEnabledForValidationScope(pattern.appliesToScopes, validationScope);
};

const shouldRunPatternAgainstValue = ({
  value,
  pattern,
  validationScope,
}: {
  value: string;
  pattern: ProductValidationPattern;
  validationScope: ProductValidationInstanceScope;
}): boolean =>
  shouldLaunchPattern({
    pattern,
    validationScope,
    fieldValue: value,
    values: {},
    latestProductValues: null,
  });

export const compileValidationPatternRegex = (
  pattern: ProductValidationPattern
): RegExp | null => {
  try {
    return new RegExp(pattern.regex, pattern.flags ?? undefined);
  } catch (error) {
    logClientError(error);
    return null;
  }
};

const toValidationPatternRegexMatch = (
  pattern: ProductValidationPattern,
  match: RegExpExecArray
): ProductValidationPatternRegexMatch => {
  const matchText = match[0];
  return {
    pattern,
    patternId: pattern.id,
    matchText,
    index: match.index,
    length: matchText.length,
    captures: Array.from(match).slice(1),
    groups: normalizeRegexMatchGroups(match.groups),
  };
};

const collectCompiledRegexMatches = ({
  value,
  pattern,
  regex,
  maxMatches,
}: {
  value: string;
  pattern: ProductValidationPattern;
  regex: RegExp;
  maxMatches: number;
}): ProductValidationPatternRegexMatch[] => {
  const matches: ProductValidationPatternRegexMatch[] = [];
  const runtimeRegex = regex;
  const canIterate = runtimeRegex.global || runtimeRegex.sticky;
  let match: RegExpExecArray | null = null;
  do {
    match = runtimeRegex.exec(value);
    if (match === null) break;
    const nextMatch = toValidationPatternRegexMatch(pattern, match);
    matches.push(nextMatch);
    if (!canIterate) break;
    if (nextMatch.matchText.length === 0) runtimeRegex.lastIndex += 1;
  } while (matches.length < maxMatches);
  return matches;
};

const collectMatchesForPattern = ({
  value,
  pattern,
  validationScope,
  maxMatches,
}: {
  value: string;
  pattern: ProductValidationPattern;
  validationScope: ProductValidationInstanceScope;
  maxMatches: number;
}): ProductValidationPatternRegexMatch[] => {
  if (!shouldRunPatternAgainstValue({ value, pattern, validationScope })) return [];
  const regex = compileValidationPatternRegex(pattern);
  if (regex === null) return [];
  return collectCompiledRegexMatches({ value, pattern, regex, maxMatches });
};

const resolveMaxMatches = (
  pattern: ProductValidationPattern,
  maxMatchesPerPattern: number | undefined
): number => {
  if (typeof maxMatchesPerPattern === 'number' && Number.isFinite(maxMatchesPerPattern)) {
    return Math.max(1, Math.floor(maxMatchesPerPattern));
  }
  return normalizePatternMaxExecutions(pattern);
};

export const collectValidationPatternRegexMatches = ({
  value,
  patterns,
  validationScope = 'product_create',
  target,
  maxMatchesPerPattern,
}: {
  value: string;
  patterns: ProductValidationPattern[];
  validationScope?: ProductValidationInstanceScope;
  target?: ProductValidationTarget;
  maxMatchesPerPattern?: number;
}): ProductValidationPatternRegexMatch[] => {
  if (value.length === 0 || patterns.length === 0) return [];
  return sortValidatorPatterns(patterns).flatMap((pattern) => {
    if (!shouldCollectPatternMatch({ pattern, target, validationScope })) return [];
    return collectMatchesForPattern({
      value,
      pattern,
      validationScope,
      maxMatches: resolveMaxMatches(pattern, maxMatchesPerPattern),
    });
  });
};
