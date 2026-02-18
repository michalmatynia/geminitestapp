import type {
  ProductDraftDto,
  CreateProductDraftDto,
  UpdateProductDraftDto,
  ProductDraftOpenFormTab
} from '@/shared/contracts/products';

export const PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS = [
  'general',
  'other',
  'parameters',
  'images',
  'studio',
  'import-info',
  'note-link',
  'validation',
] as const;

export type {
  ProductDraftOpenFormTab,
  ProductDraftDto,
  CreateProductDraftDto,
  UpdateProductDraftDto,
};
