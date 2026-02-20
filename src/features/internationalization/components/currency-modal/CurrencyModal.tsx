'use client';

import React from 'react';

import type { CurrencyOption } from '@/shared/contracts/internationalization';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import { useCurrencyForm } from './hooks/useCurrencyForm';

interface CurrencyModalProps extends EntityModalProps<CurrencyOption> {}

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

export function CurrencyModal({
  isOpen,
  onClose,
  onSuccess,
  item: currency,
}: CurrencyModalProps): React.JSX.Element {
  const { form, setForm, saveMutation, handleSubmit: handleFormSubmit } =
    useCurrencyForm({ currency: currency ?? null });

  const handleSave = async (): Promise<void> => {
    await handleFormSubmit();
    onSuccess?.();
  };

  const handleChange = (values: Partial<CurrencyFormState>) => {
    // Handle uppercase for code
    if (values.code) {
      values.code = values.code.toUpperCase();
    }
    setForm(prev => ({ ...prev, ...values }));
  };

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title={currency ? 'Edit Currency' : 'Add Currency'}
      fields={FIELDS}
      values={form}
      onChange={handleChange}
      onSave={handleSave}
      isSaving={saveMutation.isPending}
      size='md'
    />
  );
}
