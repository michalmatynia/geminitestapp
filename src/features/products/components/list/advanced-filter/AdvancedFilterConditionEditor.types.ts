import type {
  ProductAdvancedFilterCondition,
  ProductAdvancedFilterGroup,
} from '@/shared/contracts/products';
import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';

import type {
  AdvancedFilterEditorRuntime,
  AdvancedFilterValueOption,
  UpdateAdvancedFilterGroup,
} from './AdvancedFilterBuilder.types';
import type { AdvancedFilterFieldConfig } from './advanced-filter-utils';

export type ConditionInputType = 'date' | 'number' | 'text';

export type AdvancedFilterConditionEditorProps = {
  condition: ProductAdvancedFilterCondition;
  parentGroup: ProductAdvancedFilterGroup;
  updateParent: UpdateAdvancedFilterGroup;
  runtime: AdvancedFilterEditorRuntime;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disableRemove?: boolean;
};

export type AdvancedFilterConditionController =
  Required<AdvancedFilterConditionEditorProps> & {
    dataListId: string;
    fieldConfig: AdvancedFilterFieldConfig;
    handleBooleanValueChange: (nextValue: string) => void;
    handleFieldChange: (nextFieldValue: string) => void;
    handleOperatorChange: (nextOperatorValue: string) => void;
    handleValueChange: (rawValue: string) => void;
    handleValueToChange: (rawValue: string) => void;
    inputType: ConditionInputType;
    operatorOptions: SelectSimpleOption[];
    useMultiValueInput: boolean;
    validationMessage: string | null;
    value: string;
    valueOptions: AdvancedFilterValueOption[] | undefined;
    valueTo: string;
  };
