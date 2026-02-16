'use client';

import React, { useMemo } from 'react';

import { countryCodeOptions } from '@/shared/constants/internationalization';
import type { CountryOption, CurrencyOption } from '@/shared/types/domain/internationalization';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import { useCountryForm } from './hooks/useCountryForm';

interface CountryModalProps extends EntityModalProps<CountryOption, CurrencyOption> {}

type CountryFormState = {
  code: string;
  name: string;
};

export function CountryModal({
  isOpen,
  onClose,
  onSuccess,
  item: country,
  items: currencyOptions = [],
  loading: loadingCurrencies = false,
}: CountryModalProps): React.JSX.Element {
  const defaultOption = countryCodeOptions[0];
  const { form, setForm, selectedCurrencyIds, setSelectedCurrencyIds, saveMutation, handleSubmit } =
    useCountryForm({
      country: country ?? null,
      defaultCountryCode: defaultOption?.code ?? '',
      defaultCountryName: defaultOption?.name ?? '',
    });

  const handleSave = async (): Promise<void> => {
    await handleSubmit(currencyOptions);
    onSuccess?.();
  };

  const toggleCurrency = (id: string): void => {
    setSelectedCurrencyIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const fields: SettingsField<CountryFormState>[] = useMemo(() => [
    {
      key: 'code',
      label: 'Code',
      type: 'select',
      options: countryCodeOptions.map(opt => ({
        value: opt.code,
        label: `${opt.code} · ${opt.name}`
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
            <p className='text-xs text-gray-500'>Loading currencies...</p>
          ) : (
            <div className='mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-border bg-card/50 p-3'>
              {currencyOptions.map((curr) => (
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
              ))}
            </div>
          )}
        </div>
      )
    }
  ], [currencyOptions, selectedCurrencyIds, loadingCurrencies]);

  const handleChange = (values: Partial<CountryFormState>) => {
    if (values.code) {
      const sel = countryCodeOptions.find((o) => o.code === values.code);
      setForm({ code: values.code, name: sel?.name ?? '' });
    } else {
      setForm(prev => ({ ...prev, ...values }));
    }
  };

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title={country ? 'Edit Country' : 'Add Country'}
      onSave={handleSave}
      isSaving={saveMutation.isPending}
      fields={fields}
      values={form}
      onChange={handleChange}
      size='md'
    />
  );
}
