import {
  isPatternConfiguredForFormatterAutoApply,
  isPatternLocaleMatch,
  resolveFieldTargetAndLocale,
} from '@/features/products/validation-engine/core';
import type {
  FieldValidatorIssue,
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import {
  isPatternEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
} from '@/shared/lib/products/utils/validator-instance-behavior';

type AutoApplyIssueResult = {
  replacementFieldName: string;
  shouldAutoApply: boolean;
};

const hasAutoReplacementValue = (
  issue: FieldValidatorIssue
): issue is FieldValidatorIssue & { replacementValue: string } =>
  issue.replacementValue !== null && issue.replacementValue.trim().length > 0;

const hasPatternReplacementValue = (pattern: ProductValidationPattern): boolean =>
  pattern.replacementValue !== null && pattern.replacementValue.trim().length > 0;

const resolveAutoReplacementFieldName = ({
  fieldName,
  issue,
  pattern,
}: {
  fieldName: string;
  issue: FieldValidatorIssue;
  pattern: ProductValidationPattern | undefined;
}): string => {
  const replacementFields = pattern?.replacementFields ?? [];
  if (replacementFields.includes(fieldName)) return fieldName;
  if (issue.replacementActive && replacementFields.length === 1) {
    return replacementFields[0] ?? fieldName;
  }
  return fieldName;
};

const hasCrossFieldFormatterAutoApplyConfig = ({
  fieldName,
  pattern,
  validationInstanceScope,
}: {
  fieldName: string;
  pattern: ProductValidationPattern;
  validationInstanceScope: ProductValidationInstanceScope;
}): boolean => {
  const { target, locale } = resolveFieldTargetAndLocale(fieldName);
  if (target !== pattern.target) return false;
  if (!isPatternLocaleMatch(pattern.locale, locale)) return false;
  if (!pattern.enabled) return false;
  if (pattern.replacementAutoApply !== true) return false;
  if (!pattern.replacementEnabled || !hasPatternReplacementValue(pattern)) return false;
  if (!isPatternEnabledForValidationScope(pattern.appliesToScopes, validationInstanceScope)) {
    return false;
  }
  return isPatternReplacementEnabledForValidationScope(
    pattern.replacementAppliesToScopes,
    validationInstanceScope
  );
};

export const resolveAutoApplyIssue = ({
  fieldName,
  issue,
  pattern,
  validationInstanceScope,
}: {
  fieldName: string;
  issue: FieldValidatorIssue;
  pattern: ProductValidationPattern | undefined;
  validationInstanceScope: ProductValidationInstanceScope;
}): AutoApplyIssueResult => {
  const replacementFieldName = resolveAutoReplacementFieldName({ fieldName, issue, pattern });
  if (pattern === undefined) return { replacementFieldName, shouldAutoApply: false };
  if (!hasAutoReplacementValue(issue)) return { replacementFieldName, shouldAutoApply: false };
  const isDirectAutoApply = isPatternConfiguredForFormatterAutoApply({
    fieldName,
    pattern,
    validationScope: validationInstanceScope,
  });
  if (isDirectAutoApply) return { replacementFieldName, shouldAutoApply: true };
  return {
    replacementFieldName,
    shouldAutoApply:
      replacementFieldName !== fieldName &&
      hasCrossFieldFormatterAutoApplyConfig({ fieldName, pattern, validationInstanceScope }),
  };
};
