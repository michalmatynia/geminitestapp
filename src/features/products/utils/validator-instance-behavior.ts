import type {
  ProductValidationDenyBehavior,
  ProductValidationLaunchScopeBehavior,
  ProductValidationPatternDenyBehaviorOverride,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
} from '@/shared/contracts/products';

export const PRODUCT_VALIDATION_INSTANCE_SCOPES: ProductValidationInstanceScope[] = [
  'draft_template',
  'product_create',
  'product_edit',
];

export const DEFAULT_PRODUCT_VALIDATION_INSTANCE_DENY_BEHAVIOR: ProductValidationInstanceDenyBehaviorMap = {
  draft_template: 'mute_session',
  product_create: 'mute_session',
  product_edit: 'mute_session',
};

const isProductValidationInstanceScope = (
  value: unknown
): value is ProductValidationInstanceScope =>
  value === 'draft_template' ||
  value === 'product_create' ||
  value === 'product_edit';

export const normalizeProductValidationPatternScopes = (
  value: unknown
): ProductValidationInstanceScope[] => {
  if (!Array.isArray(value)) return [...PRODUCT_VALIDATION_INSTANCE_SCOPES];
  const unique = new Set<ProductValidationInstanceScope>();
  for (const entry of value) {
    if (isProductValidationInstanceScope(entry)) {
      unique.add(entry);
    }
  }
  if (unique.size === 0) {
    return [...PRODUCT_VALIDATION_INSTANCE_SCOPES];
  }
  return PRODUCT_VALIDATION_INSTANCE_SCOPES.filter((scope: ProductValidationInstanceScope) =>
    unique.has(scope)
  );
};

export const normalizeProductValidationPatternReplacementScopes = (
  value: unknown,
  fallbackPatternScopes?: unknown
): ProductValidationInstanceScope[] => {
  if (!Array.isArray(value)) {
    return normalizeProductValidationPatternScopes(fallbackPatternScopes);
  }
  const unique = new Set<ProductValidationInstanceScope>();
  for (const entry of value) {
    if (isProductValidationInstanceScope(entry)) {
      unique.add(entry);
    }
  }
  if (unique.size === 0) {
    return normalizeProductValidationPatternScopes(fallbackPatternScopes);
  }
  return PRODUCT_VALIDATION_INSTANCE_SCOPES.filter((scope: ProductValidationInstanceScope) =>
    unique.has(scope)
  );
};

export const normalizeProductValidationPatternLaunchScopes = (
  value: unknown,
  fallbackPatternScopes?: unknown
): ProductValidationInstanceScope[] => {
  if (!Array.isArray(value)) {
    return normalizeProductValidationPatternScopes(fallbackPatternScopes);
  }
  const unique = new Set<ProductValidationInstanceScope>();
  for (const entry of value) {
    if (isProductValidationInstanceScope(entry)) {
      unique.add(entry);
    }
  }
  if (unique.size === 0) {
    return normalizeProductValidationPatternScopes(fallbackPatternScopes);
  }
  return PRODUCT_VALIDATION_INSTANCE_SCOPES.filter((scope: ProductValidationInstanceScope) =>
    unique.has(scope)
  );
};

export const isPatternEnabledForValidationScope = (
  patternScopes: unknown,
  scope: ProductValidationInstanceScope
): boolean => normalizeProductValidationPatternScopes(patternScopes).includes(scope);

export const isPatternReplacementEnabledForValidationScope = (
  replacementScopes: unknown,
  scope: ProductValidationInstanceScope,
  fallbackPatternScopes?: unknown
): boolean =>
  normalizeProductValidationPatternReplacementScopes(
    replacementScopes,
    fallbackPatternScopes
  ).includes(scope);

export const isPatternLaunchEnabledForValidationScope = (
  launchScopes: unknown,
  scope: ProductValidationInstanceScope,
  fallbackPatternScopes?: unknown
): boolean =>
  normalizeProductValidationPatternLaunchScopes(launchScopes, fallbackPatternScopes).includes(scope);

export const normalizeProductValidationLaunchScopeBehavior = (
  value: unknown
): ProductValidationLaunchScopeBehavior =>
  value === 'condition_only' ? 'condition_only' : 'gate';

export const normalizeProductValidationSkipNoopReplacementProposal = (
  value: unknown
): boolean => value !== false;

export const normalizeProductValidationDenyBehavior = (
  value: unknown
): ProductValidationDenyBehavior =>
  value === 'ask_again' ? 'ask_again' : 'mute_session';

export const normalizeProductValidationPatternDenyBehaviorOverride = (
  value: unknown
): ProductValidationPatternDenyBehaviorOverride =>
  value === 'ask_again' || value === 'mute_session' ? value : null;

export const normalizeProductValidationInstanceScope = (
  value: unknown
): ProductValidationInstanceScope =>
  value === 'draft_template' || value === 'product_edit' ? value : 'product_create';

export const normalizeProductValidationInstanceDenyBehaviorMap = (
  value: unknown
): ProductValidationInstanceDenyBehaviorMap => {
  const source =
    value && typeof value === 'object'
      ? (value as Partial<Record<ProductValidationInstanceScope, unknown>>)
      : {};

  return {
    draft_template: normalizeProductValidationDenyBehavior(
      source['draft_template'] ?? DEFAULT_PRODUCT_VALIDATION_INSTANCE_DENY_BEHAVIOR.draft_template
    ),
    product_create: normalizeProductValidationDenyBehavior(
      source['product_create'] ?? DEFAULT_PRODUCT_VALIDATION_INSTANCE_DENY_BEHAVIOR.product_create
    ),
    product_edit: normalizeProductValidationDenyBehavior(
      source['product_edit'] ?? DEFAULT_PRODUCT_VALIDATION_INSTANCE_DENY_BEHAVIOR.product_edit
    ),
  };
};
