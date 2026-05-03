'use client';

import React, { memo, useCallback } from 'react';

import { applyValidatorFieldReplacement } from '@/features/products/lib/applyValidatorFieldReplacement';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useProductValidationActions } from '@/features/products/context/ProductValidationSettingsContext';
import {
  getIssueReplacementPreview,
  type FieldValidatorIssue,
} from '@/features/products/validation-engine/core';
import type { ProductFormData } from '@/shared/contracts/products/drafts';

import { ValidatorIssueHint } from './ValidatorIssueHint';

type CategoryIssueHintRowProps = {
  issue: FieldValidatorIssue;
  currentCategoryLabel: string;
  proposedCategoryLabel: string | null;
  selectedCategoryId: string | null;
  canApplyReplacement: boolean;
};

type ProducerIssueHintRowProps = {
  issue: FieldValidatorIssue;
  currentProducerLabel: string;
  proposedProducerLabel: string | null;
  selectedProducerIds: string[];
  canApplyReplacement: boolean;
};

const hasReplacementValue = (issue: FieldValidatorIssue): boolean =>
  typeof issue.replacementValue === 'string' && issue.replacementValue.trim() !== '';

export const CategoryIssueHintRow = memo(
  (props: CategoryIssueHintRowProps): React.JSX.Element => {
    const { issue, currentCategoryLabel, proposedCategoryLabel, selectedCategoryId } = props;
    const { categories, setCategoryId } = useProductFormMetadata();
    const { acceptIssue, denyIssue, getDenyActionLabel } = useProductValidationActions();
    const onReplace = useCallback((): void => {
      const currentValue = selectedCategoryId ?? '';
      const nextValue = getIssueReplacementPreview(currentValue, issue).trim();
      const applied = applyValidatorFieldReplacement({
        fieldName: 'categoryId',
        replacementValue: nextValue,
        categories,
        getCurrentFieldValue: (fieldName: keyof ProductFormData) =>
          fieldName === 'categoryId' ? selectedCategoryId ?? '' : '',
        setFormFieldValue: () => {},
        setCategoryId,
        setProducerIds: () => {},
      });
      if (applied === false) return;
      void acceptIssue({
        fieldName: 'categoryId',
        patternId: issue.patternId,
        postAcceptBehavior: issue.postAcceptBehavior,
        message: issue.message,
        replacementValue: issue.replacementValue,
      });
    }, [acceptIssue, categories, issue, selectedCategoryId, setCategoryId]);
    const onDeny = useCallback((): void => {
      void denyIssue({
        fieldName: 'categoryId',
        patternId: issue.patternId,
        message: issue.message,
        replacementValue: issue.replacementValue,
      });
    }, [denyIssue, issue.message, issue.patternId, issue.replacementValue]);

    return (
      <ValidatorIssueHint
        issue={issue}
        value={currentCategoryLabel}
        proposedValueOverride={proposedCategoryLabel}
        hideMatchSnippet
        onReplace={hasReplacementValue(issue) && props.canApplyReplacement ? onReplace : undefined}
        onDeny={onDeny}
        denyLabel={getDenyActionLabel(issue.patternId)}
      />
    );
  }
);

export const ProducerIssueHintRow = memo(
  (props: ProducerIssueHintRowProps): React.JSX.Element => {
    const { issue, currentProducerLabel, proposedProducerLabel, selectedProducerIds } = props;
    const { producers, setProducerIds } = useProductFormMetadata();
    const { acceptIssue, denyIssue, getDenyActionLabel } = useProductValidationActions();
    const onReplace = useCallback((): void => {
      const currentValue = currentProducerLabel === '(none)' ? '' : currentProducerLabel;
      const nextValue = getIssueReplacementPreview(currentValue, issue).trim();
      const applied = applyValidatorFieldReplacement({
        fieldName: 'producerIds',
        replacementValue: nextValue,
        producers,
        getCurrentFieldValue: (fieldName: keyof ProductFormData) =>
          fieldName === 'producerIds' ? selectedProducerIds : '',
        setFormFieldValue: () => {},
        setCategoryId: () => {},
        setProducerIds,
      });
      if (applied === false) return;
      void acceptIssue({
        fieldName: 'producerIds',
        patternId: issue.patternId,
        postAcceptBehavior: issue.postAcceptBehavior,
        message: issue.message,
        replacementValue: issue.replacementValue,
      });
    }, [acceptIssue, currentProducerLabel, issue, producers, selectedProducerIds, setProducerIds]);
    const onDeny = useCallback((): void => {
      void denyIssue({
        fieldName: 'producerIds',
        patternId: issue.patternId,
        message: issue.message,
        replacementValue: issue.replacementValue,
      });
    }, [denyIssue, issue.message, issue.patternId, issue.replacementValue]);

    return (
      <ValidatorIssueHint
        issue={issue}
        value={currentProducerLabel}
        proposedValueOverride={proposedProducerLabel}
        hideMatchSnippet
        onReplace={hasReplacementValue(issue) && props.canApplyReplacement ? onReplace : undefined}
        onDeny={onDeny}
        denyLabel={getDenyActionLabel(issue.patternId)}
      />
    );
  }
);
