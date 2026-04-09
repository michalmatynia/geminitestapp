import * as React from 'react';
import { z } from 'zod';

import { namedDtoSchema } from '../base';
import type { LabeledOptionDto } from '../base';
import { productCustomFieldValueSchema, type ProductCustomFieldDefinitionCreateInput, type ProductCustomFieldDefinitionUpdateInput } from './custom-fields';
import { productImportSourceSchema, productParameterValueSchema } from './product';
import { productMarketplaceContentOverrideDraftsSchema } from './product';

import type { ImageFileRecord } from '../files';
import type { ManagedImageSlot } from '../image-slots';
import type { CatalogCreateInput, CatalogUpdateInput, CatalogRecord } from './catalogs';
import type {
  ProductCategoryFilters,
  ProductCategory,
  ProductCategoryWithChildren,
  ProductCategoryCreateInput,
  ProductCategoryUpdateInput,
} from './categories';
import type { ProductFilter, ProductStockOperator } from './filters';
import type { ProductCreateInput, ProductUpdateInput } from './io';
import type {
  ProductParameter,
  ProductParameterCreateInput,
  ProductParameterUpdateInput,
} from './parameters';
import type { Producer } from './producers';
import type { ProductRecord, ProductWithImages, ProductImageRecord } from './product';
import type { ProductCustomFieldDefinition } from './custom-fields';
import type { AppProviderValue as DraftProvider } from '../system';
import type {
  ProductTagFilters,
  ProductTag,
  ProductTagCreateInput,
  ProductTagUpdateInput,
} from './tags';
import type {
  ProductShippingGroup,
  ProductShippingGroupCreateInput,
  ProductShippingGroupFilters,
  ProductShippingGroupUpdateInput,
} from './shipping-groups';
import type {
  ProductTitleTerm,
  ProductTitleTermCreateInput,
  ProductTitleTermFilters,
  ProductTitleTermType,
  ProductTitleTermUpdateInput,
} from './title-terms';
import type {
  ProductValidationPatternFormData,
  ProductValidationPattern,
  ProductValidationSemanticState,
  ProductValidationSemanticAuditSource,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
  ProductValidationDenyBehavior,
  SequenceGroupDraft,
  CreateProductValidationPatternInput,
  UpdateProductValidationPatternInput,
} from './validation';
import type { ProductValidationSemanticTransition } from '@/shared/lib/products/utils/validator-semantic-state';
export const productDraftOpenFormTabSchema = z.enum([
  'general',
  'marketplace-copy',
  'other',
  'custom-fields',
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
  'marketplace-copy',
  'other',
  'custom-fields',
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
  shippingGroupId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  producerIds: z.array(z.string()).optional(),
  customFields: z.array(productCustomFieldValueSchema).optional(),
  parameters: z.array(productParameterValueSchema).optional(),
  marketplaceContentOverrides: productMarketplaceContentOverrideDraftsSchema.optional(),
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
  importSource: productImportSourceSchema.nullable().optional(),
});

export type ProductDraft = z.infer<typeof productDraftSchema>;

export const createProductDraftSchema = productDraftSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductDraftInput = z.infer<typeof createProductDraftSchema>;

export const updateProductDraftSchema = createProductDraftSchema.partial();

export type UpdateProductDraftInput = Partial<CreateProductDraftInput>;

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

export type BaseFilters = {
  search?: string;
  skip?: number;
  limit?: number;
};

export type CustomFieldFilters = BaseFilters;
export type ProducerFilters = BaseFilters;

export type ParameterFilters = BaseFilters & {
  catalogId?: string;
};
export type ParameterCreateInput = ProductParameterCreateInput;
export type ParameterUpdateInput = ProductParameterUpdateInput;
export type CustomFieldCreateInput = ProductCustomFieldDefinitionCreateInput;
export type CustomFieldUpdateInput = ProductCustomFieldDefinitionUpdateInput;

export type ParameterRepository = {
  listParameters(filters: ParameterFilters): Promise<ProductParameter[]>;
  getParameterById(id: string): Promise<ProductParameter | null>;
  createParameter(data: ParameterCreateInput): Promise<ProductParameter>;
  bulkCreateParameters(data: ParameterCreateInput[]): Promise<ProductParameter[]>;
  updateParameter(id: string, data: ParameterUpdateInput): Promise<ProductParameter>;
  deleteParameter(id: string): Promise<void>;
  findByName(catalogId: string, name_en: string): Promise<ProductParameter | null>;
};

export type CustomFieldRepository = {
  listCustomFields(filters: BaseFilters): Promise<ProductCustomFieldDefinition[]>;
  getCustomFieldById(id: string): Promise<ProductCustomFieldDefinition | null>;
  createCustomField(data: CustomFieldCreateInput): Promise<ProductCustomFieldDefinition>;
  updateCustomField(id: string, data: CustomFieldUpdateInput): Promise<ProductCustomFieldDefinition>;
  deleteCustomField(id: string): Promise<void>;
  findByName(name: string): Promise<ProductCustomFieldDefinition | null>;
};

export type ProducerRepository = {
  listProducers(filters: BaseFilters): Promise<Producer[]>;
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
  getProductIds(filters: ProductFilters): Promise<string[]>;
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
  getProductIds(filters: ProductFilters): Promise<string[]>;
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

export type ShippingGroupFilters = ProductShippingGroupFilters;

export type ShippingGroupRepository = {
  listShippingGroups(filters: ShippingGroupFilters): Promise<ProductShippingGroup[]>;
  getShippingGroupById(id: string): Promise<ProductShippingGroup | null>;
  createShippingGroup(data: ProductShippingGroupCreateInput): Promise<ProductShippingGroup>;
  updateShippingGroup(
    id: string,
    data: ProductShippingGroupUpdateInput
  ): Promise<ProductShippingGroup>;
  deleteShippingGroup(id: string): Promise<void>;
  findByName(catalogId: string, name: string): Promise<ProductShippingGroup | null>;
};

export type TitleTermFilters = ProductTitleTermFilters;
export type TitleTermCreateInput = ProductTitleTermCreateInput;
export type TitleTermUpdateInput = ProductTitleTermUpdateInput;

export type TitleTermRepository = {
  listTitleTerms(filters: TitleTermFilters): Promise<ProductTitleTerm[]>;
  getTitleTermById(id: string): Promise<ProductTitleTerm | null>;
  createTitleTerm(data: TitleTermCreateInput): Promise<ProductTitleTerm>;
  updateTitleTerm(id: string, data: TitleTermUpdateInput): Promise<ProductTitleTerm>;
  deleteTitleTerm(id: string): Promise<void>;
  findByName(
    catalogId: string,
    type: ProductTitleTermType,
    name_en: string
  ): Promise<ProductTitleTerm | null>;
};

export type PatternFormData = ProductValidationPatternFormData;

export interface SequenceGroupView {
  id: string;
  label: string;
  debounceMs: number;
  patternIds: string[];
}

export type ValidatorPatternSimulatorInput = {
  key: string;
  fieldName: string;
  sourceMode: 'current_field' | 'form_field' | 'latest_product_field';
  label: string;
  placeholder: string;
};

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
  modalSemanticState: ProductValidationSemanticState | null;
  modalSemanticTransition: ProductValidationSemanticTransition;
  formData: PatternFormData;
  setFormData: (data: PatternFormData | ((prev: PatternFormData) => PatternFormData)) => void;
  testResult: unknown;
  simulatorScope: ProductValidationInstanceScope;
  setSimulatorScope: (scope: ProductValidationInstanceScope) => void;
  simulatorValues: Record<string, string>;
  setSimulatorValue: (key: string, value: string) => void;
  simulatorCategoryFixtures: string;
  setSimulatorCategoryFixtures: (value: string) => void;
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
  replacementFieldOptions: ReadonlyArray<LabeledOptionDto<string>>;
  sourceFieldOptions: ReadonlyArray<LabeledOptionDto<string>>;
  createPatternPending: boolean;
  updatePatternPending: boolean;
  isLocaleTarget: (target: string) => boolean;
  normalizeReplacementFields: (fields: unknown, target?: string) => string[];
  getReplacementFieldsForTarget: (target: string) => ReadonlyArray<LabeledOptionDto<string>>;
  getSourceFieldOptionsForTarget: (target: string) => ReadonlyArray<LabeledOptionDto<string>>;
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

export type ProductValidationPatternWriteOptions = {
  semanticAuditSource?: ProductValidationSemanticAuditSource;
};

export type ProductValidationPatternRepository = {
  listPatterns(): Promise<ProductValidationPattern[]>;
  getPatternById(id: string): Promise<ProductValidationPattern | null>;
  createPattern(
    data: CreateProductValidationPatternInput,
    options?: ProductValidationPatternWriteOptions
  ): Promise<ProductValidationPattern>;
  updatePattern(
    id: string,
    data: UpdateProductValidationPatternInput,
    options?: ProductValidationPatternWriteOptions
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
export type { DraftProvider };
