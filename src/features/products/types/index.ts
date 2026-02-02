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

export type { ProductCategoryDto as ProductCategory };

export type PriceGroupType = "standard" | "dependent";
export type ProductDbProvider = "prisma" | "mongodb";
export type ProductMigrationDirection = "prisma-to-mongo" | "mongo-to-prisma";

export type ProductCategoryWithChildren = ProductCategoryDto & {
  children: ProductCategoryWithChildren[];
};

export type ProductParameter = {
  id: string;
  catalogId: string;
  name_en: string;
  name_pl: string | null;
  name_de: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductParameterValue = {
  parameterId: string;
  value: string;
};

export type UserPreferences = {
  productListNameLocale: string | null;
  productListCatalogFilter: string | null;
  productListCurrencyCode: string | null;
  productListPageSize: number | null;
  productListThumbnailSource?: "file" | "link" | "base64" | null;
  aiPathsActivePathId?: string | null;
  aiPathsExpandedGroups?: string[] | null;
  aiPathsPaletteCollapsed?: boolean | null;
  aiPathsPathIndex?: unknown[] | null;
  aiPathsPathConfigs?: Record<string, unknown> | string | null;
  adminMenuCollapsed?: boolean | null;
};

export type IntegrationDbProvider = "prisma" | "mongodb";

export type SyncDirection = "to_base" | "from_base" | "bidirectional" | "none";

export type { ProductAiJobType } from "@/shared/types/jobs";

export type ProductMigrationBatchResult = {
  direction: ProductMigrationDirection;
  productsProcessed: number;
  productsUpserted: number;
  nextCursor: string | null;
  missingImageFileIds: string[];
  missingCatalogIds: string[];
};

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
