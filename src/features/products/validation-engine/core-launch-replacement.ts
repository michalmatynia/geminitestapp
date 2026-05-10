import type {
  FieldValidatorIssue,
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import {
  isPatternLaunchEnabledForValidationScope,
  normalizeProductValidationLaunchScopeBehavior,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import {
  evaluateDynamicReplacementRecipe,
  evaluateStringCondition,
  parseDynamicReplacementRecipe,
} from '@/shared/lib/products/utils/validator-replacement-recipe';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { hasPatternReplacementValue } from './core-normalization';
import type { ResolvedReplacement } from './core-types';

type ResolvePatternLaunchSourceValueArgs = {
  pattern: ProductValidationPattern;
  fieldValue: string;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const readPatternLaunchSourceRawValue = (
  args: ResolvePatternLaunchSourceValueArgs
): unknown => {
  if (args.pattern.launchEnabled !== true) return args.fieldValue;
  const sourceField = args.pattern.launchSourceField ?? '';
  const sourceReaders = {
    current_field: (): unknown => args.fieldValue,
    form_field: (): unknown => args.values[sourceField],
    latest_product_field: (): unknown => args.latestProductValues?.[sourceField],
  } as const;
  return sourceReaders[args.pattern.launchSourceMode]();
};

export const resolvePatternLaunchSourceValue = ({
  pattern,
  fieldValue,
  values,
  latestProductValues,
}: ResolvePatternLaunchSourceValueArgs): string =>
  toStringValue(
    readPatternLaunchSourceRawValue({
      pattern,
      fieldValue,
      values,
      latestProductValues,
    })
  ) ?? '';

const hasMissingExternalLaunchSource = (pattern: ProductValidationPattern): boolean => {
  if (pattern.launchSourceMode === 'current_field') return false;
  return (pattern.launchSourceField?.trim() ?? '').length === 0;
};

export const shouldLaunchPattern = ({
  pattern,
  validationScope,
  fieldValue,
  values,
  latestProductValues,
}: {
  pattern: ProductValidationPattern;
  validationScope: ProductValidationInstanceScope;
  fieldValue: string;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
}): boolean => {
  if (pattern.launchEnabled !== true) return true;
  if (!isPatternLaunchEnabledForValidationScope(pattern.launchAppliesToScopes, validationScope)) {
    return normalizeProductValidationLaunchScopeBehavior(pattern.launchScopeBehavior) === 'condition_only';
  }
  if (hasMissingExternalLaunchSource(pattern)) return false;
  return evaluateStringCondition({
    operator: pattern.launchOperator,
    value: resolvePatternLaunchSourceValue({ pattern, fieldValue, values, latestProductValues }),
    operand: pattern.launchValue ?? null,
    flags: pattern.launchFlags ?? null,
  });
};

export const resolvePatternReplacementValue = ({
  pattern,
  fieldValue,
  values,
  latestProductValues,
}: {
  pattern: ProductValidationPattern;
  fieldValue: string;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
}): ResolvedReplacement => {
  if (!hasPatternReplacementValue(pattern)) return null;
  const replacementValue = pattern.replacementValue ?? '';
  const recipe = parseDynamicReplacementRecipe(replacementValue);
  if (recipe === null) {
    return {
      value: replacementValue,
      kind: 'static',
      applyMode: 'replace_matched_segment',
    };
  }
  const evaluated = evaluateDynamicReplacementRecipe(recipe, {
    pattern,
    fieldValue,
    formValues: values,
    latestProductValues,
  });
  if (evaluated === null || evaluated.length === 0) return null;
  return { value: evaluated, kind: 'dynamic', applyMode: 'replace_whole_field' };
};

const buildStaticReplacementFlags = (pattern: ProductValidationPattern): string | undefined => {
  const flags = pattern.flags ?? '';
  if (flags.includes('g')) return pattern.flags ?? undefined;
  return `${flags}g`;
};

const buildReplacementFlags = (
  pattern: ProductValidationPattern,
  replacement: NonNullable<ResolvedReplacement>
): string | undefined =>
  replacement.kind === 'static' ? buildStaticReplacementFlags(pattern) : pattern.flags ?? undefined;

export const applyResolvedReplacement = ({
  value,
  pattern,
  replacement,
}: {
  value: string;
  pattern: ProductValidationPattern;
  replacement: ResolvedReplacement;
}): string => {
  if (replacement === null || replacement.value.length === 0) return value;
  if (replacement.applyMode === 'replace_whole_field') return replacement.value;
  try {
    const regex = new RegExp(pattern.regex, buildReplacementFlags(pattern, replacement));
    return value.replace(regex, (match: string) =>
      match === replacement.value ? match : replacement.value
    );
  } catch (error) {
    logClientError(error);
    return value;
  }
};

const firstDiffFallback = (value: string, index = 0): string => {
  const fallback = value.slice(index, index + 1);
  return fallback.length > 0 ? fallback : ' ';
};

const findCommonPrefixLength = (before: string, after: string): number => {
  let start = 0;
  const sharedLength = Math.min(before.length, after.length);
  while (start < sharedLength && before[start] === after[start]) {
    start += 1;
  }
  return start;
};

const findCommonSuffixBoundary = ({
  after,
  before,
  start,
}: {
  after: string;
  before: string;
  start: number;
}): { endAfter: number; endBefore: number } => {
  let endBefore = before.length - 1;
  let endAfter = after.length - 1;
  while (endBefore >= start && endAfter >= start && before[endBefore] === after[endAfter]) {
    endBefore -= 1;
    endAfter -= 1;
  }
  return { endAfter, endBefore };
};

export const deriveDiffSegment = (
  before: string,
  after: string
): { index: number; length: number; matchText: string } => {
  if (before === after) {
    return { index: 0, length: 1, matchText: firstDiffFallback(before) };
  }
  const start = findCommonPrefixLength(before, after);
  const { endBefore } = findCommonSuffixBoundary({ after, before, start });
  const removed = before.slice(start, endBefore + 1);
  return {
    index: start,
    length: Math.max(1, removed.length),
    matchText: removed.length > 0 ? removed : firstDiffFallback(before, start),
  };
};

const canApplyIssueReplacementPreview = ({
  regex,
  replacementValue,
  value,
}: {
  regex: RegExp;
  replacementValue: string;
  value: string;
}): boolean => {
  const probe = regex.exec(value);
  return probe !== null && probe[0] !== replacementValue;
};

export const getIssueReplacementPreview = (
  value: string,
  issue: FieldValidatorIssue
): string => {
  const replacementValue = issue.replacementValue;
  if (replacementValue === null || replacementValue.length === 0) return value;
  if (issue.replacementApplyMode === 'replace_whole_field') return replacementValue;
  try {
    const regex = new RegExp(issue.regex, issue.flags ?? undefined);
    if (!canApplyIssueReplacementPreview({ regex, replacementValue, value })) return value;
    return value.replace(new RegExp(issue.regex, issue.flags ?? undefined), replacementValue);
  } catch (error) {
    logClientError(error);
    return value;
  }
};
