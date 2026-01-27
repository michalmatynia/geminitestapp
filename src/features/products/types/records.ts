import type { ProductParameterValue } from "@/features/products/types";
import type { ImageFileRecord } from "@/shared/types/files";
import type { PriceGroup, Currency } from "@prisma/client";

export type PriceGroupWithDetails = PriceGroup & {
  currency: Currency;
  currencyCode?: string;
};

export type CatalogRecord = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  defaultLanguageId?: string | null;
  defaultPriceGroupId?: string | null;
  priceGroupIds: string[];
  createdAt: Date;
  updatedAt: Date;
  languageIds: string[];
};

export type ProductRecord = {
  id: string;
  sku: string | null;
  baseProductId: string | null;
  defaultPriceGroupId: string | null;
  ean: string | null;
  gtin: string | null;
  asin: string | null;
  name_en: string | null;
  name_pl: string | null;
  name_de: string | null;
  description_en: string | null;
  description_pl: string | null;
  description_de: string | null;
  supplierName: string | null;
  supplierLink: string | null;
  priceComment: string | null;
  stock: number | null;
  price: number | null;
  sizeLength: number | null;
  sizeWidth: number | null;
  weight: number | null;
  length: number | null;
  parameters?: ProductParameterValue[];
  imageLinks: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProductImageRecord = {
  productId: string;
  imageFileId: string;
  assignedAt: Date;
  imageFile: ImageFileRecord;
};

export type ProductCatalogRecord = {
  productId: string;
  catalogId: string;
  assignedAt: Date;
  catalog: CatalogRecord;
};

export type ProductWithImages = ProductRecord & {
  images: ProductImageRecord[];
  catalogs: ProductCatalogRecord[];
  categories?: { categoryId: string }[];
  tags?: { tagId: string }[];
};
