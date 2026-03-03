import { z } from 'zod';
import * as React from 'react';
import { namedDtoSchema } from '../base';
import type { ImageFileRecord } from '../files';
import type { ManagedImageSlot } from '../image-slots';
import { productParameterValueSchema } from './product';
import type { ProductRecord, ProductWithImages, ProductImageRecord } from './product';
import type { ProductCreateInput, ProductUpdateInput } from './io';
import type { CatalogCreateInput, CatalogUpdateInput, CatalogRecord } from './catalogs';
import type {
  ProductCategoryFilters,
  ProductCategory,
  ProductCategoryWithChildren,
  ProductCategoryCreateInput,
  ProductCategoryUpdateInput,
} from './categories';
import type {
  ProductParameter,
  ProductParameterCreateInput,
  ProductParameterUpdateInput,
} from './parameters';
import type { Producer } from './producers';
import type { ProductFilter, ProductStockOperator, ProductListPreferences } from './filters';
import type {
  ProductTagFilters,
  ProductTag,
  ProductTagCreateInput,
  ProductTagUpdateInput,
} from './tags';
import type {
  ProductValidationPatternFormDataDto,
  ProductValidationPattern,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
  ProductValidationDenyBehavior,
  SequenceGroupDraft,
  CreateProductValidationPatternDto,
  UpdateProductValidationPatternDto,
} from './validation';
export const productDraftOpenFormTabSchema = z.enum([
  'general',
  'other',
  'parameters',
  'images',
  'studio',
  'import-info',
  'note-link',
  'validation',
]);

export type ProductDraftOpenFormTab = z.infer<typeof productDraftOpenFormTabSchema>;

export const PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS: ProductDraftOpenFormTab[] = [
  'general',
  'other',
  'parameters',
  'images',
  'studio',
  'import-info',
  'note-link',
  'validation',
];

export const productDraftSchema = namedDtoSchema.extend({
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  ean: z.string().nullable().optional(),
  gtin: z.string().nullable().optional(),
  asin: z.string().nullable().optional(),
  name_en: z.string().nullable().optional(),
  name_pl: z.string().nullable().optional(),
  name_de: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  description_pl: z.string().nullable().optional(),
  description_de: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  sizeLength: z.number().nullable().optional(),
  sizeWidth: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  supplierName: z.string().nullable().optional(),
  supplierLink: z.string().nullable().optional(),
  priceComment: z.string().nullable().optional(),
  stock: z.number().nullable().optional(),
  catalogIds: z.array(z.string()).optional(),
  categoryId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  producerIds: z.array(z.string()).optional(),
  parameters: z.array(productParameterValueSchema).optional(),
  defaultPriceGroupId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  validatorEnabled: z.boolean().optional(),
  formatterEnabled: z.boolean().optional(),
  icon: z.string().nullable().optional(),
  iconColorMode: z.enum(['theme', 'custom']).nullable().optional(),
  iconColor: z.string().nullable().optional(),
  openProductFormTab: productDraftOpenFormTabSchema.nullable().optional(),
  imageLinks: z.array(z.string()).optional(),
  baseProductId: z.string().nullable().optional(),
});

export type ProductDraftDto = z.infer<typeof productDraftSchema>;
export type ProductDraft = ProductDraftDto;

export const createProductDraftSchema = productDraftSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductDraftDto = z.infer<typeof createProductDraftSchema>;
export type CreateProductDraftInput = CreateProductDraftDto;

export const updateProductDraftSchema = createProductDraftSchema.partial();

export type UpdateProductDraftDto = Partial<CreateProductDraftDto>;
export type UpdateProductDraftInput = UpdateProductDraftDto;

/**
 * Product Repository Interfaces
 */

export type CatalogRepository = {
  listCatalogs(): Promise<CatalogRecord[]>;
  getCatalogById(id: string): Promise<CatalogRecord | null>;
  createCatalog(input: CatalogCreateInput): Promise<CatalogRecord>;
  updateCatalog(id: string, input: CatalogUpdateInput): Promise<CatalogRecord | null>;
  deleteCatalog(id: string): Promise<void>;
  getCatalogsByIds(ids: string[]): Promise<CatalogRecord[]>;
  setDefaultCatalog(id: string): Promise<void>;
};

export type CategoryFilters = ProductCategoryFilters;

export type CategoryRepository = {
  listCategories(filters: CategoryFilters): Promise<ProductCategory[]>;
  getCategoryTree(catalogId?: string): Promise<ProductCategoryWithChildren[]>;
  getCategoryById(id: string): Promise<ProductCategory | null>;
  getCategoryWithChildren(id: string): Promise<ProductCategoryWithChildren | null>;
  createCategory(data: ProductCategoryCreateInput): Promise<ProductCategory>;
  updateCategory(id: string, data: ProductCategoryUpdateInput): Promise<ProductCategory>;
  deleteCategory(id: string): Promise<void>;
  findByName(
    catalogId: string,
    name: string,
    parentId?: string | null
  ): Promise<ProductCategory | null>;
  isDescendant(categoryId: string, targetId: string): Promise<boolean>;
};

export type ParameterFilters = { search?: string; catalogId?: string };
export type ParameterCreateInput = ProductParameterCreateInput;
export type ParameterUpdateInput = ProductParameterUpdateInput;

export type ParameterRepository = {
  listParameters(filters: ParameterFilters): Promise<ProductParameter[]>;
  getParameterById(id: string): Promise<ProductParameter | null>;
  createParameter(data: ParameterCreateInput): Promise<ProductParameter>;
  bulkCreateParameters(data: ParameterCreateInput[]): Promise<ProductParameter[]>;
  updateParameter(id: string, data: ParameterUpdateInput): Promise<ProductParameter>;
  deleteParameter(id: string): Promise<void>;
  findByName(catalogId: string, name_en: string): Promise<ProductParameter | null>;
};

export type ProducerFilters = {
  search?: string;
};

export type ProducerRepository = {
  listProducers(filters: ProducerFilters): Promise<Producer[]>;
  getProducerById(id: string): Promise<Producer | null>;
  createProducer(data: { name: string; website?: string | null }): Promise<Producer>;
  updateProducer(id: string, data: { name?: string; website?: string | null }): Promise<Producer>;
  deleteProducer(id: string): Promise<void>;
  findByName(name: string): Promise<Producer | null>;
};

export type ProductFilters = Partial<ProductFilter> & {
  ids?: string[] | undefined;
  excludeIds?: string[] | undefined;
  tagIds?: string[] | undefined;
  producerIds?: string[] | undefined;
  priceGroupIds?: string[] | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  stockValue?: number | undefined;
  stockOperator?: ProductStockOperator | undefined;
  searchLanguage?: 'name_en' | 'name_pl' | 'name_de' | undefined;
  baseExported?: boolean | undefined;
  search?: string | undefined;
  id?: string | undefined;
  idMatchMode?: 'exact' | 'partial' | undefined;
  sku?: string | undefined;
  description?: string | undefined;
  categoryId?: string | undefined;
  catalogId?: string | undefined;
  advancedFilter?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
};

export type TransactionalProductRepository = {
  getProducts(filters: ProductFilters): Promise<ProductWithImages[]>;
  countProducts(filters: ProductFilters): Promise<number>;
  getProductById(id: string): Promise<ProductWithImages | null>;
  getProductBySku(sku: string): Promise<ProductRecord | null>;
  getProductsBySkus(skus: string[]): Promise<ProductRecord[]>;
  findProductByBaseId(baseProductId: string): Promise<ProductRecord | null>;
  findProductsByBaseIds(baseIds: string[]): Promise<ProductRecord[]>;
  createProduct(data: ProductCreateInput): Promise<ProductRecord>;
  bulkCreateProducts(data: ProductCreateInput[]): Promise<number>;
  updateProduct(id: string, data: ProductUpdateInput): Promise<ProductRecord | null>;
  deleteProduct(id: string): Promise<ProductRecord | null>;
  duplicateProduct(id: string, sku: string): Promise<ProductRecord | null>;
  getProductImages(productId: string): Promise<ProductImageRecord[]>;
  addProductImages(productId: string, imageFileIds: string[]): Promise<void>;
  replaceProductImages(productId: string, imageFileIds: string[]): Promise<void>;
  removeProductImage(productId: string, imageFileId: string): Promise<void>;
  countProductsByImageFileId(imageFileId: string): Promise<number>;
  replaceProductCatalogs(productId: string, catalogIds: string[]): Promise<void>;
  replaceProductCategory(productId: string, categoryId: string | null): Promise<void>;
  replaceProductTags(productId: string, tagIds: string[]): Promise<void>;
  replaceProductProducers(productId: string, producerIds: string[]): Promise<void>;
  replaceProductNotes(productId: string, noteIds: string[]): Promise<void>;
  bulkReplaceProductCatalogs(productIds: string[], catalogIds: string[]): Promise<void>;
  bulkAddProductCatalogs(productIds: string[], catalogIds: string[]): Promise<void>;
  bulkRemoveProductCatalogs(productIds: string[], catalogIds: string[]): Promise<void>;
};
export type ProductRepository = TransactionalProductRepository & {
  getProductsWithCount(
    filters: ProductFilters
  ): Promise<{ products: ProductWithImages[]; total: number }>;
  createProductInTransaction: <T>(
    callback: (tx: TransactionalProductRepository & unknown) => Promise<T>
  ) => Promise<T>;
};

export type TagFilters = ProductTagFilters;

export type TagRepository = {
  listTags(filters: TagFilters): Promise<ProductTag[]>;
  getTagById(id: string): Promise<ProductTag | null>;
  createTag(data: ProductTagCreateInput): Promise<ProductTag>;
  updateTag(id: string, data: ProductTagUpdateInput): Promise<ProductTag>;
  deleteTag(id: string): Promise<void>;
  findByName(catalogId: string, name: string): Promise<ProductTag | null>;
};

export type PatternFormData = ProductValidationPatternFormDataDto;

export interface SequenceGroupView {
  id: string;
  label: string;
  debounceMs: number;
  patternIds: string[];
}

export interface ValidatorSettingsController {
  patterns: ProductValidationPattern[];
  settings: unknown; // Ideally more specific, but 'unknown' is what's implied from useValidatorSettings()
  summary: {
    total: number;
    enabled: number;
    replacementEnabled: number;
  };
  orderedPatterns: ProductValidationPattern[];
  enabledByDefault: boolean;
  formatterEnabledByDefault: boolean;
  instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
  loading: boolean;
  isUpdating: boolean;
  settingsBusy: boolean;
  patternActionsPending: boolean;
  reorderPending: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  closeModal: () => void;
  editingPattern: ProductValidationPattern | null;
  formData: PatternFormData;
  setFormData: (data: PatternFormData | ((prev: PatternFormData) => PatternFormData)) => void;
  testResult: unknown;
  handleSave: () => Promise<void>;
  handleSavePattern: () => Promise<void>;
  handleTogglePattern: (pattern: ProductValidationPattern) => Promise<void>;
  handleDeletePattern: (id: string) => Promise<void>;
  handleUpdateSettings: (
    updates: Partial<{
      enabledByDefault: boolean;
      formatterEnabledByDefault: boolean;
      instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
    }>
  ) => Promise<void>;
  handleToggleDefault: (enabled: boolean) => Promise<void>;
  handleToggleFormatterDefault: (enabled: boolean) => Promise<void>;
  handleInstanceBehaviorChange: (
    scope: ProductValidationInstanceScope,
    behavior: ProductValidationDenyBehavior
  ) => Promise<void>;
  handleEditPattern: (pattern: ProductValidationPattern) => void;
  handleDuplicatePattern: (pattern: ProductValidationPattern) => void;
  handleAddPattern: (target?: string) => void;
  handleDragStart: (e: unknown, patternId: string) => void;
  handleDrop: (pattern: ProductValidationPattern, e: unknown) => void;
  replacementFieldOptions: Array<{ value: string; label: string }>;
  sourceFieldOptions: Array<{ value: string; label: string }>;
  createPatternPending: boolean;
  updatePatternPending: boolean;
  isLocaleTarget: (target: string) => boolean;
  normalizeReplacementFields: (fields: unknown, target?: string) => string[];
  getReplacementFieldsForTarget: (target: string) => Array<{ value: string; label: string }>;
  getSourceFieldOptionsForTarget: (target: string) => Array<{ value: string; label: string }>;
  formatReplacementFields: (fields: unknown) => string;
  draggedPatternId: string | null;
  setDraggedPatternId: (id: string | null) => void;
  dragOverPatternId: string | null;
  setDragOverPatternId: (id: string | null) => void;
  handlePatternDrop: (pattern: ProductValidationPattern, e: unknown) => void;
  sequenceGroups: Map<string, SequenceGroupView>;
  firstPatternIdByGroup: Map<string, string>;
  getSequenceGroupId: (p: ProductValidationPattern) => string | null;
  handleMoveGroup: (groupId: string, targetIndex: number) => Promise<void>;
  handleReorderInGroup: (groupId: string, patternId: string, targetIndex: number) => Promise<void>;
  handleMoveToGroup: (patternId: string, targetGroupId: string) => Promise<void>;
  handleRemoveFromGroup: (patternId: string) => Promise<void>;
  handleCreateGroup: (patternIds: string[]) => Promise<void>;
  handleRenameGroup: (groupId: string, label: string) => Promise<void>;
  handleUpdateGroupDebounce: (groupId: string, debounceMs: number) => Promise<void>;
  onCreateSkuAutoIncrementSequence: () => Promise<void>;
  onCreateLatestPriceStockSequence: () => Promise<void>;
  handleCreateNameLengthMirrorPattern: () => Promise<void>;
  handleCreateNameCategoryMirrorPattern: () => Promise<void>;
  handleCreateNameMirrorPolishSequence: () => Promise<void>;
  handleSaveSequenceGroup: (groupId: string) => Promise<void>;
  handleUngroup: (groupId: string) => Promise<void>;
  patternToDelete: ProductValidationPattern | null;
  setPatternToDelete: (pattern: ProductValidationPattern | null) => void;
  groupDrafts: Record<string, SequenceGroupDraft>;
  setGroupDrafts: React.Dispatch<React.SetStateAction<Record<string, SequenceGroupDraft>>>;
  getGroupDraft: (groupId: string) => SequenceGroupDraft;
  openCreate: (target?: string) => void;
  openEdit: (pattern: ProductValidationPattern) => void;
}

export type CreateProductValidationPatternInput = CreateProductValidationPatternDto;
export type UpdateProductValidationPatternInput = UpdateProductValidationPatternDto;

export type ProductValidationPatternRepository = {
  listPatterns(): Promise<ProductValidationPattern[]>;
  getPatternById(id: string): Promise<ProductValidationPattern | null>;
  createPattern(data: CreateProductValidationPatternInput): Promise<ProductValidationPattern>;
  updatePattern(
    id: string,
    data: UpdateProductValidationPatternInput
  ): Promise<ProductValidationPattern>;
  deletePattern(id: string): Promise<void>;
  getEnabledByDefault(): Promise<boolean>;
  setEnabledByDefault(enabled: boolean): Promise<boolean>;
  getFormatterEnabledByDefault(): Promise<boolean>;
  setFormatterEnabledByDefault(enabled: boolean): Promise<boolean>;
  getInstanceDenyBehavior(): Promise<ProductValidationInstanceDenyBehaviorMap>;
  setInstanceDenyBehavior(
    value: ProductValidationInstanceDenyBehaviorMap
  ): Promise<ProductValidationInstanceDenyBehaviorMap>;
};

/**
 * Product UI and Context Types
 */

export type ExpandedImageFile = ImageFileRecord & {
  products: {
    product: {
      id: string;
      name: string;
    };
  }[];
};

export type DebugInfo = {
  action: string;
  message: string;
  slotIndex?: number | undefined;
  filename?: string | undefined;
  timestamp: string;
};

export type ProductFormData = ProductCreateInput;

export type ProductImageSlot = ManagedImageSlot;

export type DraftProvider = 'mongodb' | 'prisma';
