import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  ProductAdvancedFilterField,
  ProductAdvancedFilterOperator,
} from '@/shared/contracts/products';

export type AdvancedFieldKind = 'string' | 'number' | 'date' | 'boolean';

export type AdvancedFilterFieldConfig = {
  field: ProductAdvancedFilterField;
  label: string;
  kind: AdvancedFieldKind;
  operators: ProductAdvancedFilterOperator[];
};

export const ADVANCED_FILTER_FIELD_CONFIGS: readonly AdvancedFilterFieldConfig[] = [
  {
    field: 'id',
    label: 'Product ID',
    kind: 'string',
    operators: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'sku',
    label: 'SKU',
    kind: 'string',
    operators: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'name',
    label: 'Name',
    kind: 'string',
    operators: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'description',
    label: 'Description',
    kind: 'string',
    operators: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'titleSize',
    label: 'Title Size',
    kind: 'string',
    operators: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'titleMaterial',
    label: 'Title Material',
    kind: 'string',
    operators: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'titleTheme',
    label: 'Title Theme / Lore',
    kind: 'string',
    operators: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'categoryId',
    label: 'Category',
    kind: 'string',
    operators: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'catalogId',
    label: 'Catalog ID',
    kind: 'string',
    operators: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'tagId',
    label: 'Tag ID',
    kind: 'string',
    operators: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'producerId',
    label: 'Producer ID',
    kind: 'string',
    operators: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'price',
    label: 'Price',
    kind: 'number',
    operators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'stock',
    label: 'Stock',
    kind: 'number',
    operators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'published',
    label: 'Published',
    kind: 'boolean',
    operators: ['eq', 'neq'],
  },
  {
    field: 'baseExported',
    label: 'Base Exported',
    kind: 'boolean',
    operators: ['eq', 'neq'],
  },
  {
    field: 'baseProductId',
    label: 'Base Product ID',
    kind: 'string',
    operators: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  },
  {
    field: 'createdAt',
    label: 'Created At',
    kind: 'date',
    operators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  },
];

export const ADVANCED_OPERATOR_LABELS: Record<ProductAdvancedFilterOperator, string> = {
  contains: 'Contains',
  eq: 'Equals',
  neq: 'Not Equal',
  in: 'In',
  notIn: 'Not In',
  gt: 'Greater Than',
  gte: 'Greater Than or Equal',
  lt: 'Less Than',
  lte: 'Less Than or Equal',
  between: 'Between',
  isEmpty: 'Is Empty',
  isNotEmpty: 'Is Not Empty',
};

export const ADVANCED_BOOLEAN_OPTIONS = [
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const getFieldConfig = (field: ProductAdvancedFilterField): AdvancedFilterFieldConfig => {
  const found = ADVANCED_FILTER_FIELD_CONFIGS.find((config) => config.field === field);
  if (found !== undefined) return found;
  const [defaultConfig] = ADVANCED_FILTER_FIELD_CONFIGS;
  if (defaultConfig === undefined) {
    throw new Error('Advanced filter field configuration is empty.');
  }
  return defaultConfig;
};

export const getDefaultOperatorForField = (
  field: ProductAdvancedFilterField
): ProductAdvancedFilterOperator => getFieldConfig(field).operators[0] ?? 'contains';

export const supportsOperator = (
  field: ProductAdvancedFilterField,
  operator: ProductAdvancedFilterOperator
): boolean => getFieldConfig(field).operators.includes(operator);

export const isValueRequired = (operator: ProductAdvancedFilterOperator): boolean =>
  operator !== 'isEmpty' && operator !== 'isNotEmpty';

export const isSecondValueRequired = (operator: ProductAdvancedFilterOperator): boolean =>
  operator === 'between';

export const isMultiValueOperator = (operator: ProductAdvancedFilterOperator): boolean =>
  operator === 'in' || operator === 'notIn';

export const normalizeConditionValue = (
  kind: AdvancedFieldKind,
  value: string
): string | number | boolean => {
  if (kind === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (kind === 'boolean') return value.trim().toLowerCase() === 'true';
  return value;
};

export const serializeMultiValue = (
  values: Array<string | number | boolean | null> | undefined
): string => {
  if (!Array.isArray(values)) return '';
  return values
    .map((value) => (value === null ? '' : String(value).trim()))
    .filter((value) => value.length > 0)
    .join(', ');
};

export const normalizeMultiValueInput = (
  kind: AdvancedFieldKind,
  rawValue: string
): Array<string | number | boolean> =>
  rawValue
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => normalizeConditionValue(kind, part));
