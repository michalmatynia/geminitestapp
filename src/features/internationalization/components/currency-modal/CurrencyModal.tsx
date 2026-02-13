'use client';

import React from 'react';
import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { SettingsFormModal } from '@/shared/ui';
import { useCurrencyForm } from './hooks/useCurrencyForm';
import { CurrencyFormFields } from './CurrencyFormFields';

export function CurrencyModal(): React.JSX.Element {
  const {
    showCurrencyModal: isOpen,
    setCurrencyModalOpen,
    editingCurrency: currency,
  } = useInternationalizationContext();

  const onClose = () => setCurrencyModalOpen(false);
  const onSuccess = () => setCurrencyModalOpen(false);

  const { form, setForm, saveMutation, handleSubmit: handleFormSubmit } =
    useCurrencyForm({ currency });

  const handleSave = async (): Promise<void> => {
    await handleFormSubmit();
    onSuccess();
  };

  return (
    <SettingsFormModal
      open={isOpen}
      onClose={onClose}
      title={currency ? 'Edit Currency' : 'Add Currency'}
      onSave={handleSave}
      isSaving={saveMutation.isPending}
      size='md'
    >
      <div className='space-y-4'>
        <CurrencyFormFields
          code={form.code}
          onCodeChange={(code) => setForm((p) => ({ ...p, code }))}
          name={form.name}
          onNameChange={(name) => setForm((p) => ({ ...p, name }))}
          symbol={form.symbol}
          onSymbolChange={(symbol) => setForm((p) => ({ ...p, symbol }))}
        />
      </div>
    </SettingsFormModal>
  );
}
