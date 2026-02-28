  'auto',
]);

export type ProductStudioSequenceGenerationModeDto = z.infer<
  typeof productStudioSequenceGenerationModeSchema
>;
export type ProductStudioSequenceGenerationMode = ProductStudioSequenceGenerationModeDto;

export const productStudioExecutionRouteSchema = z.enum([
  'studio_sequencer',
  'studio_native_sequencer_prior_generation',
  'ai_model_full_sequence',
  'ai_direct_generation',
]);

export type ProductStudioExecutionRouteDto = z.infer<typeof productStudioExecutionRouteSchema>;
export type ProductStudioExecutionRoute = ProductStudioExecutionRouteDto;

export const productStudioSequencingDiagnosticsScopeSchema = z.enum([
  'project',
  'global',
  'default',
]);

export type ProductStudioSequencingDiagnosticsScopeDto = z.infer<
  typeof productStudioSequencingDiagnosticsScopeSchema
>;
export type ProductStudioSequencingDiagnosticsScope = ProductStudioSequencingDiagnosticsScopeDto;

export const productStudioSequenceReadinessStateSchema = z.enum([
  'ready',
  'project_settings_missing',
  'project_sequence_disabled',
  'project_steps_empty',
  'project_snapshot_stale',
]);

export type ProductStudioSequenceReadinessStateDto = z.infer<
  typeof productStudioSequenceReadinessStateSchema
>;

export const productStudioSequencingConfigSchema = z.object({
  persistedEnabled: z.boolean(),
  enabled: z.boolean(),
  cropCenterBeforeGeneration: z.boolean(),
  upscaleOnAccept: z.boolean(),
  upscaleScale: z.number(),
  runViaSequence: z.boolean(),
  sequenceStepCount: z.number(),
  expectedOutputs: z.number(),
  snapshotHash: z.string().nullable(),
  snapshotSavedAt: z.string().nullable(),
  snapshotStepCount: z.number(),
  snapshotModelId: z.string().nullable(),
  currentSnapshotHash: z.string().nullable(),
  snapshotMatchesCurrent: z.boolean(),
  needsSaveDefaults: z.boolean(),
  needsSaveDefaultsReason: z.string().nullable(),
});

export type ProductStudioSequencingConfigDto = z.infer<typeof productStudioSequencingConfigSchema>;
export type ProductStudioSequencingConfig = ProductStudioSequencingConfigDto;

export const productStudioSequencingDiagnosticsSchema = z.object({
  projectId: z.string().nullable(),
  projectSettingsKey: z.string().nullable(),
  selectedSettingsKey: z.string().nullable(),
  selectedScope: productStudioSequencingDiagnosticsScopeSchema,
  hasProjectSettings: z.boolean(),
  hasGlobalSettings: z.boolean(),
  projectSequencingEnabled: z.boolean(),
  globalSequencingEnabled: z.boolean(),
  selectedSequencingEnabled: z.boolean(),
  selectedSnapshotHash: z.string().nullable(),
  selectedSnapshotSavedAt: z.string().nullable(),
  selectedSnapshotStepCount: z.number(),
  selectedSnapshotModelId: z.string().nullable(),
});

export type ProductStudioSequencingDiagnosticsDto = z.infer<
  typeof productStudioSequencingDiagnosticsSchema
>;
export type ProductStudioSequencingDiagnostics = ProductStudioSequencingDiagnosticsDto;

export const productStudioSequenceReadinessSchema = z.object({
  ready: z.boolean(),
  requiresProjectSequence: z.boolean(),
  state: productStudioSequenceReadinessStateSchema,
  message: z.string().nullable(),
});

export type ProductStudioSequenceReadinessDto = z.infer<
  typeof productStudioSequenceReadinessSchema
>;
export type ProductStudioSequenceReadiness = ProductStudioSequenceReadinessDto;

export const DEFAULT_PRODUCT_STUDIO_SEQUENCE_READINESS: ProductStudioSequenceReadiness = {
  ready: false,
  requiresProjectSequence: false,
  state: 'project_settings_missing',
  message: 'Loading...',
};

export function normalizeProductStudioSequenceGenerationMode(
  value: unknown
): ProductStudioSequenceGenerationMode {
  if (
    value === 'studio_prompt_then_sequence' ||
    value === 'model_full_sequence' ||
    value === 'studio_native_sequencer_prior_generation' ||
    value === 'auto'
  ) {
    return value;
  }
  return 'auto';
}

/**
 * Product Draft Contracts
 */
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

export type CatalogCreateInput = CatalogCreateInputDto;
export type CatalogUpdateInput = CatalogUpdateInputDto;

export type CatalogRepository = {
  listCatalogs(): Promise<CatalogRecord[]>;
  getCatalogById(id: string): Promise<CatalogRecord | null>;
  createCatalog(input: CatalogCreateInput): Promise<CatalogRecord>;
  updateCatalog(id: string, input: CatalogUpdateInput): Promise<CatalogRecord | null>;
  deleteCatalog(id: string): Promise<void>;
  getCatalogsByIds(ids: string[]): Promise<CatalogRecord[]>;
  setDefaultCatalog(id: string): Promise<void>;
};

export type CategoryFilters = ProductCategoryFiltersDto;

export type CategoryRepository = {
  listCategories(filters: CategoryFilters): Promise<ProductCategory[]>;
  getCategoryTree(catalogId?: string): Promise<ProductCategoryWithChildren[]>;
  getCategoryById(id: string): Promise<ProductCategory | null>;
  getCategoryWithChildren(id: string): Promise<ProductCategoryWithChildren | null>;
  createCategory(data: CreateProductCategoryDto): Promise<ProductCategory>;
  updateCategory(id: string, data: UpdateProductCategoryDto): Promise<ProductCategory>;
  deleteCategory(id: string): Promise<void>;
  findByName(
    catalogId: string,
    name: string,
    parentId?: string | null
  ): Promise<ProductCategory | null>;
  isDescendant(categoryId: string, targetId: string): Promise<boolean>;
};

export type ParameterFilters = ProductParameterFiltersDto;
export type ParameterCreateInput = ProductParameterCreateInputDto;
export type ParameterUpdateInput = ProductParameterUpdateInputDto;

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

export type ProductFilters = Partial<ProductFilterDto> & {
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
  createProduct(data: ProductCreateInputDto): Promise<ProductRecord>;
  bulkCreateProducts(data: ProductCreateInputDto[]): Promise<number>;
  updateProduct(id: string, data: ProductUpdateInputDto): Promise<ProductRecord | null>;
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

export type TagFilters = ProductTagFiltersDto;

export type TagRepository = {
  listTags(filters: TagFilters): Promise<ProductTag[]>;
  getTagById(id: string): Promise<ProductTag | null>;
  createTag(data: ProductTagCreateInputDto): Promise<ProductTag>;
  updateTag(id: string, data: ProductTagUpdateInputDto): Promise<ProductTag>;
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

export type ProductFormData = ProductCreateInputDto;

export type ProductListPreferences = ProductListPreferencesDto;

export type ProductImageSlot = ManagedImageSlot;
