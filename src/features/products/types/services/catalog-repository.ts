import type { CatalogRecord } from "@/features/products/types";

export type { CatalogRecord };

export type CatalogCreateInput = {
  name: string;
  description?: string | null | undefined;
  isDefault?: boolean | undefined;
  languageIds?: string[] | undefined;
  defaultLanguageId?: string | null | undefined;
  priceGroupIds?: string[] | undefined;
  defaultPriceGroupId?: string | null | undefined;
};

export type CatalogUpdateInput = {
  name?: string | undefined;
  description?: string | null | undefined;
  isDefault?: boolean | undefined;
  languageIds?: string[] | undefined;
  defaultLanguageId?: string | null | undefined;
  priceGroupIds?: string[] | undefined;
  defaultPriceGroupId?: string | null | undefined;
};

export type CatalogRepository = {
  listCatalogs(): Promise<CatalogRecord[]>;
  getCatalogById(id: string): Promise<CatalogRecord | null>;
  createCatalog(input: CatalogCreateInput): Promise<CatalogRecord>;
  updateCatalog(
    id: string,
    input: CatalogUpdateInput
  ): Promise<CatalogRecord | null>;
  deleteCatalog(id: string): Promise<void>;
  getCatalogsByIds(ids: string[]): Promise<CatalogRecord[]>;
  setDefaultCatalog(id: string): Promise<void>;
};
