import type {
  ProductAdvancedFilterField,
  ProductAdvancedFilterGroup,
  ProductAdvancedFilterRule,
} from '@/shared/contracts/products';

export interface AdvancedFilterValueOption {
  value: string;
  label: string;
}

export type AdvancedFilterBuilderFieldValueOptions =
  | Partial<Record<ProductAdvancedFilterField, AdvancedFilterValueOption[]>>
  | undefined;

export type UpdateAdvancedFilterGroup = (next: ProductAdvancedFilterGroup) => void;

export type AdvancedFilterEditorRuntime = {
  onChange: (group: ProductAdvancedFilterGroup) => void;
  fieldValueOptions: AdvancedFilterBuilderFieldValueOptions;
  handleRuleChange: (
    ruleId: string,
    nextRule: ProductAdvancedFilterRule,
    parentGroup: ProductAdvancedFilterGroup,
    updateParent: UpdateAdvancedFilterGroup
  ) => void;
  handleRemoveRule: (
    ruleId: string,
    parentGroup: ProductAdvancedFilterGroup,
    updateParent: UpdateAdvancedFilterGroup
  ) => void;
  handleMoveRule: (
    ruleId: string,
    direction: -1 | 1,
    parentGroup: ProductAdvancedFilterGroup,
    updateParent: UpdateAdvancedFilterGroup
  ) => void;
  handleDuplicateRule: (
    ruleId: string,
    parentGroup: ProductAdvancedFilterGroup,
    updateParent: UpdateAdvancedFilterGroup
  ) => void;
};
