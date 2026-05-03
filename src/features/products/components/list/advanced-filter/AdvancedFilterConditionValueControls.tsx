'use client';

import type { ChangeEvent } from 'react';

import {
  type ProductAdvancedFilterCondition,
  type ProductAdvancedFilterField,
} from '@/shared/contracts/products';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { MultiSelect } from '@/shared/ui/multi-select';
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

const SEARCHABLE_OPTION_FIELD_COPY: Partial<
  Record<
    ProductAdvancedFilterField,
    {
      ariaLabel: string;
      emptyMessage: string;
      placeholder: string;
      searchPlaceholder: string;
    }
  >
> = {
  categoryId: {
    ariaLabel: 'Condition category value',
    emptyMessage: 'No categories found.',
    placeholder: 'Select category',
    searchPlaceholder: 'Search categories...',
  },
  traderaStatus: {
    ariaLabel: 'Condition Tradera status value',
    emptyMessage: 'No Tradera statuses found.',
    placeholder: 'Select Tradera status',
    searchPlaceholder: 'Search Tradera statuses...',
  },
};

const shouldUseOptionSelect = (
  options: AdvancedFilterValueOption[] | undefined,
  fieldConfig: AdvancedFilterFieldConfig
): options is AdvancedFilterValueOption[] =>
  SEARCHABLE_OPTION_FIELD_COPY[fieldConfig.field] !== undefined &&
  Array.isArray(options) &&
  options.length > 0;

const toSelectedOptionValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const getSelectedOptionValues = (controller: AdvancedFilterConditionController): string[] => {
  if (controller.useMultiValueInput) {
    return Array.isArray(controller.condition.value)
      ? controller.condition.value
          .map((value: unknown) => toSelectedOptionValue(value))
          .filter((value: string | null): value is string => value !== null)
      : [];
  }
  return controller.value.length > 0 ? [controller.value] : [];
};

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

function ConditionSearchableOptionValueSelect({
  controller,
}: {
  controller: AdvancedFilterConditionController;
}): React.JSX.Element {
  const copy = SEARCHABLE_OPTION_FIELD_COPY[controller.fieldConfig.field] ?? {
    ariaLabel: 'Condition value',
    emptyMessage: 'No options found.',
    placeholder: 'Select value',
    searchPlaceholder: 'Search options...',
  };

  return (
    <MultiSelect
      options={controller.valueOptions ?? []}
      selected={getSelectedOptionValues(controller)}
      onChange={(values: string[]): void => {
        controller.handleValueChange(
          controller.useMultiValueInput ? values.join(', ') : (values[0] ?? '')
        );
      }}
      single={!controller.useMultiValueInput}
      placeholder={copy.placeholder}
      searchPlaceholder={copy.searchPlaceholder}
      ariaLabel={copy.ariaLabel}
      emptyMessage={copy.emptyMessage}
      className='space-y-0 [&_button]:h-8 [&_button]:text-xs'
    />
  );
}

function ConditionTextValueInput({
  controller,
}: {
  controller: AdvancedFilterConditionController;
}): React.JSX.Element {
  const stringValueOptions = hasStringValueOptions(controller.valueOptions, controller.fieldConfig)
    ? controller.valueOptions
    : undefined;
  const showOptions = stringValueOptions !== undefined;
  const placeholder = controller.useMultiValueInput ? 'Value 1, value 2, ...' : 'Value';

  if (shouldUseOptionSelect(controller.valueOptions, controller.fieldConfig)) {
    return <ConditionSearchableOptionValueSelect controller={controller} />;
  }

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
      {stringValueOptions !== undefined ? (
        <datalist id={controller.dataListId}>
          {stringValueOptions.map((option: AdvancedFilterValueOption) => (
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
