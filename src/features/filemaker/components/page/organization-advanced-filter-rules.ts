import {
  ORGANIZATION_ADVANCED_FILTER_MAX_DEPTH,
  type OrganizationAdvancedFilterCondition,
  type OrganizationAdvancedFilterField,
  type OrganizationAdvancedFilterGroup,
  type OrganizationAdvancedFilterOperator,
  type OrganizationAdvancedFilterRule,
} from '../../filemaker-organization-advanced-filters';
import {
  DEFAULT_ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIG,
  getDefaultOperatorForOrganizationField,
  getOrganizationAdvancedFieldConfig,
  normalizeOrganizationConditionValue,
  normalizeOrganizationMultiValueInput,
  supportsOrganizationAdvancedOperator,
  type OrganizationAdvancedFieldKind,
} from './organization-advanced-filter-fields';

export const createOrganizationAdvancedRuleId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `organization_filter_rule_${Date.now()}_${Math.floor(Math.random() * 100_000)}`;
};

export const createEmptyOrganizationCondition = (
  field: OrganizationAdvancedFilterField = DEFAULT_ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIG.field
): OrganizationAdvancedFilterCondition => ({
  field,
  id: createOrganizationAdvancedRuleId(),
  operator: getDefaultOperatorForOrganizationField(field),
  type: 'condition',
});

export const createEmptyOrganizationGroup = (): OrganizationAdvancedFilterGroup => ({
  combinator: 'and',
  id: createOrganizationAdvancedRuleId(),
  not: false,
  rules: [createEmptyOrganizationCondition()],
  type: 'group',
});

export const appendConditionToOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup
): OrganizationAdvancedFilterGroup => ({
  ...group,
  rules: [...group.rules, createEmptyOrganizationCondition()],
});

export const appendGroupToOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup
): OrganizationAdvancedFilterGroup => ({
  ...group,
  rules: [...group.rules, createEmptyOrganizationGroup()],
});

export const replaceRuleInOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup,
  ruleId: string,
  nextRule: OrganizationAdvancedFilterRule
): OrganizationAdvancedFilterGroup => ({
  ...group,
  rules: group.rules.map((rule: OrganizationAdvancedFilterRule) =>
    rule.id === ruleId ? nextRule : rule
  ),
});

export const removeRuleFromOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup,
  ruleId: string
): OrganizationAdvancedFilterGroup => {
  const nextRules = group.rules.filter(
    (rule: OrganizationAdvancedFilterRule): boolean => rule.id !== ruleId
  );
  return {
    ...group,
    rules: nextRules.length > 0 ? nextRules : [createEmptyOrganizationCondition()],
  };
};

export const moveRuleInOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup,
  ruleId: string,
  direction: -1 | 1
): OrganizationAdvancedFilterGroup | null => {
  const currentIndex = group.rules.findIndex(
    (rule: OrganizationAdvancedFilterRule): boolean => rule.id === ruleId
  );
  if (currentIndex < 0) return null;
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= group.rules.length) return null;

  const nextRules = [...group.rules];
  const [movedRule] = nextRules.splice(currentIndex, 1);
  if (movedRule === undefined) return null;
  nextRules.splice(targetIndex, 0, movedRule);
  return { ...group, rules: nextRules };
};

export const duplicateOrganizationRuleWithNewIds = (
  rule: OrganizationAdvancedFilterRule
): OrganizationAdvancedFilterRule => {
  if (rule.type === 'condition') {
    return { ...rule, id: createOrganizationAdvancedRuleId() };
  }
  return {
    ...rule,
    id: createOrganizationAdvancedRuleId(),
    rules: rule.rules.map((child: OrganizationAdvancedFilterRule) =>
      duplicateOrganizationRuleWithNewIds(child)
    ),
  };
};

export const duplicateRuleInOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup,
  ruleId: string
): OrganizationAdvancedFilterGroup | null => {
  const currentIndex = group.rules.findIndex(
    (rule: OrganizationAdvancedFilterRule): boolean => rule.id === ruleId
  );
  if (currentIndex < 0) return null;
  const sourceRule = group.rules[currentIndex];
  if (sourceRule === undefined) return null;
  const nextRules = [...group.rules];
  nextRules.splice(currentIndex + 1, 0, duplicateOrganizationRuleWithNewIds(sourceRule));
  return { ...group, rules: nextRules };
};

const stripOrganizationConditionValues = (
  condition: OrganizationAdvancedFilterCondition
): OrganizationAdvancedFilterCondition => {
  const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
  delete nextCondition.value;
  delete nextCondition.valueTo;
  return nextCondition;
};

const stripOrganizationConditionValueTo = (
  condition: OrganizationAdvancedFilterCondition
): OrganizationAdvancedFilterCondition => {
  const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
  delete nextCondition.valueTo;
  return nextCondition;
};

export const isOrganizationAdvancedValueRequired = (
  operator: OrganizationAdvancedFilterOperator
): boolean => operator !== 'isEmpty' && operator !== 'isNotEmpty';

export const isOrganizationAdvancedSecondValueRequired = (
  operator: OrganizationAdvancedFilterOperator
): boolean => operator === 'between';

export const isOrganizationAdvancedMultiValueOperator = (
  operator: OrganizationAdvancedFilterOperator
): boolean => operator === 'in' || operator === 'notIn';

const convertConditionToMultiValue = (
  condition: OrganizationAdvancedFilterCondition
): OrganizationAdvancedFilterCondition => {
  if (Array.isArray(condition.value)) return condition;
  const currentValue = condition.value;
  if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
    return { ...condition, value: [currentValue] };
  }
  const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
  delete nextCondition.value;
  return nextCondition;
};

const convertConditionToSingleValue = (
  condition: OrganizationAdvancedFilterCondition
): OrganizationAdvancedFilterCondition => {
  if (!Array.isArray(condition.value)) return condition;
  const firstValue = condition.value[0];
  if (firstValue !== undefined) return { ...condition, value: firstValue };
  const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
  delete nextCondition.value;
  return nextCondition;
};

export const buildOrganizationConditionForFieldChange = (
  condition: OrganizationAdvancedFilterCondition,
  nextField: OrganizationAdvancedFilterField
): OrganizationAdvancedFilterCondition => {
  const nextOperator = supportsOrganizationAdvancedOperator(nextField, condition.operator)
    ? condition.operator
    : getDefaultOperatorForOrganizationField(nextField);
  return stripOrganizationConditionValues({
    ...condition,
    field: nextField,
    operator: nextOperator,
  });
};

export const buildOrganizationConditionForOperatorChange = (
  condition: OrganizationAdvancedFilterCondition,
  nextOperator: OrganizationAdvancedFilterOperator
): OrganizationAdvancedFilterCondition => {
  const nextCondition: OrganizationAdvancedFilterCondition = { ...condition, operator: nextOperator };
  if (!isOrganizationAdvancedValueRequired(nextOperator)) {
    return stripOrganizationConditionValues(nextCondition);
  }
  if (isOrganizationAdvancedMultiValueOperator(nextOperator)) {
    return stripOrganizationConditionValueTo(convertConditionToMultiValue(nextCondition));
  }
  const singleValueCondition = convertConditionToSingleValue(nextCondition);
  return isOrganizationAdvancedSecondValueRequired(nextOperator)
    ? singleValueCondition
    : stripOrganizationConditionValueTo(singleValueCondition);
};

export const buildOrganizationConditionForValueChange = (
  condition: OrganizationAdvancedFilterCondition,
  kind: OrganizationAdvancedFieldKind,
  rawValue: string
): OrganizationAdvancedFilterCondition => {
  if (isOrganizationAdvancedMultiValueOperator(condition.operator)) {
    const normalized = normalizeOrganizationMultiValueInput(kind, rawValue);
    if (normalized.length === 0) {
      const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
      delete nextCondition.value;
      return nextCondition;
    }
    return { ...condition, value: normalized };
  }
  if (rawValue.length === 0) {
    const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
    delete nextCondition.value;
    return nextCondition;
  }
  return { ...condition, value: normalizeOrganizationConditionValue(kind, rawValue) };
};

export const buildOrganizationConditionForBooleanValueChange = (
  condition: OrganizationAdvancedFilterCondition,
  nextValue: string
): OrganizationAdvancedFilterCondition => {
  if (nextValue.length === 0) {
    const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
    delete nextCondition.value;
    return nextCondition;
  }
  return { ...condition, value: nextValue === 'true' };
};

export const buildOrganizationConditionForValueToChange = (
  condition: OrganizationAdvancedFilterCondition,
  kind: OrganizationAdvancedFieldKind,
  rawValue: string
): OrganizationAdvancedFilterCondition => {
  if (rawValue.length === 0) {
    const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
    delete nextCondition.valueTo;
    return nextCondition;
  }
  return { ...condition, valueTo: normalizeOrganizationConditionValue(kind, rawValue) };
};

const isBlankScalarValue = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim().length === 0);

const validateMultiValueCondition = (
  condition: OrganizationAdvancedFilterCondition
): string | null => {
  if (!Array.isArray(condition.value) || condition.value.length === 0) {
    return 'At least one value is required.';
  }
  return null;
};

const validatePrimaryValueCondition = (
  condition: OrganizationAdvancedFilterCondition
): string | null => {
  const fieldConfig = getOrganizationAdvancedFieldConfig(condition.field);
  if (isBlankScalarValue(condition.value)) return 'Value is required.';
  if (Array.isArray(condition.value)) return 'Value must be a single item.';
  if (fieldConfig.kind === 'boolean' && typeof condition.value !== 'boolean') {
    return 'Value must be true or false.';
  }
  return null;
};

const validateSecondValueCondition = (
  condition: OrganizationAdvancedFilterCondition
): string | null => {
  if (isBlankScalarValue(condition.valueTo)) return 'Second value is required.';
  if (Array.isArray(condition.valueTo)) return 'Second value must be a single item.';
  return null;
};

export const buildOrganizationConditionValidationMessage = (
  condition: OrganizationAdvancedFilterCondition
): string | null => {
  if (!isOrganizationAdvancedValueRequired(condition.operator)) return null;
  if (isOrganizationAdvancedMultiValueOperator(condition.operator)) {
    return validateMultiValueCondition(condition);
  }
  const primaryMessage = validatePrimaryValueCondition(condition);
  if (primaryMessage !== null) return primaryMessage;
  return isOrganizationAdvancedSecondValueRequired(condition.operator)
    ? validateSecondValueCondition(condition)
    : null;
};

export const canAddNestedOrganizationGroup = (depth: number): boolean =>
  depth < ORGANIZATION_ADVANCED_FILTER_MAX_DEPTH;
