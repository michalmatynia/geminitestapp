import type { ProductValidationDecisionsResult } from './validator/useProductValidationDecisions';
import type { ProductFormValidatorDecisionActions } from './useProductFormValidator.decision-actions';
import type { ProductFormValidatorIssueState } from './useProductFormValidator.issue-state';
import type { ProductFormValidatorIdentityState } from './useProductFormValidator.identity';
import type { ProductFormValidatorContextState } from './useProductFormValidator.context';
import type { ProductValidatorFieldIssues } from './useProductValidatorIssues.types';
import type { UseProductFormValidatorResult } from './useProductFormValidator.types';

type BuildProductFormValidatorResultArgs = {
  context: ProductFormValidatorContextState;
  decisionActions: ProductFormValidatorDecisionActions;
  decisions: ProductValidationDecisionsResult;
  identity: ProductFormValidatorIdentityState;
  issueState: ProductFormValidatorIssueState;
  latestProductValues: Record<string, unknown> | null;
  visibleFieldIssues: ProductValidatorFieldIssues;
};

export const buildProductFormValidatorResult = ({
  context,
  decisionActions,
  decisions,
  identity,
  issueState,
  latestProductValues,
  visibleFieldIssues,
}: BuildProductFormValidatorResultArgs): UseProductFormValidatorResult => ({
  ...decisionActions,
  ...issueState,
  formatterEnabled: context.settings.formatterEnabled,
  latestProductValues,
  setFormatterEnabled: context.settings.setFormatterEnabled,
  setValidationDenyBehavior: decisions.setValidationDenyBehavior,
  setValidatorEnabled: context.settings.setValidatorEnabled,
  setValidatorManuallyChanged: context.settings.setValidatorManuallyChanged,
  validationDenyBehavior: decisions.effectiveValidationDenyBehavior,
  validationInstanceScope: identity.validationInstanceScope,
  validatorEnabled: context.settings.validatorEnabled,
  validatorPatterns: context.validatorPatterns,
  visibleFieldIssues,
});
