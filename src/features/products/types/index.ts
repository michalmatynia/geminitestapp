import type { ProductCategoryDto } from "@/shared/dtos";

// Re-export DTOs as types for backward compatibility
export type {
  ProductDto,
  ProductTagDto as ProductTag,
  CatalogDto,
  PriceGroupDto,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  ProductCategoryDto
} from "@/shared/dtos";

export type {
  PriceGroupType,
  ProductDbProvider,
  ProductMigrationDirection,
  ProductParameter,
  ProductParameterValue,
  ProductAiJobType,
  ProductMigrationBatchResult,
} from "@/shared/types/domain/products";

export type ProductCategoryWithChildren = ProductCategoryDto & {

export type {
  CatalogRecord,
  ProductRecord,
  ProductImageRecord,
  ProductCatalogRecord,
  ProductWithImages,
  PriceGroupWithDetails,
  CatalogRecord as Catalog,
  PriceGroupRecord as PriceGroup,
} from "./records";

export type { ProductFormData } from "./forms";
export type {
  ProductDraft,
  CreateProductDraftInput,
  UpdateProductDraftInput,
} from "./drafts";
