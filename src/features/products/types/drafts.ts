import type { ProductParameterValue } from '@/features/products/types';
import type { CreateProductDto } from '@/shared/contracts/products';

export const PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS = [
  'general',
  'other',
  'parameters',
  'custom-fields',
  'images',
  'studio',
  'import-info',
  'note-link',
  'validation',
] as const;

export type ProductDraftOpenFormTab =
  (typeof PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS)[number];

export type ProductDraftDto = {
  id: string;
  name: string;
  description?: string | null;

  // Pre-filled fields
  sku?: string | null;
  ean?: string | null;
  gtin?: string | null;
  asin?: string | null;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;

  // Physical properties
  weight?: number | null;
  sizeLength?: number | null;
  sizeWidth?: number | null;
  length?: number | null;

  // Pricing and supplier
  price?: number | null;
  supplierName?: string | null;
  supplierLink?: string | null;
  priceComment?: string | null;
  stock?: number | null;

  // Catalog and metadata
  catalogIds?: string[];
  categoryId?: string | null;
  tagIds?: string[];
  producerIds?: string[];
  parameters?: ProductParameterValue[];

  // Price group
  defaultPriceGroupId?: string | null;

  // Status
  active?: boolean;
  validatorEnabled?: boolean;
  formatterEnabled?: boolean;

  // Icon
  icon?: string | null;
  iconColorMode?: 'theme' | 'custom' | null;
  iconColor?: string | null;
  openProductFormTab?: ProductDraftOpenFormTab | null;

  // Image links
  imageLinks?: string[];

  // Import info
  baseProductId?: string | null;

  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
};

export interface CreateProductDraftDto
  extends Partial<Omit<CreateProductDto, 'sku' | 'name' | 'description'>> {
  name: string; // Draft internal name
  description?: string | null; // Draft internal description
  sku?: string | null; // Drafts might not have SKU yet or it might be optional
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  active?: boolean;
  validatorEnabled?: boolean;
  formatterEnabled?: boolean;
  icon?: string | null;
  iconColorMode?: 'theme' | 'custom' | null;
  iconColor?: string | null;
  openProductFormTab?: ProductDraftOpenFormTab | null;
  baseProductId?: string | null;
  parameters?: ProductParameterValue[];
  catalogIds?: string[];
  tagIds?: string[];
  producerIds?: string[];
  defaultPriceGroupId?: string | null;
  ean?: string | null;
  gtin?: string | null;
  asin?: string | null;
}

export type UpdateProductDraftDto = Partial<CreateProductDraftDto>;
