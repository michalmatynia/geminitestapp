import type { CatalogRecord } from "@/types";

export type { CatalogRecord };

export type CatalogCreateInput = {
  name: string;
  description?: string | null;
  isDefault?: boolean;
  languageIds?: string[];
  defaultLanguageId?: string | null;
};

export type CatalogUpdateInput = {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  languageIds?: string[];
  defaultLanguageId?: string | null;
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
