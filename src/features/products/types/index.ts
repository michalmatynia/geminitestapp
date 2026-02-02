export type PriceGroupType = "standard" | "dependent";

export type PriceGroup = {
  id: string;
  groupId: string;
  name: string;
  description: string;
  currencyId: string;
  currencyCode: string;
  isDefault: boolean;
  groupType: PriceGroupType;
  basePriceField: string;
  sourceGroupId?: string | null;
  priceMultiplier: number;
  addToPrice: number;
};

export type Catalog = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  languageIds: string[];
  defaultLanguageId?: string | null;
  defaultPriceGroupId?: string | null;
  priceGroupIds: string[];
};

export type ProductDbProvider = "prisma" | "mongodb";
export type ProductMigrationDirection = "prisma-to-mongo" | "mongo-to-prisma";

export type ProductCategory = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | null;
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductCategoryWithChildren = ProductCategory & {
  children: ProductCategoryWithChildren[];
};

export type ProductTag = {
  id: string;
  name: string;
  color: string | null;
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
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
} from "./records";

export type { ProductFormData } from "./forms";
export type {
  ProductDraft,
  CreateProductDraftInput,
  UpdateProductDraftInput,
} from "./drafts";
