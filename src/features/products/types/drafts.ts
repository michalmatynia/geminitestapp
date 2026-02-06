import type { ProductParameterValue } from '@/features/products/types';

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

export type CreateProductDraftInput = {
  name: string;
  description?: string | null | undefined;
  sku?: string | null | undefined;
  ean?: string | null | undefined;
  gtin?: string | null | undefined;
  asin?: string | null | undefined;
  name_en?: string | null | undefined;
  name_pl?: string | null | undefined;
  name_de?: string | null | undefined;
  description_en?: string | null | undefined;
  description_pl?: string | null | undefined;
  description_de?: string | null | undefined;
  weight?: number | null | undefined;
  sizeLength?: number | null | undefined;
  sizeWidth?: number | null | undefined;
  length?: number | null | undefined;
  price?: number | null | undefined;
  supplierName?: string | null | undefined;
  supplierLink?: string | null | undefined;
  priceComment?: string | null | undefined;
  stock?: number | null | undefined;
  catalogIds?: string[] | undefined;
  categoryId?: string | null | undefined;
  tagIds?: string[] | undefined;
  parameters?: ProductParameterValue[] | undefined;
  defaultPriceGroupId?: string | null | undefined;
  active?: boolean | undefined;
  icon?: string | null | undefined;
  imageLinks?: string[] | undefined;
  baseProductId?: string | null | undefined;
};

export type UpdateProductDraftInput = Partial<CreateProductDraftInput>;
