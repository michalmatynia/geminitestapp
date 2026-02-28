'use client';

import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { countryCodeOptions } from '@/shared/constants/internationalization';
import { Checkbox, Label, LoadingState, Hint } from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';

import { useCountryForm } from './hooks/useCountryForm';

type CountryFormState = {
  code: string;
  name: string;
};

export function CountryModal(): React.JSX.Element | null {
  const {
    isCountryModalOpen,
    handleCloseCountryModal,
    activeCountry,
    currencies: currencyOptions,
    loadingCurrencies,
  } = useInternationalizationContext();

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

  const fields: SettingsField<CountryFormState>[] = [
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
            <div className='mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-border bg-card/50 p-3'>
              {currencyOptions.length === 0 ? (
                <Hint size='xs' italic className='col-span-2 py-4 text-center'>
                  No currencies available.
                </Hint>
              ) : (
                currencyOptions.map((curr) => (
                  <Label
                    key={curr.id}
                    className='flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors'
                  >
                    <Checkbox
                      checked={selectedCurrencyIds.includes(curr.id)}
                      onCheckedChange={() => toggleCurrency(curr.id)}
                    />
                    <span className='text-xs text-gray-200'>
                      {curr.code} ({curr.name})
                    </span>
                  </Label>
                ))
              )}
            </div>
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
