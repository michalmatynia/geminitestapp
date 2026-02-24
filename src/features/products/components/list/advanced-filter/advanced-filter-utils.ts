import {
  productAdvancedFilterGroupSchema,
  type ProductAdvancedFilterCondition,
  type ProductAdvancedFilterField,
  type ProductAdvancedFilterGroup,
  type ProductAdvancedFilterOperator,
  type ProductAdvancedFilterPreset,
} from '@/shared/contracts/products';

export type AdvancedFieldKind = 'string' | 'number' | 'date';

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
    field: 'categoryId',
    label: 'Category',
    kind: 'string',
    operators: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
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
  gt: 'Greater Than',
  gte: 'Greater Than or Equal',
  lt: 'Less Than',
  lte: 'Less Than or Equal',
  between: 'Between',
  isEmpty: 'Is Empty',
  isNotEmpty: 'Is Not Empty',
};

const DEFAULT_FIELD: ProductAdvancedFilterField = 'name';

export const createRuleId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rule_${Date.now()}_${Math.floor(Math.random() * 100_000)}`;
};

export const getFieldConfig = (
  field: ProductAdvancedFilterField
): AdvancedFilterFieldConfig => {
  const found = ADVANCED_FILTER_FIELD_CONFIGS.find(
    (config: AdvancedFilterFieldConfig) => config.field === field
  );
  return found ?? ADVANCED_FILTER_FIELD_CONFIGS[0]!;
};

export const getDefaultOperatorForField = (
  field: ProductAdvancedFilterField
): ProductAdvancedFilterOperator => {
  return getFieldConfig(field).operators[0] ?? 'contains';
};

export const createEmptyCondition = (
  field: ProductAdvancedFilterField = DEFAULT_FIELD
): ProductAdvancedFilterCondition => ({
  type: 'condition',
  id: createRuleId(),
  field,
  operator: getDefaultOperatorForField(field),
});

export const createEmptyGroup = (): ProductAdvancedFilterGroup => ({
  type: 'group',
  id: createRuleId(),
  combinator: 'and',
  not: false,
  rules: [createEmptyCondition()],
});

export const parseAdvancedFilterPayload = (
  payload: string | null | undefined
): ProductAdvancedFilterGroup | null => {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload);
    const validated = productAdvancedFilterGroupSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
};

export const parseAdvancedFilterPayloadOrDefault = (
  payload: string | null | undefined
): ProductAdvancedFilterGroup => {
  return parseAdvancedFilterPayload(payload) ?? createEmptyGroup();
};

export const serializeAdvancedFilterPayload = (
  group: ProductAdvancedFilterGroup
): string => JSON.stringify(group);

export const supportsOperator = (
  field: ProductAdvancedFilterField,
  operator: ProductAdvancedFilterOperator
): boolean => {
  return getFieldConfig(field).operators.includes(operator);
};

export const isValueRequired = (
  operator: ProductAdvancedFilterOperator
): boolean => {
  return operator !== 'isEmpty' && operator !== 'isNotEmpty';
};

export const isSecondValueRequired = (
  operator: ProductAdvancedFilterOperator
): boolean => operator === 'between';

export const normalizeConditionValue = (
  kind: AdvancedFieldKind,
  value: string
): string | number => {
  if (kind === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
};

export const findPresetById = (
  presets: ProductAdvancedFilterPreset[],
  presetId: string
): ProductAdvancedFilterPreset | null => {
  return presets.find((preset: ProductAdvancedFilterPreset) => preset.id === presetId) ?? null;
};
