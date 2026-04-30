import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import type {
  ProductValidationAcceptIssueInput,
  ProductValidationDenyBehavior,
  ProductValidationDenyIssueInput,
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';

type OptionalId = string | null | undefined;

type IssueIdentity = {
  fieldName: string;
  patternId: string;
};

export const trimOptionalId = (value: OptionalId): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const buildProductFormValidatorEntityIdentity = ({
  draftId,
  productId,
  validatorSessionKey,
}: {
  draftId: OptionalId;
  productId: OptionalId;
  validatorSessionKey?: string;
}): string =>
  `${trimOptionalId(productId)}::${trimOptionalId(draftId)}::${validatorSessionKey ?? ''}`;

export const createProductFormValidatorInstanceId = (prefix: string): string => {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}`;
};

export const resolveProductFormValidationInstanceScope = ({
  draftId,
  productId,
  scopeOverride,
}: {
  draftId: OptionalId;
  productId: OptionalId;
  scopeOverride?: string;
}): ProductValidationInstanceScope => {
  if (scopeOverride !== undefined && scopeOverride.length > 0) {
    return scopeOverride as ProductValidationInstanceScope;
  }
  if (trimOptionalId(productId).length > 0) return 'product_edit';
  if (trimOptionalId(draftId).length > 0) return 'draft_template';
  return 'product_create';
};

export const buildProductFormValidationScopeKey = ({
  draftId,
  draftValidationInstanceId,
  productCreateValidationInstanceId,
  productId,
  validationInstanceScope,
}: {
  draftId: OptionalId;
  draftValidationInstanceId: string;
  productCreateValidationInstanceId: string;
  productId: OptionalId;
  validationInstanceScope: ProductValidationInstanceScope;
}): string => {
  const normalizedProductId = trimOptionalId(productId);
  if (validationInstanceScope === 'product_edit' && normalizedProductId.length > 0) {
    return `product:${normalizedProductId}`;
  }
  if (validationInstanceScope === 'draft_template') {
    const normalizedDraftId = draftId === null || draftId === undefined ? 'draft' : draftId.trim();
    return `draft-instance:${normalizedDraftId}:${draftValidationInstanceId}`;
  }
  return `product-create-instance:${productCreateValidationInstanceId}`;
};

export const buildProductFormValidatorIssueDecisionKey = ({
  fieldName,
  patternId,
  validationScopeKey,
}: IssueIdentity & {
  validationScopeKey: string;
}): string => `${validationScopeKey}::${fieldName}::${patternId}`;

export const clearProductFormValidatorScopedIssueKeys = (
  prev: Set<string>,
  scopePrefix: string
): Set<string> => {
  const next = new Set<string>();
  let changed = false;
  for (const key of prev) {
    if (key.startsWith(scopePrefix)) {
      changed = true;
      continue;
    }
    next.add(key);
  }
  return changed ? next : prev;
};

export const getProductFormValidatorDenyActionLabel = (
  behavior: ProductValidationDenyBehavior
): 'Deny' | 'Mute' => (behavior === 'mute_session' ? 'Mute' : 'Deny');

export const normalizeProductFormValidatorIssueIdentity = (
  input: ProductValidationAcceptIssueInput | ProductValidationDenyIssueInput
): IssueIdentity | null => {
  const patternId = input.patternId.trim();
  const fieldName = input.fieldName.trim();
  if (patternId.length === 0 || fieldName.length === 0) return null;
  return { fieldName, patternId };
};

export const addIssueKeyWhenMissing = (prev: Set<string>, issueKey: string): Set<string> => {
  if (prev.has(issueKey)) return prev;
  const next = new Set(prev);
  next.add(issueKey);
  return next;
};

export const updateAcceptedIssueKeysForPostAccept = (
  prev: Set<string>,
  issueKey: string,
  shouldMute: boolean
): Set<string> => {
  if (shouldMute) return addIssueKeyWhenMissing(prev, issueKey);
  if (!prev.has(issueKey)) return prev;
  const next = new Set(prev);
  next.delete(issueKey);
  return next;
};

export const hasLatestProductSourcePattern = (pattern: ProductValidationPattern): boolean => {
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
  if (recipe?.sourceMode === 'latest_product_field') return true;
  return pattern.launchEnabled && pattern.launchSourceMode === 'latest_product_field';
};
