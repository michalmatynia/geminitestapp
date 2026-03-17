'use client';

import React from 'react';

import {
  useInternationalizationActions,
  useInternationalizationData,
  useInternationalizationUi,
} from '@/features/internationalization/context/InternationalizationContext';
import { countryCodeOptions } from '@/shared/constants/internationalization';
import { LoadingState } from '@/shared/ui';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui';

import { useCountryForm } from './hooks/useCountryForm';
import { renderSelectionChecklistGrid } from '../shared/renderSelectionChecklistGrid';

type CountryFormState = {
  code: string;
  name: string;
};

export function CountryModal(): React.JSX.Element | null {
  const { isCountryModalOpen, activeCountry } = useInternationalizationUi();
  const { handleCloseCountryModal } = useInternationalizationActions();
  const { currencies: currencyOptions, loadingCurrencies } = useInternationalizationData();

  const defaultOption = countryCodeOptions[0];
  const { form, setForm, selectedCurrencyIds, setSelectedCurrencyIds, saveMutation, handleSubmit } =
    useCountryForm({
      country: activeCountry ?? null,
      defaultCountryCode: defaultOption?.code ?? '',
      defaultCountryName: defaultOption?.name ?? '',
    });

  if (!isCountryModalOpen) return null;

  const handleSave = async (): Promise<void> => {
    await handleSubmit(currencyOptions);
    handleCloseCountryModal();
  };

  const toggleCurrency = (id: string): void => {
    setSelectedCurrencyIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const fields: SettingsPanelField<CountryFormState>[] = [
    {
      key: 'code',
      label: 'Code',
      type: 'select',
      options: countryCodeOptions.map((opt) => ({
        value: opt.code,
        label: `${opt.code} · ${opt.name}`,
      })),
      required: true,
    },
    {
      key: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      key: 'name', // Using existing key for custom section
      label: 'Associated Currencies',
      type: 'custom',
      render: () => (
        <div className='space-y-2'>
          {loadingCurrencies ? (
            <LoadingState message='Loading currencies...' size='sm' className='py-4' />
          ) : (
            renderSelectionChecklistGrid({
              className: 'mt-2',
              items: currencyOptions.map((currency) => ({
                id: currency.id,
                label: `${currency.code} (${currency.name})`,
              })),
              selectedIds: selectedCurrencyIds,
              onToggle: toggleCurrency,
              emptyMessage: 'No currencies available.',
            })
          )}
        </div>
      ),
    },
  ];

  const handleChange = (values: Partial<CountryFormState>) => {
    if (values.code) {
      const sel = countryCodeOptions.find((o) => o.code === values.code);
      setForm({ code: values.code, name: sel?.name ?? '' });
    } else {
      setForm((prev) => ({ ...prev, ...values }));
    }
  };

  return (
    <SettingsPanelBuilder
      open={isCountryModalOpen}
      onClose={handleCloseCountryModal}
      title={activeCountry ? 'Edit Country' : 'Add Country'}
      onSave={handleSave}
      isSaving={saveMutation.isPending}
      fields={fields}
      values={form}
      onChange={handleChange}
      size='md'
    />
  );
}
