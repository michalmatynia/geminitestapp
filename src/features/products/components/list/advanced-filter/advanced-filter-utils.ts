import {
  productAdvancedFilterGroupSchema,
  productAdvancedFilterPresetBundleSchema,
  type ProductAdvancedFilterCondition,
  type ProductAdvancedFilterField,
  type ProductAdvancedFilterGroup,
  type ProductAdvancedFilterOperator,
  type ProductAdvancedFilterPreset,
  type ProductAdvancedFilterRule,
} from '@/shared/contracts/products';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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

const DEFAULT_FIELD: ProductAdvancedFilterField = 'name';

export const createRuleId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rule_${Date.now()}_${Math.floor(Math.random() * 100_000)}`;
};

export const getFieldConfig = (field: ProductAdvancedFilterField): AdvancedFilterFieldConfig => {
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

export const appendConditionToGroup = (
  group: ProductAdvancedFilterGroup
): ProductAdvancedFilterGroup => ({
  ...group,
  rules: [...group.rules, createEmptyCondition()],
});

export const appendGroupToGroup = (
  group: ProductAdvancedFilterGroup
): ProductAdvancedFilterGroup => ({
  ...group,
  rules: [...group.rules, createEmptyGroup()],
});

export const replaceRuleInGroup = (
  group: ProductAdvancedFilterGroup,
  ruleId: string,
  nextRule: ProductAdvancedFilterRule
): ProductAdvancedFilterGroup => ({
  ...group,
  rules: group.rules.map((rule: ProductAdvancedFilterRule) =>
    rule.id === ruleId ? nextRule : rule
  ),
});

export const removeRuleFromGroup = (
  group: ProductAdvancedFilterGroup,
  ruleId: string
): ProductAdvancedFilterGroup => {
  const nextRules = group.rules.filter((rule: ProductAdvancedFilterRule) => rule.id !== ruleId);
  return {
    ...group,
    rules: nextRules.length > 0 ? nextRules : [createEmptyCondition()],
  };
};

export const moveRuleInGroup = (
  group: ProductAdvancedFilterGroup,
  ruleId: string,
  direction: -1 | 1
): ProductAdvancedFilterGroup | null => {
  const currentIndex = group.rules.findIndex((rule: ProductAdvancedFilterRule) => rule.id === ruleId);
  if (currentIndex < 0) return null;

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= group.rules.length) {
    return null;
  }

  const nextRules = [...group.rules];
  const [movedRule] = nextRules.splice(currentIndex, 1);
  if (!movedRule) return null;

  nextRules.splice(targetIndex, 0, movedRule);
  return {
    ...group,
    rules: nextRules,
  };
};

export const duplicateRuleInGroup = (
  group: ProductAdvancedFilterGroup,
  ruleId: string
): ProductAdvancedFilterGroup | null => {
  const currentIndex = group.rules.findIndex((rule: ProductAdvancedFilterRule) => rule.id === ruleId);
  if (currentIndex < 0) return null;

  const sourceRule = group.rules[currentIndex];
  if (!sourceRule) return null;

  const nextRules = [...group.rules];
  nextRules.splice(currentIndex + 1, 0, duplicateRuleWithNewIds(sourceRule));
  return {
    ...group,
    rules: nextRules,
  };
};

export const stripConditionValues = (
  condition: ProductAdvancedFilterCondition
): ProductAdvancedFilterCondition => {
  const { value: _value, valueTo: _valueTo, ...rest } = condition;
  return rest as ProductAdvancedFilterCondition;
};

export const stripConditionValueTo = (
  condition: ProductAdvancedFilterCondition
): ProductAdvancedFilterCondition => {
  const { valueTo: _valueTo, ...rest } = condition;
  return rest as ProductAdvancedFilterCondition;
};

export const duplicateRuleWithNewIds = (
  rule: ProductAdvancedFilterRule
): ProductAdvancedFilterRule => {
  if (rule.type === 'condition') {
    return {
      ...rule,
      id: createRuleId(),
    };
  }

  return {
    ...rule,
    id: createRuleId(),
    rules: rule.rules.map((child: ProductAdvancedFilterRule) => duplicateRuleWithNewIds(child)),
  };
};

export const buildConditionValidationMessage = (
  condition: ProductAdvancedFilterCondition
): string | null => {
  if (!isValueRequired(condition.operator)) {
    return null;
  }

  const fieldConfig = getFieldConfig(condition.field);
  const valueKind = fieldConfig.kind;

  if (isMultiValueOperator(condition.operator)) {
    if (!Array.isArray(condition.value) || condition.value.length === 0) {
      return 'At least one value is required.';
    }
    if (
      valueKind === 'number' &&
      condition.value.some((value: unknown) => typeof value !== 'number' || !Number.isFinite(value))
    ) {
      return 'All values must be numbers.';
    }
    return null;
  }

  if (
    condition.value === undefined ||
    condition.value === null ||
    (typeof condition.value === 'string' && condition.value.trim().length === 0)
  ) {
    return 'Value is required.';
  }

  if (Array.isArray(condition.value)) {
    return 'Value must be a single item.';
  }

  if (
    valueKind === 'number' &&
    (typeof condition.value !== 'number' || !Number.isFinite(condition.value))
  ) {
    return 'Value must be a number.';
  }

  if (valueKind === 'boolean' && typeof condition.value !== 'boolean') {
    return 'Value must be true or false.';
  }

  if (isSecondValueRequired(condition.operator)) {
    if (
      condition.valueTo === undefined ||
      condition.valueTo === null ||
      (typeof condition.valueTo === 'string' && condition.valueTo.trim().length === 0)
    ) {
      return 'Second value is required.';
    }

    if (Array.isArray(condition.valueTo)) {
      return 'Second value must be a single item.';
    }

    if (
      valueKind === 'number' &&
      (typeof condition.valueTo !== 'number' || !Number.isFinite(condition.valueTo))
    ) {
      return 'Second value must be a number.';
    }

    if (valueKind === 'boolean' && typeof condition.valueTo !== 'boolean') {
      return 'Second value must be true or false.';
    }
  }

  return null;
};

export const buildConditionForFieldChange = (
  condition: ProductAdvancedFilterCondition,
  nextField: ProductAdvancedFilterField
): ProductAdvancedFilterCondition => {
  const nextOperator = supportsOperator(nextField, condition.operator)
    ? condition.operator
    : getDefaultOperatorForField(nextField);

  return stripConditionValues({
    ...condition,
    field: nextField,
    operator: nextOperator,
  });
};

export const buildConditionForOperatorChange = (
  condition: ProductAdvancedFilterCondition,
  nextOperator: ProductAdvancedFilterOperator
): ProductAdvancedFilterCondition => {
  let nextCondition: ProductAdvancedFilterCondition = {
    ...condition,
    operator: nextOperator,
  };

  if (!isValueRequired(nextOperator)) {
    return stripConditionValues(nextCondition);
  }

  if (isMultiValueOperator(nextOperator)) {
    if (!Array.isArray(nextCondition.value)) {
      if (
        nextCondition.value === undefined ||
        nextCondition.value === null ||
        nextCondition.value === ''
      ) {
        const { value: _value, ...rest } = nextCondition;
        nextCondition = rest as ProductAdvancedFilterCondition;
      } else {
        nextCondition = {
          ...nextCondition,
          value: [nextCondition.value],
        };
      }
    }
    return stripConditionValueTo(nextCondition);
  }

  if (Array.isArray(nextCondition.value)) {
    const firstValue = nextCondition.value[0];
    if (firstValue === undefined) {
      const { value: _value, ...rest } = nextCondition;
      nextCondition = rest as ProductAdvancedFilterCondition;
    } else {
      nextCondition = {
        ...nextCondition,
        value: firstValue,
      };
    }
  }

  if (!isSecondValueRequired(nextOperator)) {
    nextCondition = stripConditionValueTo(nextCondition);
  }

  return nextCondition;
};

export const buildConditionForValueChange = (
  condition: ProductAdvancedFilterCondition,
  kind: AdvancedFieldKind,
  rawValue: string
): ProductAdvancedFilterCondition => {
  if (isMultiValueOperator(condition.operator)) {
    const normalized = normalizeMultiValueInput(kind, rawValue);
    if (normalized.length === 0) {
      const { value: _value, ...rest } = condition;
      return rest as ProductAdvancedFilterCondition;
    }
    return {
      ...condition,
      value: normalized,
    };
  }

  if (rawValue === '') {
    const { value: _value, ...rest } = condition;
    return rest as ProductAdvancedFilterCondition;
  }

  return {
    ...condition,
    value: normalizeConditionValue(kind, rawValue),
  };
};

export const buildConditionForBooleanValueChange = (
  condition: ProductAdvancedFilterCondition,
  nextValue: string
): ProductAdvancedFilterCondition => {
  if (!nextValue) {
    const { value: _value, ...rest } = condition;
    return rest as ProductAdvancedFilterCondition;
  }

  return {
    ...condition,
    value: nextValue === 'true',
  };
};

export const buildConditionForValueToChange = (
  condition: ProductAdvancedFilterCondition,
  kind: AdvancedFieldKind,
  rawValue: string
): ProductAdvancedFilterCondition => {
  if (rawValue === '') {
    const { valueTo: _valueTo, ...rest } = condition;
    return rest as ProductAdvancedFilterCondition;
  }
  return {
    ...condition,
    valueTo: normalizeConditionValue(kind, rawValue),
  };
};

export const parseAdvancedFilterPayload = (
  payload: string | null | undefined
): ProductAdvancedFilterGroup | null => {
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    const validated = productAdvancedFilterGroupSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export const parseAdvancedFilterPayloadOrDefault = (
  payload: string | null | undefined
): ProductAdvancedFilterGroup => {
  return parseAdvancedFilterPayload(payload) ?? createEmptyGroup();
};

export const serializeAdvancedFilterPayload = (group: ProductAdvancedFilterGroup): string =>
  JSON.stringify(group);

export const supportsOperator = (
  field: ProductAdvancedFilterField,
  operator: ProductAdvancedFilterOperator
): boolean => {
  return getFieldConfig(field).operators.includes(operator);
};

export const isValueRequired = (operator: ProductAdvancedFilterOperator): boolean => {
  return operator !== 'isEmpty' && operator !== 'isNotEmpty';
};

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
  if (kind === 'boolean') {
    return value.trim().toLowerCase() === 'true';
  }
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
): Array<string | number | boolean> => {
  return rawValue
    .split(',')
    .map((part: string) => part.trim())
    .filter((part: string) => part.length > 0)
    .map((part: string) => normalizeConditionValue(kind, part));
};

export const readAdvancedPresetBundle = (
  payload: unknown
): ProductAdvancedFilterPreset[] | null => {
  const bundleResult = productAdvancedFilterPresetBundleSchema.safeParse(payload);
  if (bundleResult.success) {
    return bundleResult.data.presets;
  }
  if (Array.isArray(payload)) {
    const presetsResult = productAdvancedFilterPresetBundleSchema.shape.presets.safeParse(payload);
    return presetsResult.success ? presetsResult.data : null;
  }
  return null;
};

export const findPresetById = (
  presets: ProductAdvancedFilterPreset[],
  presetId: string
): ProductAdvancedFilterPreset | null => {
  return presets.find((preset: ProductAdvancedFilterPreset) => preset.id === presetId) ?? null;
};
