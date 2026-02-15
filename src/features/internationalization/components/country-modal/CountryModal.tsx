'use client';

import React from 'react';

import { countryCodeOptions } from '@/shared/constants/internationalization';
import type { CountryOption, CurrencyOption } from '@/shared/types/domain/internationalization';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { SettingsFormModal } from '@/shared/ui';

import { CountryCurrencySection } from './CountryCurrencySection';
import { CountryFormFields } from './CountryFormFields';
import { CountryModalProvider } from './CountryModalContext';
import { useCountryForm } from './hooks/useCountryForm';

interface CountryModalProps extends EntityModalProps<CountryOption, CurrencyOption> {}

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

  return (
    <SettingsFormModal
      open={isOpen}
      onClose={onClose}
      title={country ? 'Edit Country' : 'Add Country'}
      onSave={handleSave}
      isSaving={saveMutation.isPending}
      size='md'
    >
      <div className='space-y-4'>
        <CountryModalProvider
          value={{
            form,
            setForm,
            currencyOptions,
            selectedCurrencyIds,
            toggleCurrency,
            loadingCurrencies,
          }}
        >
          <CountryFormFields />
          <CountryCurrencySection />
        </CountryModalProvider>
      </div>
    </SettingsFormModal>
  );
}
