'use client';

import { useCallback, useEffect } from 'react';

import type { ProductValidationDecisionsResult } from './validator/useProductValidationDecisions';
import {
  buildProductFormValidatorIssueDecisionKey,
  clearProductFormValidatorScopedIssueKeys,
  getProductFormValidatorDenyActionLabel,
} from './useProductFormValidator.helpers';
import type { ProductFormValidatorDecisionKeyBuilder } from './useProductFormValidator.types';
import type { ProductValidationInstanceScope } from '@/shared/contracts/products/validation';

type UseProductFormValidatorIssueStateArgs = Pick<
  ProductValidationDecisionsResult,
  | 'acceptedIssueKeys'
  | 'deniedIssueKeys'
  | 'effectiveValidationDenyBehavior'
  | 'getIssueDenyBehavior'
  | 'setAcceptedIssueKeys'
  | 'setDeniedIssueKeys'
> & {
  validationInstanceScope: ProductValidationInstanceScope;
  validationScopeKey: string;
};

export type ProductFormValidatorIssueState = {
  buildIssueDecisionKey: ProductFormValidatorDecisionKeyBuilder;
  denyActionLabel: 'Deny' | 'Mute';
  getDenyActionLabel: (patternId: string) => 'Deny' | 'Mute';
  isIssueAccepted: (fieldName: string, patternId: string) => boolean;
  isIssueDenied: (fieldName: string, patternId: string) => boolean;
};

export const useProductFormValidatorIssueState = ({
  acceptedIssueKeys,
  deniedIssueKeys,
  effectiveValidationDenyBehavior,
  getIssueDenyBehavior,
  setAcceptedIssueKeys,
  setDeniedIssueKeys,
  validationInstanceScope,
  validationScopeKey,
}: UseProductFormValidatorIssueStateArgs): ProductFormValidatorIssueState => {
  const buildIssueDecisionKey = useCallback(
    (fieldName: string, patternId: string): string =>
      buildProductFormValidatorIssueDecisionKey({ fieldName, patternId, validationScopeKey }),
    [validationScopeKey]
  );
  useEffect(() => {
    if (validationInstanceScope !== 'product_create' && validationInstanceScope !== 'draft_template') {
      return;
    }
    const scopePrefix = `${validationScopeKey}::`;
    setDeniedIssueKeys((prev) => clearProductFormValidatorScopedIssueKeys(prev, scopePrefix));
    setAcceptedIssueKeys((prev) => clearProductFormValidatorScopedIssueKeys(prev, scopePrefix));
  }, [setAcceptedIssueKeys, setDeniedIssueKeys, validationInstanceScope, validationScopeKey]);
  const getDenyActionLabel = useCallback(
    (patternId: string): 'Deny' | 'Mute' =>
      getProductFormValidatorDenyActionLabel(getIssueDenyBehavior(patternId)),
    [getIssueDenyBehavior]
  );
  const isIssueDenied = useCallback(
    (fieldName: string, patternId: string): boolean =>
      deniedIssueKeys.has(buildIssueDecisionKey(fieldName, patternId)),
    [buildIssueDecisionKey, deniedIssueKeys]
  );
  const isIssueAccepted = useCallback(
    (fieldName: string, patternId: string): boolean =>
      acceptedIssueKeys.has(buildIssueDecisionKey(fieldName, patternId)),
    [acceptedIssueKeys, buildIssueDecisionKey]
  );

  return {
    buildIssueDecisionKey,
    denyActionLabel: getProductFormValidatorDenyActionLabel(effectiveValidationDenyBehavior),
    getDenyActionLabel,
    isIssueAccepted,
    isIssueDenied,
  };
};
