'use client';

import { memo, useMemo } from 'react';

import {
  type ProductAdvancedFilterCondition,
  type ProductAdvancedFilterField,
} from '@/shared/contracts/products';
import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/select-simple';

import { FIELD_OPTIONS } from './AdvancedFilterBuilder.constants';
import { ConditionRuleActions } from './AdvancedFilterConditionActions';
import type {
  AdvancedFilterConditionController,
  AdvancedFilterConditionEditorProps,
  ConditionInputType,
} from './AdvancedFilterConditionEditor.types';
import { ConditionValueControl, ConditionValueToControl } from './AdvancedFilterConditionValueControls';
import {
  ADVANCED_OPERATOR_LABELS,
  buildConditionForBooleanValueChange,
  buildConditionForFieldChange,
  buildConditionForOperatorChange,
  buildConditionForValueChange,
  buildConditionForValueToChange,
  buildConditionValidationMessage,
  getFieldConfig,
  isMultiValueOperator,
  serializeMultiValue,
  type AdvancedFilterFieldConfig,
} from './advanced-filter-utils';

const getConditionInputType = (kind: AdvancedFilterFieldConfig['kind']): ConditionInputType => {
  if (kind === 'number') return 'number';
  if (kind === 'date') return 'date';
  return 'text';
};

const formatConditionValue = (
  condition: ProductAdvancedFilterCondition,
  useMultiValueInput: boolean
): string => {
  if (useMultiValueInput) {
    return serializeMultiValue(Array.isArray(condition.value) ? condition.value : undefined);
  }
  if (condition.value === undefined || condition.value === null) return '';
  return String(condition.value);
};

const formatOptionalConditionValue = (
  value: ProductAdvancedFilterCondition['valueTo']
): string => {
  if (value === undefined || value === null) return '';
  return String(value);
};

function useAdvancedFilterConditionController(
  props: AdvancedFilterConditionEditorProps
): AdvancedFilterConditionController {
  const { condition, parentGroup, runtime, updateParent } = props;
  const fieldConfig = getFieldConfig(condition.field);
  const useMultiValueInput = isMultiValueOperator(condition.operator);
  const operatorOptions = useMemo<SelectSimpleOption[]>(
    () =>
      fieldConfig.operators.map((operator) => ({
        value: operator,
        label: ADVANCED_OPERATOR_LABELS[operator],
      })),
    [fieldConfig.operators]
  );
  const onConditionChange = (next: ProductAdvancedFilterCondition): void => {
    runtime.handleRuleChange(condition.id, next, parentGroup, updateParent);
  };
  const handleFieldChange = (nextFieldValue: string): void => {
    if (nextFieldValue.length === 0) return;
    onConditionChange(
      buildConditionForFieldChange(condition, nextFieldValue as ProductAdvancedFilterField)
    );
  };
  const handleOperatorChange = (nextOperatorValue: string): void => {
    if (nextOperatorValue.length === 0) return;
    onConditionChange(
      buildConditionForOperatorChange(
        condition,
        nextOperatorValue as ProductAdvancedFilterCondition['operator']
      )
    );
  };

  return {
    ...props,
    dataListId: `advanced-filter-value-options-${condition.id}`,
    disableRemove: props.disableRemove ?? false,
    fieldConfig,
    handleBooleanValueChange: (nextValue: string): void =>
      onConditionChange(buildConditionForBooleanValueChange(condition, nextValue)),
    handleFieldChange,
    handleOperatorChange,
    handleValueChange: (rawValue: string): void =>
      onConditionChange(buildConditionForValueChange(condition, fieldConfig.kind, rawValue)),
    handleValueToChange: (rawValue: string): void =>
      onConditionChange(buildConditionForValueToChange(condition, fieldConfig.kind, rawValue)),
    inputType: getConditionInputType(fieldConfig.kind),
    operatorOptions,
    useMultiValueInput,
    validationMessage: buildConditionValidationMessage(condition),
    value: formatConditionValue(condition, useMultiValueInput),
    valueOptions: runtime.fieldValueOptions?.[condition.field],
    valueTo: formatOptionalConditionValue(condition.valueTo),
  };
}

function ConditionFieldSelect({
  controller,
}: {
  controller: AdvancedFilterConditionController;
}): React.JSX.Element {
  return (
    <div className='space-y-1'>
      <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Field</Label>
      <SelectSimple
        size='sm'
        value={controller.condition.field}
        onValueChange={controller.handleFieldChange}
        options={FIELD_OPTIONS}
        ariaLabel='Condition field'
        title='Select option'
      />
    </div>
  );
}

function ConditionOperatorSelect({
  controller,
}: {
  controller: AdvancedFilterConditionController;
}): React.JSX.Element {
  return (
    <div className='space-y-1'>
      <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>
        Operator
      </Label>
      <SelectSimple
        size='sm'
        value={controller.condition.operator}
        onValueChange={controller.handleOperatorChange}
        options={controller.operatorOptions}
        ariaLabel='Condition operator'
        title='Select option'
      />
    </div>
  );
}

function ConditionValidationMessage({
  message,
}: {
  message: string | null;
}): React.JSX.Element | null {
  if (message === null || message.length === 0) return null;
  return <p className='mt-2 text-xs text-destructive'>{message}</p>;
}

export const AdvancedFilterConditionEditor = memo((
  props: AdvancedFilterConditionEditorProps
): React.JSX.Element => {
  const controller = useAdvancedFilterConditionController(props);

  return (
    <div className='rounded-md border border-border/50 bg-card/20 p-3'>
      <div className='grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'>
        <ConditionFieldSelect controller={controller} />
        <ConditionOperatorSelect controller={controller} />
        <ConditionValueControl controller={controller} />
        <ConditionValueToControl controller={controller} />
        <ConditionRuleActions controller={controller} />
      </div>
      <ConditionValidationMessage message={controller.validationMessage} />
    </div>
  );
});
