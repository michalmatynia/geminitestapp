import { z } from "zod";
import { productCreateSchema } from "@/lib/validations/product";
export { type PriceGroup, type Currency } from "@prisma/client";
import type { PriceGroup, Currency } from "@prisma/client";

export type PriceGroupWithDetails = PriceGroup & {
  currency: Currency;
  currencyCode?: string;
};

export type ImageFileRecord = {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ImageFileSelection = Pick<ImageFileRecord, "id" | "filepath">;

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

// This type represents a product with its associated images and the image files themselves.
export type ProductWithImages = ProductRecord & {
  images: ProductImageRecord[];
  catalogs: ProductCatalogRecord[];
  categories?: { categoryId: string }[];
  tags?: { tagId: string }[];
};

// This is the Zod schema for the product form data.
export type ProductFormData = z.infer<typeof productCreateSchema>;

// Integration types for product listings
export type IntegrationRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationConnectionBasic = {
  id: string;
  name: string;
  integrationId: string;
};

export type IntegrationWithConnections = IntegrationRecord & {
  connections: IntegrationConnectionBasic[];
};

export type ProductListingExportEvent = {
  exportedAt: Date | string;
  status?: string | null;
  inventoryId?: string | null;
  templateId?: string | null;
  warehouseId?: string | null;
  externalListingId?: string | null;
  fields?: string[] | null;
  requestId?: string | null;
};

export type ProductListingRecord = {
  id: string;
  productId: string;
  integrationId: string;
  connectionId: string;
  externalListingId: string | null;
  inventoryId?: string | null;
  status: string;
  listedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  exportHistory?: ProductListingExportEvent[] | null;
  integration: {
    id: string;
    name: string;
    slug: string;
  };
  connection: {
    id: string;
    name: string;
  };
};

export type SystemLogLevel = "info" | "warn" | "error";

export type SystemLogRecord = {
  id: string;
  level: SystemLogLevel;
  message: string;
  source?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  userId?: string | null;
  createdAt: Date | string;
};
