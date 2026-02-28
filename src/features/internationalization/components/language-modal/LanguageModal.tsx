'use client';

import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { Checkbox, Label, Hint } from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';

import { useLanguageForm } from './hooks/useLanguageForm';

type LanguageFormState = {
  code: string;
  name: string;
  nativeName: string;
};

export function LanguageModal(): React.JSX.Element | null {
  const {
    isLanguageModalOpen,
    handleCloseLanguageModal,
    activeLanguage,
    filteredCountries: countries,
  } = useInternationalizationContext();

  const { form, setForm, selectedCountryIds, toggleCountry, isSaving, handleSubmit } =
    useLanguageForm();

  if (!isLanguageModalOpen) return null;

  const handleSaveClick = async (): Promise<void> => {
    await handleSubmit();
    handleCloseLanguageModal();
  };

  const fields: SettingsField<LanguageFormState>[] = [
    {
      key: 'code',
      label: 'Code',
      type: 'text',
      placeholder: 'e.g. EN',
      required: true,
    },
    {
      key: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'e.g. English',
      required: true,
    },
    {
      key: 'nativeName',
      label: 'Native Name',
      type: 'text',
      placeholder: 'e.g. English',
      required: true,
    },
    {
      key: 'name', // Using existing key for custom field as key is required
      label: 'Associated Countries',
      type: 'custom',
      render: () => (
        <div className='mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-border bg-card/50 p-3'>
          {countries.length === 0 ? (
            <Hint size='xs' italic className='col-span-2 py-4 text-center'>
              No countries available.
            </Hint>
          ) : (
            countries.map((country) => (
              <Label
                key={country.id}
                className='flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors'
              >
                <Checkbox
                  checked={selectedCountryIds.includes(country.id)}
                  onCheckedChange={() => toggleCountry(country.id)}
                />
                <span className='text-xs text-gray-200'>
                  {country.name} ({country.code})
                </span>
              </Label>
            ))
          )}
        </div>
      ),
    },
  ];

  const handleChange = (values: Partial<LanguageFormState>) => {
    if (values.code) {
      values.code = values.code.toUpperCase();
    }
    setForm((prev) => ({ ...prev, ...values }));
  };

  return (
    <SettingsPanelBuilder
      open={isLanguageModalOpen}
      onClose={handleCloseLanguageModal}
      title={activeLanguage ? 'Edit Language' : 'Add Language'}
      onSave={handleSaveClick}
      isSaving={isSaving}
      fields={fields}
      values={form}
      onChange={handleChange}
      size='md'
    />
  );
}
