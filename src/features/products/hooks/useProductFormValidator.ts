'use client';

import { useProductValidationDecisions } from './validator/useProductValidationDecisions';
import { useProductFormValidatorAutoAcceptController } from './useProductFormValidator.auto-accept-controller';
import { useProductFormValidatorContextState } from './useProductFormValidator.context';
import { useProductFormValidatorDecisionActions } from './useProductFormValidator.decision-actions';
import { useProductFormValidatorIdentity } from './useProductFormValidator.identity';
import { useProductFormValidatorIssueState } from './useProductFormValidator.issue-state';
import { useProductFormValidatorLatestProductValues } from './useProductFormValidator.latest-product';
import { useProductFormValidatorReplacements } from './useProductFormValidator.replacements';
import { buildProductFormValidatorResult } from './useProductFormValidator.result';
import { useProductFormValidatorSettingsReset } from './useProductFormValidator.settings-reset';
import type { UseProductFormValidatorResult } from './useProductFormValidator.types';
import { useProductFormValidatorValues } from './useProductFormValidator.values';
import { useProductFormValidatorVisibleIssues } from './useProductFormValidator.visible-issues';

export type { UseProductFormValidatorResult } from './useProductFormValidator.types';

export function useProductFormValidator(
  scopeOverride?: string,
  validatorSessionKey?: string
): UseProductFormValidatorResult {
  const context = useProductFormValidatorContextState();
  const identity = useProductFormValidatorIdentity({ draftId: context.draftId, productId: context.productId, scopeOverride, validatorSessionKey });
  const decisions = useProductValidationDecisions(
    identity.validationInstanceScope,
    context.instanceDenyBehavior,
    context.validatorPatterns,
    context.productId,
    context.draftId
  );
  useProductFormValidatorSettingsReset({ ...context.settings, ...identity });
  const validatorValues = useProductFormValidatorValues({
    ...context.metadata, fallbackCatalogId: context.productCatalogId, watch: context.form.watch,
  });
  const latestProductValues = useProductFormValidatorLatestProductValues({
    currentProductId: context.productId, validatorEnabled: context.settings.validatorEnabled, validatorPatterns: context.validatorPatterns,
  });
  const issueState = useProductFormValidatorIssueState({ ...decisions, ...identity });
  const visibleFieldIssues = useProductFormValidatorVisibleIssues({
    ...issueState,
    ...context.metadata,
    latestProductValues,
    validationInstanceScope: identity.validationInstanceScope,
    validatorEnabled: context.settings.validatorEnabled,
    validatorPatterns: context.validatorPatterns,
    validatorValues,
  });
  const decisionActions = useProductFormValidatorDecisionActions({
    ...decisions,
    ...issueState,
    draftId: context.draftId,
    productId: context.productId,
  });
  const replacements = useProductFormValidatorReplacements({
    ...context.form, ...context.metadata,
  });
  useProductFormValidatorAutoAcceptController({
    context,
    decisionActions,
    decisions,
    identity,
    issueState,
    replacements,
    visibleFieldIssues,
  });

  return buildProductFormValidatorResult({
    context,
    decisionActions,
    decisions,
    identity,
    issueState,
    latestProductValues,
    visibleFieldIssues,
  });
}
