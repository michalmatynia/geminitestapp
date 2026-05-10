import type {
  OrganizationAdvancedFilterCondition,
  OrganizationAdvancedFilterField,
  OrganizationAdvancedFilterGroup,
  OrganizationAdvancedFilterRule,
} from '../../filemaker-organization-advanced-filters';
import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';

import {
  ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIGS,
  isOrganizationAdvancedMultiValueOperator,
  serializeOrganizationMultiValue,
} from './organization-advanced-filter-utils';

export interface OrganizationAdvancedFilterValueOption {
  value: string;
  label: string;
}

export type OrganizationAdvancedFilterFieldValueOptionList =
  | OrganizationAdvancedFilterValueOption[]
  | undefined;

export type OrganizationAdvancedFilterBuilderFieldValueOptions =
  | Partial<Record<OrganizationAdvancedFilterField, OrganizationAdvancedFilterFieldValueOptionList>>
  | undefined;

export type OrganizationAdvancedFilterEditorRuntime = {
  fieldValueOptions: OrganizationAdvancedFilterBuilderFieldValueOptions;
  onChange: (group: OrganizationAdvancedFilterGroup) => void;
  handleDuplicateRule: (
    ruleId: string,
    parentGroup: OrganizationAdvancedFilterGroup,
    updateParent: (next: OrganizationAdvancedFilterGroup) => void
  ) => void;
  handleMoveRule: (
    ruleId: string,
    direction: -1 | 1,
    parentGroup: OrganizationAdvancedFilterGroup,
    updateParent: (next: OrganizationAdvancedFilterGroup) => void
  ) => void;
  handleRemoveRule: (
    ruleId: string,
    parentGroup: OrganizationAdvancedFilterGroup,
    updateParent: (next: OrganizationAdvancedFilterGroup) => void
  ) => void;
  handleRuleChange: (
    ruleId: string,
    nextRule: OrganizationAdvancedFilterRule,
    parentGroup: OrganizationAdvancedFilterGroup,
    updateParent: (next: OrganizationAdvancedFilterGroup) => void
  ) => void;
};

export const COMBINATOR_OPTIONS: SelectSimpleOption[] = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
];

export const FIELD_OPTIONS: SelectSimpleOption[] = ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIGS.map(
  (config) => ({
    label: config.label,
    value: config.field,
  })
);

export const usesMultiValueInput = (
  condition: OrganizationAdvancedFilterCondition
): boolean => isOrganizationAdvancedMultiValueOperator(condition.operator);

export const resolveValueForCondition = (
  condition: OrganizationAdvancedFilterCondition
): string => {
  if (usesMultiValueInput(condition)) {
    return serializeOrganizationMultiValue(
      Array.isArray(condition.value) ? condition.value : undefined
    );
  }
  if (condition.value === undefined || condition.value === null) {
    return '';
  }
  return String(condition.value);
};

export const resolveBooleanConditionValue = (value: unknown): string | undefined => {
  if (value === true) {
    return 'true';
  }
  if (value === false) {
    return 'false';
  }
  return undefined;
};
