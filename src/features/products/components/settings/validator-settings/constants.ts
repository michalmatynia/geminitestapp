import type { ProductValidationInstanceScope } from '@/shared/contracts/products/validation';

export const INSTANCE_SCOPE_LABELS: Record<ProductValidationInstanceScope, string> = {
  draft_template: 'Draft Template Form',
  product_create: 'New Product Form',
  product_edit: 'Existing Product Form',
};

export const PATTERN_SCOPE_OPTIONS = (
  Object.keys(INSTANCE_SCOPE_LABELS) as ProductValidationInstanceScope[]
).map((scope: ProductValidationInstanceScope) => ({
  value: scope,
  label: INSTANCE_SCOPE_LABELS[scope],
}));
