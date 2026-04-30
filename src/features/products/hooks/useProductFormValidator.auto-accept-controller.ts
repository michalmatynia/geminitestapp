'use client';

import { useMemo } from 'react';

import type { ProductValidationDecisionsResult } from './validator/useProductValidationDecisions';
import { useProductFormValidatorAutoAccept } from './useProductFormValidator.auto-accept';
import type { ProductFormValidatorContextState } from './useProductFormValidator.context';
import type { ProductFormValidatorDecisionActions } from './useProductFormValidator.decision-actions';
import type { ProductFormValidatorIdentityState } from './useProductFormValidator.identity';
import type { ProductFormValidatorIssueState } from './useProductFormValidator.issue-state';
import type { ProductFormValidatorReplacements } from './useProductFormValidator.replacements';
import type { ProductValidatorFieldIssues } from './useProductValidatorIssues.types';

type UseProductFormValidatorAutoAcceptControllerArgs = {
  context: ProductFormValidatorContextState;
  decisionActions: ProductFormValidatorDecisionActions;
  decisions: ProductValidationDecisionsResult;
  identity: ProductFormValidatorIdentityState;
  issueState: ProductFormValidatorIssueState;
  replacements: ProductFormValidatorReplacements;
  visibleFieldIssues: ProductValidatorFieldIssues;
};

export const useProductFormValidatorAutoAcceptController = ({
  context,
  decisions,
  identity,
  issueState,
  replacements,
  visibleFieldIssues,
}: UseProductFormValidatorAutoAcceptControllerArgs): void => {
  const validatorPatternById = useMemo(
    () => new Map(context.validatorPatterns.map((pattern) => [pattern.id, pattern])),
    [context.validatorPatterns]
  );
  useProductFormValidatorAutoAccept({
    ...identity,
    ...replacements,
    buildIssueDecisionKey: issueState.buildIssueDecisionKey,
    draftId: context.draftId,
    formatterEnabled: context.settings.formatterEnabled,
    productId: context.productId,
    setAcceptedIssueKeys: decisions.setAcceptedIssueKeys,
    validationSessionId: decisions.validationSessionId,
    validatorEnabled: context.settings.validatorEnabled,
    validatorPatternById,
    visibleFieldIssues,
  });
};
