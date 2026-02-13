'use client';

import React from 'react';
import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { SettingsFormModal } from '@/shared/ui';
import { useCountryForm } from './hooks/useCountryForm';
import { CountryFormFields } from './CountryFormFields';
import { CountryCurrencySection } from './CountryCurrencySection';
import { countryCodeOptions } from '@/shared/constants/internationalization';

export function CountryModal(): React.JSX.Element {
  const {
    showCountryModal: isOpen,
    setCountryModalOpen,
    editingCountry: country,
    currencies: currencyOptions,
    loadingCurrencies,
  } = useInternationalizationContext();

  const onClose = () => setCountryModalOpen(false);
  const onSuccess = () => setCountryModalOpen(false);

  const defaultOption = countryCodeOptions[0];
  const { form, setForm, selectedCurrencyIds, setSelectedCurrencyIds, saveMutation, handleSubmit } =
    useCountryForm({
      country,
      defaultCountryCode: defaultOption?.code ?? '',
      defaultCountryName: defaultOption?.name ?? '',
    });

  const handleSave = async (): Promise<void> => {
    await handleSubmit(currencyOptions);
    onSuccess();
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
        <CountryFormFields
          code={form.code}
          onCodeChange={(code, name) => setForm({ code, name })}
          name={form.name}
          onNameChange={(name) => setForm((p) => ({ ...p, name }))}
        />
        <CountryCurrencySection
          currencyOptions={currencyOptions}
          selectedCurrencyIds={selectedCurrencyIds}
          onToggleCurrency={toggleCurrency}
          loadingCurrencies={loadingCurrencies}
        />
      </div>
    </SettingsFormModal>
  );
}
