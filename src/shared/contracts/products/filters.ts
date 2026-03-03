import { z } from 'zod';
import { commonListQuerySchema } from '../../validations/api-schemas';
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

export type ProductAdvancedFilterField = z.infer<typeof productAdvancedFilterFieldSchema>;

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

export type ProductAdvancedFilterOperator = z.infer<typeof productAdvancedFilterOperatorSchema>;

export const productAdvancedFilterCombinatorSchema = z.enum(['and', 'or']);

export type ProductAdvancedFilterCombinator = z.infer<
  typeof productAdvancedFilterCombinatorSchema
>;

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

export type ProductAdvancedFilterCondition = z.infer<
  typeof productAdvancedFilterConditionSchema
>;

export interface ProductAdvancedFilterGroup {
  type: 'group';
  id: string;
  combinator: ProductAdvancedFilterCombinator;
  not: boolean;
  rules: Array<ProductAdvancedFilterCondition | ProductAdvancedFilterGroup>;
}

const productAdvancedFilterGroupBaseSchema: z.ZodType<ProductAdvancedFilterGroup> = z.object({
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

export type ProductAdvancedFilterRule =
  | ProductAdvancedFilterCondition
  | ProductAdvancedFilterGroup;

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
  condition: ProductAdvancedFilterCondition,
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
  root: ProductAdvancedFilterGroup
): ProductAdvancedFilterMetrics => {
  let depth = 1;
  let rules = 0;
  let setItems = 0;

  const walk = (group: ProductAdvancedFilterGroup, currentDepth: number): void => {
    depth = Math.max(depth, currentDepth);
    group.rules.forEach((rule: ProductAdvancedFilterRule) => {
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

export const productAdvancedFilterGroupSchema: z.ZodType<ProductAdvancedFilterGroup> =
  productAdvancedFilterGroupBaseSchema.superRefine((group: ProductAdvancedFilterGroup, ctx) => {
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
      nestedGroup: ProductAdvancedFilterGroup,
      path: Array<string | number>
    ): void => {
      nestedGroup.rules.forEach((rule: ProductAdvancedFilterRule, index: number) => {
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

export type ProductAdvancedFilterPreset = z.infer<typeof productAdvancedFilterPresetSchema>;

export const productAdvancedFilterPresetBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  presets: z.array(productAdvancedFilterPresetSchema),
});

export type ProductAdvancedFilterPresetBundle = z.infer<
  typeof productAdvancedFilterPresetBundleSchema
>;

export const productListPreferencesSchema = z.object({
  nameLocale: z.enum(['name_en', 'name_pl', 'name_de']),
  catalogFilter: z.string(),
  currencyCode: z.string().nullable(),
  pageSize: z.number(),
  thumbnailSource: z.enum(['file', 'link', 'base64']),
  filtersCollapsedByDefault: z.boolean(),
  advancedFilterPresets: z.array(productAdvancedFilterPresetSchema),
  appliedAdvancedFilter: z.string(),
  appliedAdvancedFilterPresetId: z.string().nullable(),
});

export type ProductListPreferences = z.infer<typeof productListPreferencesSchema>;

/**
 * Product Filter Contract
 */
export const productStockOperatorSchema = z.enum(['gt', 'gte', 'lt', 'lte', 'eq']);

export type ProductStockOperator = z.infer<typeof productStockOperatorSchema>;

const getAdvancedFilterPayloadValidationError = (value: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    const result = productAdvancedFilterGroupSchema.safeParse(parsed);
    if (result.success) return null;
    return result.error.issues[0]?.message ?? 'Invalid advancedFilter payload.';
  } catch {
    return 'advancedFilter must be valid JSON.';
  }
};

const PRODUCT_FILTER_PAGE_SIZE_DEFAULT = 20;
const PRODUCT_FILTER_PAGE_SIZE_MAX = 48;

export const productFilterSchema = commonListQuerySchema.extend({
  pageSize: z.preprocess((value: unknown) => {
    const parsed =
      typeof value === 'number'
        ? Math.trunc(value)
        : typeof value === 'string'
          ? Number.parseInt(value, 10)
          : Number.NaN;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return PRODUCT_FILTER_PAGE_SIZE_DEFAULT;
    }
    return Math.min(PRODUCT_FILTER_PAGE_SIZE_MAX, parsed);
  }, z.number().int().min(1).max(PRODUCT_FILTER_PAGE_SIZE_MAX).default(PRODUCT_FILTER_PAGE_SIZE_DEFAULT)),
  id: z.string().trim().optional(),
  idMatchMode: z.enum(['exact', 'partial']).optional(),
  sku: z.string().trim().optional(),
  description: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  stockValue: z.coerce.number().int().min(0).optional(),
  stockOperator: productStockOperatorSchema.optional(),
  catalogId: z.string().trim().optional(),
  searchLanguage: z.enum(['name_en', 'name_pl', 'name_de']).optional(),
  advancedFilter: z.preprocess(
    (value: unknown) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value !== 'string') return value;
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : undefined;
    },
    z
      .string()
      .superRefine((value: string, ctx) => {
        const errorMessage = getAdvancedFilterPayloadValidationError(value);
        if (!errorMessage) return;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: errorMessage,
        });
      })
      .optional()
  ),
  baseExported: z.preprocess((value: unknown) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return undefined;
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }
    return value;
  }, z.boolean().optional()),
});

export type ProductFilter = z.infer<typeof productFilterSchema>;
export type ProductFilterInput = z.input<typeof productFilterSchema>;

/**
 * Validation Contracts
 */
