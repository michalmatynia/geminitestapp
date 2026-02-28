  }
}, z.array(productParameterValueSchema).optional());

export const productCreateInputSchema = z.object({
  id: z.string().nullable().optional(),
  baseProductId: z.string().nullable().optional(),
  defaultPriceGroupId: z.string().nullable().optional(),
  sku: z.preprocess(
    (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1, 'SKU is required for new products')
  ),
  ean: z.string().nullable().optional(),
  gtin: z.string().nullable().optional(),
  asin: z.string().nullable().optional(),
  name_en: z.string().nullable().optional(),
  name_pl: z.string().nullable().optional(),
  name_de: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  description_pl: z.string().nullable().optional(),
  description_de: z.string().nullable().optional(),
  price: optionalNonNegativeNumberFromFormSchema,
  supplierName: z.string().nullable().optional(),
  supplierLink: z.string().nullable().optional(),
  priceComment: z.string().nullable().optional(),
  stock: optionalNonNegativeIntFromFormSchema,
  sizeLength: optionalNonNegativeNumberFromFormSchema,
  sizeWidth: optionalNonNegativeNumberFromFormSchema,
  weight: optionalNonNegativeNumberFromFormSchema,
  length: optionalNonNegativeNumberFromFormSchema,
  categoryId: z.string().nullable().optional(),
  catalogIds: optionalStringArrayFromFormSchema,
  tagIds: optionalStringArrayFromFormSchema,
  producerIds: optionalStringArrayFromFormSchema,
  noteIds: optionalStringArrayFromFormSchema,
  studioProjectId: z.string().nullable().optional(),
  imageLinks: optionalStringArrayFromFormSchema,
  imageFileIds: optionalStringArrayFromFormSchema,
  imageBase64s: optionalStringArrayFromFormSchema,

  parameters: optionalParameterValuesFromFormSchema,
});

export type ProductCreateInputDto = z.infer<typeof productCreateInputSchema>;
export type CreateProductInput = ProductCreateInputDto;
export type ProductCreateInput = ProductCreateInputDto;

export const productUpdateInputSchema = productCreateInputSchema.partial().extend({
  sku: z.preprocess((value: unknown): unknown => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, z.string().min(1).nullable().optional()),
});

export type ProductUpdateInputDto = z.infer<typeof productUpdateInputSchema>;
export type UpdateProductInput = ProductUpdateInputDto;
export type ProductUpdateInput = ProductUpdateInputDto;

export const createProductSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type CreateProduct = CreateProductDto;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProductDto = z.infer<typeof updateProductSchema>;

/**
 * Product Domain Enums & DTOs
 */

export const productDbProviderSchema = z.enum(['prisma', 'mongodb']);
export type ProductDbProviderDto = z.infer<typeof productDbProviderSchema>;
export type ProductDbProvider = ProductDbProviderDto;

export const integrationDbProviderSchema = z.enum(['prisma', 'mongodb']);
export type IntegrationDbProviderDto = z.infer<typeof integrationDbProviderSchema>;
export type IntegrationDbProvider = IntegrationDbProviderDto;

export const productMigrationDirectionSchema = z.enum(['prisma-to-mongo', 'mongo-to-prisma']);
export type ProductMigrationDirectionDto = z.infer<typeof productMigrationDirectionSchema>;
export type ProductMigrationDirection = ProductMigrationDirectionDto;

export const syncDirectionSchema = z.enum(['to_base', 'from_base', 'bidirectional']);
export type SyncDirectionDto = z.infer<typeof syncDirectionSchema>;
export type SyncDirection = SyncDirectionDto;

export const priceGroupTypeSchema = z.enum(['standard', 'dependent']);
export type PriceGroupTypeDto = z.infer<typeof priceGroupTypeSchema>;
export type PriceGroupType = PriceGroupTypeDto;

export const productMigrationBatchResultSchema = z.object({
  direction: productMigrationDirectionSchema,
  productsProcessed: z.number(),
  productsUpserted: z.number(),
  nextCursor: z.string().nullable(),
  missingImageFileIds: z.array(z.string()),
  missingCatalogIds: z.array(z.string()),
});

export type ProductMigrationBatchResultDto = z.infer<typeof productMigrationBatchResultSchema>;
export type ProductMigrationBatchResult = ProductMigrationBatchResultDto;

export const productAdvancedFilterFieldSchema = z.enum([
  'id',
  'sku',
  'name',
  'description',
  'categoryId',
  'catalogId',
  'tagId',
  'producerId',
  'price',
  'stock',
  'published',
  'baseExported',
  'baseProductId',
  'createdAt',
]);

export type ProductAdvancedFilterFieldDto = z.infer<typeof productAdvancedFilterFieldSchema>;
export type ProductAdvancedFilterField = ProductAdvancedFilterFieldDto;

export const productAdvancedFilterOperatorSchema = z.enum([
  'contains',
  'eq',
  'neq',
  'in',
  'notIn',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'isEmpty',
  'isNotEmpty',
]);

export type ProductAdvancedFilterOperatorDto = z.infer<typeof productAdvancedFilterOperatorSchema>;
export type ProductAdvancedFilterOperator = ProductAdvancedFilterOperatorDto;

export const productAdvancedFilterCombinatorSchema = z.enum(['and', 'or']);

export type ProductAdvancedFilterCombinatorDto = z.infer<
  typeof productAdvancedFilterCombinatorSchema
>;
export type ProductAdvancedFilterCombinator = ProductAdvancedFilterCombinatorDto;

export const PRODUCT_ADVANCED_FILTER_MAX_DEPTH = 5;
export const PRODUCT_ADVANCED_FILTER_MAX_RULES = 40;
export const PRODUCT_ADVANCED_FILTER_MAX_SET_ITEMS = 50;

const productAdvancedFilterScalarValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const productAdvancedFilterValueSchema = z.union([
  productAdvancedFilterScalarValueSchema,
  z.array(productAdvancedFilterScalarValueSchema),
]);

type ProductAdvancedScalarValue = z.infer<typeof productAdvancedFilterScalarValueSchema>;

const PRODUCT_ADVANCED_FILTER_OPERATOR_COMPATIBILITY: Record<
  ProductAdvancedFilterField,
  readonly ProductAdvancedFilterOperator[]
> = {
  id: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  sku: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  name: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  description: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  categoryId: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  catalogId: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  tagId: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  producerId: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  price: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  stock: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  published: ['eq', 'neq'],
  baseExported: ['eq', 'neq'],
  baseProductId: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  createdAt: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
};

export const productAdvancedFilterConditionSchema = z.object({
  type: z.literal('condition'),
  id: z.string().trim().min(1),
  field: productAdvancedFilterFieldSchema,
  operator: productAdvancedFilterOperatorSchema,
  value: productAdvancedFilterValueSchema.optional(),
  valueTo: productAdvancedFilterValueSchema.optional(),
});

export type ProductAdvancedFilterConditionDto = z.infer<
  typeof productAdvancedFilterConditionSchema
>;
export type ProductAdvancedFilterCondition = ProductAdvancedFilterConditionDto;

export interface ProductAdvancedFilterGroupDto {
  type: 'group';
  id: string;
  combinator: ProductAdvancedFilterCombinator;
  not: boolean;
  rules: Array<ProductAdvancedFilterConditionDto | ProductAdvancedFilterGroupDto>;
}

export type ProductAdvancedFilterGroup = ProductAdvancedFilterGroupDto;

const productAdvancedFilterGroupBaseSchema: z.ZodType<ProductAdvancedFilterGroupDto> = z.object({
  type: z.literal('group'),
  id: z.string().trim().min(1),
  combinator: productAdvancedFilterCombinatorSchema,
  not: z.boolean().default(false),
  rules: z
    .array(
      z.union([
        productAdvancedFilterConditionSchema,
        z.lazy(() => productAdvancedFilterGroupBaseSchema),
      ])
    )
    .min(1),
});

export type ProductAdvancedFilterRuleDto =
  | ProductAdvancedFilterConditionDto
  | ProductAdvancedFilterGroupDto;
export type ProductAdvancedFilterRule = ProductAdvancedFilterRuleDto;

const PRODUCT_ADVANCED_STRING_FIELDS = new Set<ProductAdvancedFilterField>([
  'id',
  'sku',
  'name',
  'description',
  'categoryId',
  'catalogId',
  'tagId',
  'producerId',
  'baseProductId',
]);

const PRODUCT_ADVANCED_NUMERIC_FIELDS = new Set<ProductAdvancedFilterField>(['price', 'stock']);

const PRODUCT_ADVANCED_DATE_FIELDS = new Set<ProductAdvancedFilterField>(['createdAt']);

const PRODUCT_ADVANCED_BOOLEAN_FIELDS = new Set<ProductAdvancedFilterField>([
  'published',
  'baseExported',
]);

const isAdvancedStringValue = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isAdvancedNumberValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isAdvancedBooleanValue = (value: unknown): value is boolean => typeof value === 'boolean';

const isAdvancedDateValue = (value: unknown): value is string | number => {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return typeof value === 'string' && value.trim().length > 0;
};

const validateAdvancedFilterScalarValue = (
  field: ProductAdvancedFilterField,
  value: unknown
): value is ProductAdvancedScalarValue => {
  if (PRODUCT_ADVANCED_STRING_FIELDS.has(field)) {
    return isAdvancedStringValue(value);
  }
  if (PRODUCT_ADVANCED_NUMERIC_FIELDS.has(field)) {
    return isAdvancedNumberValue(value);
  }
  if (PRODUCT_ADVANCED_DATE_FIELDS.has(field)) {
    return isAdvancedDateValue(value);
  }
  if (PRODUCT_ADVANCED_BOOLEAN_FIELDS.has(field)) {
    return isAdvancedBooleanValue(value);
  }
  return false;
};

const validateAdvancedFilterCondition = (
  condition: ProductAdvancedFilterConditionDto,
  path: Array<string | number>,
  ctx: z.RefinementCtx
): void => {
  const allowedOperators = PRODUCT_ADVANCED_FILTER_OPERATOR_COMPATIBILITY[condition.field];
  if (!allowedOperators.includes(condition.operator)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'operator'],
      message: `Operator "${condition.operator}" is not allowed for field "${condition.field}".`,
    });
    return;
  }

  if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
    if (condition.value !== undefined || condition.valueTo !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `Operator "${condition.operator}" does not accept value inputs.`,
      });
    }
    return;
  }

  if (condition.operator === 'between') {
    if (Array.isArray(condition.value) || Array.isArray(condition.valueTo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: 'Operator "between" expects scalar values for value and valueTo.',
      });
      return;
    }
    if (
      !validateAdvancedFilterScalarValue(condition.field, condition.value) ||
      !validateAdvancedFilterScalarValue(condition.field, condition.valueTo)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `Operator "between" requires valid scalar values for field "${condition.field}".`,
      });
    }
    return;
  }

  if (condition.operator === 'in' || condition.operator === 'notIn') {
    if (!Array.isArray(condition.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'value'],
        message: `Operator "${condition.operator}" requires an array value.`,
      });
      return;
    }
    if (condition.value.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'value'],
        message: `Operator "${condition.operator}" requires at least one value.`,
      });
    }
    if (condition.value.length > PRODUCT_ADVANCED_FILTER_MAX_SET_ITEMS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'value'],
        message: `Operator "${condition.operator}" supports up to ${PRODUCT_ADVANCED_FILTER_MAX_SET_ITEMS} values.`,
      });
    }
    const hasInvalidValue = condition.value.some(
      (value: unknown) => !validateAdvancedFilterScalarValue(condition.field, value)
    );
    if (hasInvalidValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'value'],
        message: `Operator "${condition.operator}" has invalid value type for field "${condition.field}".`,
      });
    }
    if (condition.valueTo !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'valueTo'],
        message: `Operator "${condition.operator}" does not use valueTo.`,
      });
    }
    return;
  }

  if (Array.isArray(condition.value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'value'],
      message: `Operator "${condition.operator}" requires a scalar value.`,
    });
    return;
  }

  if (!validateAdvancedFilterScalarValue(condition.field, condition.value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'value'],
      message: `Invalid value type for field "${condition.field}" and operator "${condition.operator}".`,
    });
  }

  if (condition.valueTo !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'valueTo'],
      message: `Operator "${condition.operator}" does not use valueTo.`,
    });
  }
};

export type ProductAdvancedFilterMetrics = {
  depth: number;
  rules: number;
  setItems: number;
};

export const getProductAdvancedFilterMetrics = (
  root: ProductAdvancedFilterGroupDto
): ProductAdvancedFilterMetrics => {
  let depth = 1;
  let rules = 0;
  let setItems = 0;

  const walk = (group: ProductAdvancedFilterGroupDto, currentDepth: number): void => {
    depth = Math.max(depth, currentDepth);
    group.rules.forEach((rule: ProductAdvancedFilterRuleDto) => {
      rules += 1;
      if (
        rule.type === 'condition' &&
        (rule.operator === 'in' || rule.operator === 'notIn') &&
        Array.isArray(rule.value)
      ) {
        setItems += rule.value.length;
      }
      if (rule.type === 'group') {
        walk(rule, currentDepth + 1);
      }
    });
  };

  walk(root, 1);
  return { depth, rules, setItems };
};

export const productAdvancedFilterGroupSchema: z.ZodType<ProductAdvancedFilterGroupDto> =
  productAdvancedFilterGroupBaseSchema.superRefine((group: ProductAdvancedFilterGroupDto, ctx) => {
    const metrics = getProductAdvancedFilterMetrics(group);
    if (metrics.depth > PRODUCT_ADVANCED_FILTER_MAX_DEPTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rules'],
        message: `Advanced filter max depth is ${PRODUCT_ADVANCED_FILTER_MAX_DEPTH}.`,
      });
    }
    if (metrics.rules > PRODUCT_ADVANCED_FILTER_MAX_RULES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rules'],
        message: `Advanced filter supports up to ${PRODUCT_ADVANCED_FILTER_MAX_RULES} rules.`,
      });
    }

    const walk = (
      nestedGroup: ProductAdvancedFilterGroupDto,
      path: Array<string | number>
    ): void => {
      nestedGroup.rules.forEach((rule: ProductAdvancedFilterRuleDto, index: number) => {
        const nextPath = [...path, 'rules', index];
        if (rule.type === 'condition') {
          validateAdvancedFilterCondition(rule, nextPath, ctx);
          return;
        }
        walk(rule, nextPath);
      });
    };

    walk(group, []);
  });

export const productAdvancedFilterPresetSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  filter: productAdvancedFilterGroupSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ProductAdvancedFilterPresetDto = z.infer<typeof productAdvancedFilterPresetSchema>;
export type ProductAdvancedFilterPreset = ProductAdvancedFilterPresetDto;

export const productAdvancedFilterPresetBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  presets: z.array(productAdvancedFilterPresetSchema),
});

export type ProductAdvancedFilterPresetBundleDto = z.infer<
  typeof productAdvancedFilterPresetBundleSchema
>;
export type ProductAdvancedFilterPresetBundle = ProductAdvancedFilterPresetBundleDto;

export const productListPreferencesSchema = z.object({
