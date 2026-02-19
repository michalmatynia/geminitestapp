import type { CatalogRecord } from '@/features/products/types';
import type { CatalogCreateInputDto, CatalogUpdateInputDto } from '@/shared/contracts/products';

export type { CatalogRecord };

export type CatalogCreateInput = CatalogCreateInputDto;

export type CatalogUpdateInput = CatalogUpdateInputDto;

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
