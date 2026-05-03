import { createProductDraftSchema, updateProductDraftSchema } from '@/shared/contracts/products/drafts';

export const createDraftPayloadSchema = createProductDraftSchema;
export const updateDraftPayloadSchema = updateProductDraftSchema;

export const resolveDraftCategoryId = (input: {
  categoryId?: string | null | undefined;
}): string | null => {
  const explicitCategoryId = typeof input.categoryId === 'string' ? input.categoryId.trim() : '';
  return explicitCategoryId.length > 0 ? explicitCategoryId : null;
};
