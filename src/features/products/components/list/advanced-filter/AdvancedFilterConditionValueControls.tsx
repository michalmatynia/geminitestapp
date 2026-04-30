'use client';

import type { ChangeEvent } from 'react';

import { type ProductAdvancedFilterCondition } from '@/shared/contracts/products';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/select-simple';

import type { AdvancedFilterValueOption } from './AdvancedFilterBuilder.types';
import type { AdvancedFilterConditionController } from './AdvancedFilterConditionEditor.types';
import {
  ADVANCED_BOOLEAN_OPTIONS,
  isSecondValueRequired,
  isValueRequired,
  type AdvancedFilterFieldConfig,
} from './advanced-filter-utils';

const getBooleanSelectValue = (
  value: ProductAdvancedFilterCondition['value']
): string | undefined => {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return undefined;
};

const hasStringValueOptions = (
  options: AdvancedFilterValueOption[] | undefined,
  fieldConfig: AdvancedFilterFieldConfig
): options is AdvancedFilterValueOption[] =>
  fieldConfig.kind === 'string' && Array.isArray(options) && options.length > 0;

const getOptionLabel = (option: AdvancedFilterValueOption): string =>
  option.label.length > 0 ? option.label : option.value;

function PlaceholderValueField({ label }: { label: string }): React.JSX.Element {
  return (
    <div className='space-y-1'>
      <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>{label}</Label>
      <div className='h-8 rounded-md border border-dashed border-border/60 bg-card/30' />
    </div>
  );
}

function ConditionBooleanValueSelect({
  controller,
}: {
  controller: AdvancedFilterConditionController;
}): React.JSX.Element {
  return (
    <SelectSimple
      size='sm'
      value={getBooleanSelectValue(controller.condition.value)}
      onValueChange={controller.handleBooleanValueChange}
      options={ADVANCED_BOOLEAN_OPTIONS}
      placeholder='Select value'
      ariaLabel='Condition boolean value'
      title='Select value'
    />
  );
}

function ConditionTextValueInput({
  controller,
}: {
  controller: AdvancedFilterConditionController;
}): React.JSX.Element {
  const showOptions = hasStringValueOptions(controller.valueOptions, controller.fieldConfig);
  const placeholder = controller.useMultiValueInput ? 'Value 1, value 2, ...' : 'Value';

  return (
    <>
      <Input
        type={controller.inputType}
        list={showOptions ? controller.dataListId : undefined}
        value={controller.value}
        onChange={(event: ChangeEvent<HTMLInputElement>): void => {
          controller.handleValueChange(event.target.value);
        }}
        className='h-8'
        placeholder={placeholder}
        aria-label='Condition value'
        title={placeholder}
      />
      {showOptions ? (
        <datalist id={controller.dataListId}>
          {controller.valueOptions.map((option: AdvancedFilterValueOption) => (
            <option
              key={option.value}
              value={option.value}
              label={option.label}
              aria-label={getOptionLabel(option)}
            />
          ))}
        </datalist>
      ) : null}
    </>
  );
}

export function ConditionValueControl({
  controller,
}: {
  controller: AdvancedFilterConditionController;
}): React.JSX.Element {
  if (!isValueRequired(controller.condition.operator)) return <PlaceholderValueField label='Value' />;
  const useBooleanSelect =
    controller.fieldConfig.kind === 'boolean' && !controller.useMultiValueInput;

  return (
    <div className='space-y-1'>
      <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Value</Label>
      {useBooleanSelect ? (
        <ConditionBooleanValueSelect controller={controller} />
      ) : (
        <ConditionTextValueInput controller={controller} />
      )}
    </div>
  );
}

export function ConditionValueToControl({
  controller,
}: {
  controller: AdvancedFilterConditionController;
}): React.JSX.Element {
  if (!isSecondValueRequired(controller.condition.operator)) {
    return <PlaceholderValueField label='Value To' />;
  }

  return (
    <div className='space-y-1'>
      <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Value To</Label>
      <Input
        type={controller.inputType}
        value={controller.valueTo}
        onChange={(event: ChangeEvent<HTMLInputElement>): void => {
          controller.handleValueToChange(event.target.value);
        }}
        className='h-8'
        placeholder='Second value'
        aria-label='Condition value to'
        title='Second value'
      />
    </div>
  );
}
