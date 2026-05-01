'use client';

import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

import {
  useProductValidationActions,
  useProductValidationState,
} from '@/features/products/context/ProductValidationSettingsContext';
import { applyValidatorFieldReplacement } from '@/features/products/lib/applyValidatorFieldReplacement';
import {
  getIssueReplacementPreview,
  type FieldValidatorIssue,
} from '@/features/products/validation-engine/core';
import type { ProductFormData } from '@/shared/contracts/products/drafts';

const resolveIssueReplacementFieldName = ({
  fieldName,
  issue,
  replacementFields,
}: {
  fieldName: string;
  issue: FieldValidatorIssue;
  replacementFields: string[];
}): string => {
  if (replacementFields.includes(fieldName)) return fieldName;
  if (issue.replacementActive && replacementFields.length === 1) return replacementFields[0] ?? fieldName;
  return fieldName;
};

export const useIssueReplacementFieldName = (
  fieldName: string,
  issue: FieldValidatorIssue
): string => {
  const { validatorPatterns } = useProductValidationState();
  const pattern = validatorPatterns.find((entry) => entry.id === issue.patternId);
  return resolveIssueReplacementFieldName({
    fieldName,
    issue,
    replacementFields: pattern?.replacementFields ?? [],
  });
};

export const useIssueReplaceHandler = ({
  fieldName,
  issue,
  replacementFieldName,
}: {
  fieldName: string;
  issue: FieldValidatorIssue;
  replacementFieldName: string;
}): (() => void) => {
  const { getValues, setValue } = useFormContext<ProductFormData>();
  const { acceptIssue } = useProductValidationActions();
  return useCallback((): void => {
    const currentValue =
      (getValues(replacementFieldName as keyof ProductFormData) as string | number | undefined) ??
      '';
    const nextValue = getIssueReplacementPreview(String(currentValue), issue);
    const applied = applyValidatorFieldReplacement({
      fieldName: replacementFieldName,
      replacementValue: nextValue,
      getCurrentFieldValue: (nextFieldName: keyof ProductFormData) => getValues(nextFieldName),
      setFormFieldValue: (nextFieldName, nextFieldValue) => {
        setValue(nextFieldName, nextFieldValue, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      setCategoryId: () => {},
      setProducerIds: () => {},
    });
    if (!applied) return;
    void acceptIssue({
      fieldName,
      patternId: issue.patternId,
      postAcceptBehavior: issue.postAcceptBehavior,
      message: issue.message,
      replacementValue: issue.replacementValue,
    });
  }, [acceptIssue, fieldName, getValues, issue, replacementFieldName, setValue]);
};

export const useIssueDenyHandler = ({
  fieldName,
  issue,
}: {
  fieldName: string;
  issue: FieldValidatorIssue;
}): (() => void) => {
  const { denyIssue } = useProductValidationActions();
  return useCallback((): void => {
    void denyIssue({
      fieldName,
      patternId: issue.patternId,
      message: issue.message,
      replacementValue: issue.replacementValue,
    });
  }, [denyIssue, fieldName, issue.message, issue.patternId, issue.replacementValue]);
};
