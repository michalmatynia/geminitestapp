'use client';

import React from 'react';

import {
  useInternationalizationActions,
  useInternationalizationData,
  useInternationalizationUi,
} from '@/features/internationalization/context/InternationalizationContext';
import { countryCodeOptions } from '@/shared/constants/internationalization';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';

import { useCountryForm } from './hooks/useCountryForm';
import type { CodeNameDto } from '@/shared/contracts/base';
import {
  buildCountryModalFields,
  buildCountryModalTitle,
  resolveCountryFormChange,
  resolveCountryModalDefaults,
  toggleSelectedCountryCurrencyIds,
} from './CountryModal.helpers';

export function CountryModal(): React.JSX.Element | null {
  const { isCountryModalOpen, activeCountry } = useInternationalizationUi();
  const { handleCloseCountryModal } = useInternationalizationActions();
  const { currencies: currencyOptions, loadingCurrencies } = useInternationalizationData();
  const defaultCountry = resolveCountryModalDefaults(countryCodeOptions);

  const { form, setForm, selectedCurrencyIds, setSelectedCurrencyIds, saveMutation, handleSubmit } =
    useCountryForm({
      country: activeCountry ?? null,
      defaultCountryCode: defaultCountry.code,
      defaultCountryName: defaultCountry.name,
    });

  if (!isCountryModalOpen) return null;

  const handleSave = async (): Promise<void> => {
    await handleSubmit(currencyOptions);
    handleCloseCountryModal();
  };

  const toggleCurrency = (id: string): void => {
    setSelectedCurrencyIds((prev) => toggleSelectedCountryCurrencyIds(prev, id));
  };

  const fields = buildCountryModalFields({
    countryCodeOptions,
    currencyOptions,
    loadingCurrencies,
    selectedCurrencyIds,
    onToggleCurrency: toggleCurrency,
  });

  const handleChange = (values: Partial<CodeNameDto>) => {
    setForm((prev) => resolveCountryFormChange(prev, values, countryCodeOptions));
  };

  return (
    <SettingsPanelBuilder
      open={isCountryModalOpen}
      onClose={handleCloseCountryModal}
      title={buildCountryModalTitle(Boolean(activeCountry))}
      onSave={handleSave}
      isSaving={saveMutation.isPending}
      fields={fields}
      values={form}
      onChange={handleChange}
      size='md'
    />
  );
}
