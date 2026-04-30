import {
  productValidationTargetSchema,
  type ProductValidationTarget,
} from '@/shared/contracts/products/validation';

export function normalizeProductValidationTarget(
  target: string | undefined
): ProductValidationTarget {
  const parsed = productValidationTargetSchema.safeParse(target);
  return parsed.success === true ? parsed.data : 'name';
}
