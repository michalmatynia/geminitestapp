'use client';

import React from 'react';

import {
  useInternationalizationActions,
  useInternationalizationData,
  useInternationalizationUi,
} from '@/features/internationalization/context/InternationalizationContext';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/ui/settings';

import { useLanguageForm } from './hooks/useLanguageForm';
import { renderSelectionChecklistGrid } from '../shared/renderSelectionChecklistGrid';

type LanguageFormState = {
  code: string;
  name: string;
  nativeName: string;
};

export function LanguageModal(): React.JSX.Element | null {
  const { isLanguageModalOpen, activeLanguage } = useInternationalizationUi();
  const { handleCloseLanguageModal } = useInternationalizationActions();
  const { filteredCountries: countries } = useInternationalizationData();

  const { form, setForm, selectedCountryIds, toggleCountry, isSaving, handleSubmit } =
    useLanguageForm();

  if (!isLanguageModalOpen) return null;

  const handleSaveClick = async (): Promise<void> => {
    await handleSubmit();
    handleCloseLanguageModal();
  };

  const fields: SettingsPanelField<LanguageFormState>[] = [
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
      render: () =>
        renderSelectionChecklistGrid({
          className: 'mt-2',
          items: countries.map((country) => ({
            id: country.id,
            label: `${country.name} (${country.code})`,
          })),
          selectedIds: selectedCountryIds,
          onToggle: toggleCountry,
          emptyMessage: 'No countries available.',
        }),
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
