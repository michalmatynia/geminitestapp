import type { ProductParameterValue } from '@/features/products/types';
import type { CreateProductDto } from '@/shared/dtos';

export type ProductDraft = {
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
  parameters?: ProductParameterValue[];

  // Price group
  defaultPriceGroupId?: string | null;

  // Status
  active?: boolean;

  // Icon
  icon?: string | null;

  // Image links
  imageLinks?: string[];

  // Import info
  baseProductId?: string | null;

  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
};

export interface CreateProductDraftInput extends Omit<CreateProductDto, 'sku'> {
  name: string; // Draft internal name
  description?: string | null; // Draft internal description
  sku?: string | null; // Drafts might not have SKU yet or it might be optional
  active?: boolean;
  icon?: string | null;
  baseProductId?: string | null;
  parameters?: ProductParameterValue[];
  defaultPriceGroupId?: string | null;
  ean?: string | null;
  gtin?: string | null;
  asin?: string | null;
}

export type UpdateProductDraftInput = Partial<CreateProductDraftInput>;
