'use client';

import React from 'react';

import {
  useInternationalizationActions,
  useInternationalizationUi,
} from '@/features/internationalization/context/InternationalizationContext';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

import { useCurrencyForm } from './hooks/useCurrencyForm';

type CurrencyFormState = {
  code: string;
  name: string;
  symbol: string;
};

const FIELDS: SettingsPanelField<CurrencyFormState>[] = [
  {
    key: 'code',
    label: 'Code',
    type: 'text',
    placeholder: 'PLN',
    required: true,
  },
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    placeholder: 'Polish Zloty',
    required: true,
  },
  {
    key: 'symbol',
    label: 'Symbol',
    type: 'text',
    placeholder: 'zł',
    required: true,
  },
];

export function CurrencyModal(): React.JSX.Element | null {
  const { isCurrencyModalOpen, activeCurrency } = useInternationalizationUi();
  const { handleCloseCurrencyModal } = useInternationalizationActions();

  const {
    form,
    setForm,
    saveMutation,
    handleSubmit: handleFormSubmit,
  } = useCurrencyForm({ currency: activeCurrency ?? null });

  if (!isCurrencyModalOpen) return null;

  const handleSave = async (): Promise<void> => {
    await handleFormSubmit();
    handleCloseCurrencyModal();
  };

  const handleChange = (values: Partial<CurrencyFormState>): void => {
    // Handle uppercase for code
    const updatedValues = { ...values };
    if (updatedValues.code !== undefined && updatedValues.code !== '') {
      updatedValues.code = updatedValues.code.toUpperCase();
    }
    setForm((prev) => ({ ...prev, ...updatedValues }));
  };

  return (
    <SettingsPanelBuilder
      open={isCurrencyModalOpen}
      onClose={handleCloseCurrencyModal}
      title={activeCurrency ? 'Edit Currency' : 'Add Currency'}
      fields={FIELDS}
      values={form}
      onChange={handleChange}
      onSave={handleSave}
      isSaving={saveMutation.isPending}
      size='md'
    />
  );
}
