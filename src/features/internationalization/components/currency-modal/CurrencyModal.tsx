'use client';

import React from 'react';

import {
  useInternationalizationActions,
  useInternationalizationUi,
} from '@/features/internationalization/context/InternationalizationContext';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';

import { useCurrencyForm } from './hooks/useCurrencyForm';

type CurrencyFormState = {
  code: string;
  name: string;
  symbol: string;
};

const FIELDS: SettingsField<CurrencyFormState>[] = [
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

  const handleChange = (values: Partial<CurrencyFormState>) => {
    // Handle uppercase for code
    if (values.code) {
      values.code = values.code.toUpperCase();
    }
    setForm((prev) => ({ ...prev, ...values }));
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
