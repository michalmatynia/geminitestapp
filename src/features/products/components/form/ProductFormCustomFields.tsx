'use client';

import { useMemo } from 'react';

import { useProductFormCustomFields } from '@/features/products/context/ProductFormCustomFieldContext';
import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldValue,
} from '@/shared/contracts/products/custom-fields';
import { Alert } from '@/shared/ui/alert';
import { CompactEmptyState } from '@/shared/ui/empty-state';
import { FormSection } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { insetPanelVariants } from '@/shared/ui/InsetPanel';
import { LoadingState } from '@/shared/ui/LoadingState';
import { ToggleRow } from '@/shared/ui/toggle-row';

const getTextFieldValue = (entry: ProductCustomFieldValue | undefined): string =>
  typeof entry?.textValue === 'string' ? entry.textValue : '';

const getSelectedOptionIds = (entry: ProductCustomFieldValue | undefined): string[] =>
  Array.isArray(entry?.selectedOptionIds) ? entry.selectedOptionIds : [];

type CustomFieldEditorProps = {
  customField: ProductCustomFieldDefinition;
  value: ProductCustomFieldValue | undefined;
  setTextValue: (fieldId: string, value: string) => void;
  toggleSelectedOption: (fieldId: string, optionId: string, selected: boolean) => void;
};

const resolveCustomFieldTypeLabel = (customField: ProductCustomFieldDefinition): string => {
  if (customField.type === 'checkbox_set') return 'Checkbox set';
  return 'Single text input';
};

function CheckboxSetField({
  customField,
  selectedOptionIds,
  toggleSelectedOption,
}: {
  customField: ProductCustomFieldDefinition;
  selectedOptionIds: Set<string>;
  toggleSelectedOption: CustomFieldEditorProps['toggleSelectedOption'];
}): React.JSX.Element {
  if (customField.options.length === 0) {
    return (
      <Alert variant='warning' className='py-2'>
        <p className='text-xs'>
          This checkbox set has no options configured yet. Add them in Product Settings.
        </p>
      </Alert>
    );
  }

  return (
    <div className='space-y-2'>
      {customField.options.map((option) => (
        <ToggleRow
          key={option.id}
          label={option.label}
          checked={selectedOptionIds.has(option.id)}
          onCheckedChange={(checked: boolean): void =>
            toggleSelectedOption(customField.id, option.id, checked)
          }
          showBorder={false}
          toggleOnRowClick
          className='cursor-pointer rounded-md border border-transparent bg-transparent px-2 py-2 hover:border-primary/30 hover:bg-accent/15 focus-within:border-primary/40 focus-within:bg-accent/15'
        />
      ))}
    </div>
  );
}

function CustomFieldEditor({
  customField,
  value,
  setTextValue,
  toggleSelectedOption,
}: CustomFieldEditorProps): React.JSX.Element {
  const selectedOptionIds = new Set<string>(getSelectedOptionIds(value));

  return (
    <div
      className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} flex flex-col gap-3 border-border`}
    >
      <div>
        <h3 className='text-sm font-medium text-foreground'>{customField.name}</h3>
        <p className='text-xs text-muted-foreground'>{resolveCustomFieldTypeLabel(customField)}</p>
      </div>
      {customField.type === 'checkbox_set' ? (
        <CheckboxSetField
          customField={customField}
          selectedOptionIds={selectedOptionIds}
          toggleSelectedOption={toggleSelectedOption}
        />
      ) : (
        <Input
          value={getTextFieldValue(value)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setTextValue(customField.id, event.target.value)
          }
          aria-label={customField.name}
          placeholder={customField.name}
          className='h-9'
        />
      )}
    </div>
  );
}

function CustomFieldsContent({
  customFields,
  customFieldsLoading,
  customFieldValueById,
  setTextValue,
  toggleSelectedOption,
}: {
  customFields: ProductCustomFieldDefinition[];
  customFieldsLoading: boolean;
  customFieldValueById: Map<string, ProductCustomFieldValue>;
  setTextValue: CustomFieldEditorProps['setTextValue'];
  toggleSelectedOption: CustomFieldEditorProps['toggleSelectedOption'];
}): React.JSX.Element {
  if (customFieldsLoading) {
    return <LoadingState message='Loading custom fields...' className='border border-dashed py-8' />;
  }

  if (customFields.length === 0) {
    return (
      <CompactEmptyState
        title='No custom fields'
        description='Create custom fields in Product Settings to use them in the editor.'
        className='bg-card/20 py-8'
      />
    );
  }

  return (
    <div className='space-y-3'>
      {customFields.map((customField: ProductCustomFieldDefinition) => (
        <CustomFieldEditor
          key={customField.id}
          customField={customField}
          value={customFieldValueById.get(customField.id)}
          setTextValue={setTextValue}
          toggleSelectedOption={toggleSelectedOption}
        />
      ))}
    </div>
  );
}

export default function ProductFormCustomFields(): React.JSX.Element {
  const {
    customFields,
    customFieldsLoading,
    customFieldValues,
    setTextValue,
    toggleSelectedOption,
  } = useProductFormCustomFields();

  const customFieldValueById = useMemo(() => {
    const map = new Map<string, ProductCustomFieldValue>();
    customFieldValues.forEach((entry: ProductCustomFieldValue) => {
      map.set(entry.fieldId, entry);
    });
    return map;
  }, [customFieldValues]);

  return (
    <div className='space-y-6'>
      <FormSection
        title='Custom Fields'
        description='Fill reusable product-specific text fields and checkbox sets.'
      >
        <CustomFieldsContent
          customFields={customFields}
          customFieldsLoading={customFieldsLoading}
          customFieldValueById={customFieldValueById}
          setTextValue={setTextValue}
          toggleSelectedOption={toggleSelectedOption}
        />
      </FormSection>
    </div>
  );
}
