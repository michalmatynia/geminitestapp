'use client';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Textarea } from '@/shared/ui/textarea';
import { ToggleRow } from '@/shared/ui/toggle-row';

import { formatChecklistValues } from './ProductFormParameters.helpers';
import type { CatalogLanguageOption } from './ProductFormParameters.types';

type ProductParameterValueControlProps = {
  rowIndex: number;
  parameterId: string;
  selectorType: ProductParameter['selectorType'];
  activeParameterLanguage: CatalogLanguageOption;
  activeLanguageValue: string;
  normalizedOptionLabels: string[];
  checklistValues: string[];
  checklistValueKeys: Set<string>;
  checklistOptions: string[];
  selectLabelOptions: Array<LabeledOptionDto<string>>;
  isLinkedParameter: boolean;
  isSequenceRunning: boolean;
  onLanguageValueChange: (languageCode: string, nextValue: string) => void;
};

type SharedControlProps = {
  activeParameterLanguage: CatalogLanguageOption;
  disabled: boolean;
  value: string;
  onValueChange: (nextValue: string) => void;
};

type ValueControlRenderer = (
  props: ProductParameterValueControlProps,
  sharedProps: SharedControlProps
) => React.JSX.Element;

const isCheckboxChecked = (args: {
  value: string;
  optionLabel: string | null;
}): boolean => {
  const currentValue = args.value.trim().toLowerCase();
  const optionValue = args.optionLabel?.trim().toLowerCase() ?? '';
  return (
    currentValue === 'true' ||
    currentValue === '1' ||
    currentValue === 'yes' ||
    currentValue === 'on' ||
    (optionValue.length > 0 && currentValue === optionValue)
  );
};

const dedupeChecklistValues = (values: string[]): string[] =>
  Array.from(
    new Map<string, string>(
      values.map((value: string) => [value.trim().toLowerCase(), value])
    ).values()
  );

function ParameterTextareaControl(props: SharedControlProps): React.JSX.Element {
  const { activeParameterLanguage, disabled, value, onValueChange } = props;
  const label = `Value (${activeParameterLanguage.label})`;
  return (
    <Textarea
      value={value}
      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
        onValueChange(event.target.value)
      }
      aria-label={label}
      placeholder={label}
      disabled={disabled}
      className='min-h-[84px] bg-gray-900'
      title={label}
    />
  );
}

function ParameterRadioControl(
  props: SharedControlProps & {
    rowIndex: number;
    normalizedOptionLabels: string[];
  }
): React.JSX.Element {
  const { activeParameterLanguage, disabled, normalizedOptionLabels, onValueChange, rowIndex, value } =
    props;
  return (
    <div className='rounded-md border border-border/50 bg-gray-900/50 p-3'>
      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        className='gap-2'
        disabled={disabled}
      >
        {normalizedOptionLabels.map((optionLabel: string) => {
          const radioId = `product-param-${rowIndex}-${activeParameterLanguage.code}-${optionLabel}`;
          return (
            <div key={optionLabel} className='flex items-center gap-2'>
              <RadioGroupItem value={optionLabel} id={radioId} />
              <Label htmlFor={radioId} className='text-sm text-gray-200'>
                {optionLabel}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

function ParameterCheckboxControl(
  props: SharedControlProps & {
    normalizedOptionLabels: string[];
  }
): React.JSX.Element {
  const { disabled, normalizedOptionLabels, onValueChange, value } = props;
  const optionLabel = normalizedOptionLabels[0] ?? null;
  return (
    <ToggleRow
      label={optionLabel ?? 'Enabled'}
      checked={isCheckboxChecked({ value, optionLabel })}
      onCheckedChange={(checked: boolean): void => {
        onValueChange(checked ? (optionLabel ?? 'true') : '');
      }}
      disabled={disabled}
      className='bg-gray-900/50'
    />
  );
}

function ParameterChecklistControl(
  props: SharedControlProps & {
    checklistOptions: string[];
    checklistValueKeys: Set<string>;
    checklistValues: string[];
  }
): React.JSX.Element {
  const { checklistOptions, checklistValueKeys, checklistValues, disabled, onValueChange } = props;
  return (
    <div className='rounded-md border border-border/50 bg-gray-900/50 p-3'>
      <div className='space-y-2'>
        {checklistOptions.map((optionLabel: string) => {
          const optionKey = optionLabel.trim().toLowerCase();
          return (
            <ToggleRow
              key={optionLabel}
              label={optionLabel}
              checked={checklistValueKeys.has(optionKey)}
              onCheckedChange={(checked: boolean): void => {
                const nextValues = checked
                  ? [...checklistValues, optionLabel]
                  : checklistValues.filter(
                      (value: string) => value.trim().toLowerCase() !== optionKey
                    );
                onValueChange(formatChecklistValues(dedupeChecklistValues(nextValues)));
              }}
              disabled={disabled}
              className='border-none bg-transparent p-0 hover:bg-transparent'
            />
          );
        })}
      </div>
    </div>
  );
}

function ParameterSelectControl(
  props: SharedControlProps & {
    selectLabelOptions: Array<LabeledOptionDto<string>>;
  }
): React.JSX.Element {
  const { activeParameterLanguage, disabled, onValueChange, selectLabelOptions, value } = props;
  const label = `Value (${activeParameterLanguage.label})`;
  return (
    <SelectSimple
      size='sm'
      value={value}
      onValueChange={onValueChange}
      options={selectLabelOptions}
      ariaLabel={label}
      placeholder={`Select ${label.toLowerCase()}`}
      triggerClassName='h-9 bg-gray-900 border-border/50'
      disabled={disabled}
      title={`Select ${label.toLowerCase()}`}
    />
  );
}

function ParameterTextControl(props: SharedControlProps): React.JSX.Element {
  const { activeParameterLanguage, disabled, value, onValueChange } = props;
  const label = `Value (${activeParameterLanguage.label})`;
  return (
    <Input
      value={value}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
        onValueChange(event.target.value)
      }
      aria-label={label}
      placeholder={label}
      disabled={disabled}
      className='h-9'
      title={label}
    />
  );
}

const VALUE_CONTROL_RENDERERS: Partial<
  Record<ProductParameter['selectorType'], ValueControlRenderer>
> = {
  textarea: (_props, sharedProps) => <ParameterTextareaControl {...sharedProps} />,
  radio: (props, sharedProps) => (
    <ParameterRadioControl
      {...sharedProps}
      rowIndex={props.rowIndex}
      normalizedOptionLabels={props.normalizedOptionLabels}
    />
  ),
  checkbox: (props, sharedProps) => (
    <ParameterCheckboxControl
      {...sharedProps}
      normalizedOptionLabels={props.normalizedOptionLabels}
    />
  ),
  checklist: (props, sharedProps) => (
    <ParameterChecklistControl
      {...sharedProps}
      checklistOptions={props.checklistOptions}
      checklistValueKeys={props.checklistValueKeys}
      checklistValues={props.checklistValues}
    />
  ),
  select: (props, sharedProps) => (
    <ParameterSelectControl {...sharedProps} selectLabelOptions={props.selectLabelOptions} />
  ),
  dropdown: (props, sharedProps) => (
    <ParameterSelectControl {...sharedProps} selectLabelOptions={props.selectLabelOptions} />
  ),
};

export function ProductParameterValueControl(
  props: ProductParameterValueControlProps
): React.JSX.Element {
  const disabled =
    props.parameterId.length === 0 || props.isLinkedParameter || props.isSequenceRunning;
  const sharedProps: SharedControlProps = {
    activeParameterLanguage: props.activeParameterLanguage,
    disabled,
    value: props.activeLanguageValue,
    onValueChange: (nextValue: string): void => {
      props.onLanguageValueChange(props.activeParameterLanguage.code, nextValue);
    },
  };

  const renderControl = VALUE_CONTROL_RENDERERS[props.selectorType];
  return renderControl === undefined
    ? <ParameterTextControl {...sharedProps} />
    : renderControl(props, sharedProps);
}
