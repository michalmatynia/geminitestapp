import { z } from "zod";
import { productCreateSchema } from "@/lib/validations/product";

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
  createdAt: Date;
  updatedAt: Date;
  languageIds: string[];
};

export type ProductRecord = {
  id: string;
  sku: string | null;
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
};

// This is the Zod schema for the product form data.
export type ProductFormData = z.infer<typeof productCreateSchema>;
