import type {
  ProductAdvancedFilterCondition,
  ProductAdvancedFilterField,
  ProductAdvancedFilterGroup,
  ProductAdvancedFilterRule,
} from '@/shared/contracts/products';

import { getDefaultOperatorForField } from './advanced-filter-fields';

const DEFAULT_FIELD: ProductAdvancedFilterField = 'name';

export const createRuleId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rule_${Date.now()}_${Math.floor(Math.random() * 100_000)}`;
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
  rules: group.rules.map((rule) => (rule.id === ruleId ? nextRule : rule)),
});

export const removeRuleFromGroup = (
  group: ProductAdvancedFilterGroup,
  ruleId: string
): ProductAdvancedFilterGroup => {
  const nextRules = group.rules.filter((rule) => rule.id !== ruleId);
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
  const currentIndex = group.rules.findIndex((rule) => rule.id === ruleId);
  if (currentIndex < 0) return null;

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= group.rules.length) return null;

  const nextRules = [...group.rules];
  const [movedRule] = nextRules.splice(currentIndex, 1);
  if (movedRule === undefined) return null;

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
  const currentIndex = group.rules.findIndex((rule) => rule.id === ruleId);
  if (currentIndex < 0) return null;

  const sourceRule = group.rules[currentIndex];
  if (sourceRule === undefined) return null;

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
  const nextCondition = { ...condition };
  delete nextCondition.value;
  delete nextCondition.valueTo;
  return nextCondition;
};

export const stripConditionValueTo = (
  condition: ProductAdvancedFilterCondition
): ProductAdvancedFilterCondition => {
  const nextCondition = { ...condition };
  delete nextCondition.valueTo;
  return nextCondition;
};

export const stripConditionValue = (
  condition: ProductAdvancedFilterCondition
): ProductAdvancedFilterCondition => {
  const nextCondition = { ...condition };
  delete nextCondition.value;
  return nextCondition;
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
    rules: rule.rules.map((child) => duplicateRuleWithNewIds(child)),
  };
};
