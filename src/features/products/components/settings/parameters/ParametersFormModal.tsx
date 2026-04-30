import type { Dispatch, SetStateAction } from 'react';

import type { ProductParameterLinkedTitleTermType } from '@/shared/contracts/products/parameters';
import { FormField } from '@/shared/ui/form-section';
import { FormModal } from '@/shared/ui/FormModal';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Textarea } from '@/shared/ui/textarea';

import {
  LINKABLE_SELECTOR_TYPES,
  LINKED_TITLE_TERM_OPTIONS,
  SELECTOR_TYPE_OPTIONS,
} from './ParametersSettings.constants';
import type { ParameterFormData } from './ParametersSettings.types';
import { normalizeParameterSelectorType } from './ParametersSettings.utils';

type ParametersFormModalProps = {
  open: boolean;
  isEditing: boolean;
  formData: ParameterFormData;
  setFormData: Dispatch<SetStateAction<ParameterFormData>>;
  selectorNeedsOptions: boolean;
  selectorSupportsLinking: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
};

type ParameterInputFieldProps = {
  label: string;
  field: 'name_en' | 'name_pl' | 'name_de';
  value: string;
  placeholder: string;
  setFormData: Dispatch<SetStateAction<ParameterFormData>>;
};

function ParameterInputField({
  label,
  field,
  value,
  placeholder,
  setFormData,
}: ParameterInputFieldProps): React.JSX.Element {
  return (
    <FormField label={label}>
      <Input
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          setFormData((prev) => ({ ...prev, [field]: event.target.value }))
        }
        placeholder={placeholder}
        className='h-9'
        aria-label={placeholder}
        title={placeholder}
      />
    </FormField>
  );
}

function ParameterSelectorField({
  formData,
  setFormData,
}: Pick<ParametersFormModalProps, 'formData' | 'setFormData'>): React.JSX.Element {
  return (
    <FormField label='Selector Type'>
      <SelectSimple
        size='sm'
        value={formData.selectorType}
        onValueChange={(value: string): void =>
          setFormData((prev) => {
            const selectorType = normalizeParameterSelectorType(value);
            return {
              ...prev,
              selectorType,
              linkedTitleTermType: LINKABLE_SELECTOR_TYPES.has(selectorType)
                ? prev.linkedTitleTermType
                : null,
            };
          })
        }
        options={SELECTOR_TYPE_OPTIONS}
        placeholder='Select selector type'
        triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
        ariaLabel='Select selector type'
        title='Select selector type'
      />
    </FormField>
  );
}

function ParameterLinkedTitleTermField({
  formData,
  setFormData,
  selectorSupportsLinking,
}: Pick<
  ParametersFormModalProps,
  'formData' | 'setFormData' | 'selectorSupportsLinking'
>): React.JSX.Element {
  return (
    <FormField label='Linked English Title Term'>
      <SelectSimple
        size='sm'
        value={formData.linkedTitleTermType ?? ''}
        onValueChange={(value: string): void =>
          setFormData((prev) => ({
            ...prev,
            linkedTitleTermType:
              value === '' ? null : (value as ProductParameterLinkedTitleTermType),
          }))
        }
        options={LINKED_TITLE_TERM_OPTIONS}
        placeholder='No English Title sync'
        disabled={!selectorSupportsLinking}
        triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
        ariaLabel='Linked English Title term'
        title='Linked English Title term'
      />
      <p className='mt-1 text-xs text-gray-500'>
        Automatically maps this parameter from the structured English Title. Available for Text
        Field and Textarea parameters only.
      </p>
    </FormField>
  );
}

function ParameterOptionsField({
  formData,
  setFormData,
}: Pick<ParametersFormModalProps, 'formData' | 'setFormData'>): React.JSX.Element {
  const optionPlaceholder = 'One value label per line\nSmall\nMedium\nLarge';
  return (
    <FormField label='Option Labels'>
      <Textarea
        value={formData.optionLabelsInput}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
          setFormData((prev) => ({ ...prev, optionLabelsInput: event.target.value }))
        }
        className='min-h-[110px] bg-gray-900'
        placeholder={optionPlaceholder}
        aria-label={optionPlaceholder}
        title={optionPlaceholder}
      />
      <p className='mt-1 text-xs text-gray-500'>
        Value labels only. Saved labels are exported/imported as plain text values.
      </p>
    </FormField>
  );
}

export function ParametersFormModal({
  open,
  isEditing,
  formData,
  setFormData,
  selectorNeedsOptions,
  selectorSupportsLinking,
  isSaving,
  onClose,
  onSave,
}: ParametersFormModalProps): React.JSX.Element {
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Parameter' : 'Create Parameter'}
      onSave={(): void => {
        void onSave();
      }}
      isSaving={isSaving}
      size='md'
    >
      <div className='space-y-4'>
        <ParameterInputField
          label='Name (EN)'
          field='name_en'
          value={formData.name_en}
          placeholder='Field name in English'
          setFormData={setFormData}
        />
        <ParameterInputField
          label='Name (PL)'
          field='name_pl'
          value={formData.name_pl}
          placeholder='Optional'
          setFormData={setFormData}
        />
        <ParameterInputField
          label='Name (DE)'
          field='name_de'
          value={formData.name_de}
          placeholder='Optional'
          setFormData={setFormData}
        />
        <ParameterSelectorField formData={formData} setFormData={setFormData} />
        <ParameterLinkedTitleTermField
          formData={formData}
          setFormData={setFormData}
          selectorSupportsLinking={selectorSupportsLinking}
        />
        {selectorNeedsOptions && (
          <ParameterOptionsField formData={formData} setFormData={setFormData} />
        )}
      </div>
    </FormModal>
  );
}
