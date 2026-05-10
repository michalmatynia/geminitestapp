import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  FieldValidatorIssue,
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import {
  isPatternReplacementEnabledForValidationScope,
  normalizeProductValidationSkipNoopReplacementProposal,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { isProductValidationSemanticOperationNoopReplacement } from '@/shared/lib/products/utils/validator-semantic-operations';
import { getProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-state';
import { resolveValidatorCategoryReplacementId } from '@/features/products/lib/resolveValidatorCategoryReplacement';

import {
  applyResolvedReplacement,
  resolvePatternReplacementValue,
} from './core-launch-replacement';
import { hasPatternReplacementValue } from './core-normalization';
import type { ResolvedReplacement, StaticPatternPlan } from './core-types';

export type PatternMatchContext = {
  matchIndex: number;
  matchText: string;
  length: number;
};

export type ReplacementContext = {
  hasEffectiveReplacement: boolean;
  isNoopReplacement: boolean;
  nextValue: string;
  replacement: NonNullable<ResolvedReplacement> | null;
  replacementActive: boolean;
  replacementScope: FieldValidatorIssue['replacementScope'];
  shouldSuppressNoopReplacementProposal: boolean;
  shouldSuppressUnresolvableCategoryProposal: boolean;
};

type ResolveReplacementContextArgs = {
  categories?: ReadonlyArray<ProductCategory>;
  candidateValue: string;
  fieldName: string;
  latestProductValues: Record<string, unknown> | null;
  pattern: ProductValidationPattern;
  plan: StaticPatternPlan;
  validationScope: ProductValidationInstanceScope;
  values: Record<string, unknown>;
};

const resolveReplacementScope = (
  hasReplacer: boolean,
  replacementFields: string[]
): FieldValidatorIssue['replacementScope'] => {
  if (!hasReplacer) return 'none';
  return replacementFields.length === 0 ? 'global' : 'field';
};

const hasResolvedReplacementValue = (
  replacement: ResolvedReplacement
): replacement is NonNullable<ResolvedReplacement> =>
  replacement !== null && replacement.value.length > 0;

const isReplacementActiveForField = ({
  fieldName,
  pattern,
  plan,
  replacementScope,
  validationScope,
}: {
  fieldName: string;
  pattern: ProductValidationPattern;
  plan: StaticPatternPlan;
  replacementScope: FieldValidatorIssue['replacementScope'];
  validationScope: ProductValidationInstanceScope;
}): boolean =>
  isPatternReplacementEnabledForValidationScope(
    pattern.replacementAppliesToScopes,
    validationScope
  ) &&
  (replacementScope === 'global' || plan.replacementFields.includes(fieldName));

const resolveActiveReplacement = ({
  candidateValue,
  latestProductValues,
  pattern,
  replacementActive,
  values,
}: {
  candidateValue: string;
  latestProductValues: Record<string, unknown> | null;
  pattern: ProductValidationPattern;
  replacementActive: boolean;
  values: Record<string, unknown>;
}): NonNullable<ResolvedReplacement> | null => {
  if (!replacementActive) return null;
  const resolvedReplacement = resolvePatternReplacementValue({
    pattern,
    fieldValue: candidateValue,
    values,
    latestProductValues,
  });
  return hasResolvedReplacementValue(resolvedReplacement) ? resolvedReplacement : null;
};

const isSemanticReplacementNoop = ({
  fieldName,
  pattern,
  replacement,
  values,
}: {
  fieldName: string;
  pattern: ProductValidationPattern;
  replacement: NonNullable<ResolvedReplacement> | null;
  values: Record<string, unknown>;
}): boolean =>
  replacement !== null &&
  isProductValidationSemanticOperationNoopReplacement({
    value: getProductValidationSemanticState(pattern)?.operation,
    context: { fieldName, values, replacementValue: replacement.value },
  });

const resolveNextValue = (
  candidateValue: string,
  pattern: ProductValidationPattern,
  replacement: NonNullable<ResolvedReplacement> | null,
  isSemanticNoopReplacement: boolean
): string => {
  if (replacement === null) return candidateValue;
  if (isSemanticNoopReplacement) return candidateValue;
  return applyResolvedReplacement({ value: candidateValue, pattern, replacement });
};

const shouldSuppressNoopReplacementProposal = (
  pattern: ProductValidationPattern,
  isSemanticNoopReplacement: boolean,
  isNoopReplacement: boolean
): boolean =>
  isSemanticNoopReplacement ||
  (normalizeProductValidationSkipNoopReplacementProposal(pattern.skipNoopReplacementProposal) &&
    isNoopReplacement);

const shouldSuppressCategoryProposal = ({
  categories,
  fieldName,
  replacement,
}: {
  categories?: ReadonlyArray<ProductCategory>;
  fieldName: string;
  replacement: NonNullable<ResolvedReplacement> | null;
}): boolean => {
  if (fieldName !== 'categoryId') return false;
  if (categories === undefined || categories.length === 0) return false;
  if (replacement === null) return false;
  return resolveValidatorCategoryReplacementId(replacement.value, [...categories]) === null;
};

export const resolveReplacementContext = ({
  categories,
  candidateValue,
  fieldName,
  latestProductValues,
  pattern,
  plan,
  validationScope,
  values,
}: ResolveReplacementContextArgs): ReplacementContext => {
  const hasReplacer = hasPatternReplacementValue(pattern);
  const replacementScope = resolveReplacementScope(hasReplacer, plan.replacementFields);
  const replacementActive =
    hasReplacer &&
    isReplacementActiveForField({ fieldName, pattern, plan, replacementScope, validationScope });
  const replacement = resolveActiveReplacement({
    candidateValue,
    latestProductValues,
    pattern,
    replacementActive,
    values,
  });
  const isSemanticNoopReplacement = isSemanticReplacementNoop({
    fieldName,
    pattern,
    replacement,
    values,
  });
  const nextValue = resolveNextValue(
    candidateValue,
    pattern,
    replacement,
    isSemanticNoopReplacement
  );
  const isNoopReplacement =
    replacement !== null && (isSemanticNoopReplacement || nextValue === candidateValue);
  return {
    hasEffectiveReplacement: replacement !== null,
    isNoopReplacement,
    nextValue,
    replacement,
    replacementActive,
    replacementScope,
    shouldSuppressNoopReplacementProposal: shouldSuppressNoopReplacementProposal(
      pattern,
      isSemanticNoopReplacement,
      isNoopReplacement
    ),
    shouldSuppressUnresolvableCategoryProposal: shouldSuppressCategoryProposal({
      categories,
      fieldName,
      replacement,
    }),
  };
};

export const shouldEmitIssue = (
  plan: StaticPatternPlan,
  replacement: ReplacementContext
): boolean =>
  !plan.inSequenceGroup &&
  !replacement.shouldSuppressNoopReplacementProposal &&
  !replacement.shouldSuppressUnresolvableCategoryProposal;

export const createFieldIssue = ({
  match,
  plan,
  replacement,
}: {
  match: PatternMatchContext;
  plan: StaticPatternPlan;
  replacement: ReplacementContext;
}): FieldValidatorIssue => ({
  patternId: plan.pattern.id,
  message: plan.pattern.message,
  severity: plan.pattern.severity,
  matchText: match.matchText,
  index: match.matchIndex,
  length: match.length,
  regex: plan.pattern.regex,
  flags: plan.pattern.flags ?? null,
  replacementValue: replacement.replacement?.value ?? null,
  replacementApplyMode: replacement.replacement?.applyMode ?? 'replace_matched_segment',
  replacementScope: replacement.replacementScope,
  replacementActive: replacement.replacementActive && replacement.hasEffectiveReplacement,
  postAcceptBehavior: plan.postAcceptBehavior,
  debounceMs: plan.debounceMs,
});
