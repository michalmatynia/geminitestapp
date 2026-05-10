'use client';

import type { OrganizationAdvancedFilterCondition } from '../../filemaker-organization-advanced-filters';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/select-simple';

import {
  type OrganizationAdvancedFilterFieldValueOptionList,
  resolveBooleanConditionValue,
  usesMultiValueInput,
} from './OrganizationAdvancedFilterBuilder.shared';
import {
  ORGANIZATION_ADVANCED_BOOLEAN_OPTIONS,
  getOrganizationAdvancedFieldConfig,
  isOrganizationAdvancedSecondValueRequired,
  isOrganizationAdvancedValueRequired,
} from './organization-advanced-filter-utils';

export interface ConditionValueCellProps {
  condition: OrganizationAdvancedFilterCondition;
  dataListId: string;
  inputType: string;
  onBooleanValueChange: (nextValue: string) => void;
  onValueChange: (rawValue: string) => void;
  value: string;
  valueOptions: OrganizationAdvancedFilterFieldValueOptionList;
}

const OrganizationConditionEmptyValueCell = (): React.JSX.Element => (
  <div className='space-y-1'>
    <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Value</Label>
    <div className='h-8 rounded-md border border-dashed border-border/60 bg-card/30' />
  </div>
);

const OrganizationConditionValueDatalist = (props: {
  dataListId: string;
  valueOptions: NonNullable<ConditionValueCellProps['valueOptions']>;
}): React.JSX.Element => (
  <datalist id={props.dataListId}>
    {props.valueOptions.map((option) => (
      <option
        key={option.value}
        value={option.value}
        label={option.label}
        aria-label={option.label.length > 0 ? option.label : option.value}
      />
    ))}
  </datalist>
);

const OrganizationConditionTextValueInput = (
  props: ConditionValueCellProps & {
    showDatalist: boolean;
    useMultiValue: boolean;
  }
): React.JSX.Element => {
  const { dataListId, inputType, onValueChange, showDatalist, useMultiValue, value, valueOptions } =
    props;
  const placeholder = useMultiValue ? 'Value 1, value 2, ...' : 'Value';
  return (
    <>
      <Input
        type={inputType}
        list={showDatalist ? dataListId : undefined}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className='h-8'
        placeholder={placeholder}
        aria-label='Organisation condition value'
        title={placeholder}
      />
      {showDatalist && valueOptions !== undefined ? (
        <OrganizationConditionValueDatalist dataListId={dataListId} valueOptions={valueOptions} />
      ) : null}
    </>
  );
};

export const OrganizationConditionValueCell = (
  props: ConditionValueCellProps
): React.JSX.Element => {
  const { condition, onBooleanValueChange, valueOptions } = props;
  const fieldConfig = getOrganizationAdvancedFieldConfig(condition.field);
  const useMultiValue = usesMultiValueInput(condition);
  const showDatalist =
    valueOptions !== undefined && valueOptions.length > 0 && fieldConfig.kind === 'string';

  if (!isOrganizationAdvancedValueRequired(condition.operator)) {
    return <OrganizationConditionEmptyValueCell />;
  }

  return (
    <div className='space-y-1'>
      <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Value</Label>
      {fieldConfig.kind === 'boolean' && !useMultiValue ? (
        <SelectSimple
          size='sm'
          value={resolveBooleanConditionValue(condition.value)}
          onValueChange={onBooleanValueChange}
          options={ORGANIZATION_ADVANCED_BOOLEAN_OPTIONS}
          placeholder='Select value'
          ariaLabel='Organisation condition boolean value'
          title='Select value'
        />
      ) : (
        <OrganizationConditionTextValueInput
          {...props}
          showDatalist={showDatalist}
          useMultiValue={useMultiValue}
        />
      )}
    </div>
  );
};

export const OrganizationConditionValueToCell = (props: {
  condition: OrganizationAdvancedFilterCondition;
  inputType: string;
  onValueToChange: (rawValue: string) => void;
  valueTo: string;
}): React.JSX.Element => {
  if (!isOrganizationAdvancedSecondValueRequired(props.condition.operator)) {
    return (
      <div className='space-y-1'>
        <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>
          Value To
        </Label>
        <div className='h-8 rounded-md border border-dashed border-border/60 bg-card/30' />
      </div>
    );
  }

  return (
    <div className='space-y-1'>
      <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Value To</Label>
      <Input
        type={props.inputType}
        value={props.valueTo}
        onChange={(event) => props.onValueToChange(event.target.value)}
        className='h-8'
        placeholder='Second value'
        aria-label='Organisation condition value to'
        title='Second value'
      />
    </div>
  );
};
