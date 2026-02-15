'use client';

import React from 'react';

import type { CurrencyOption } from '@/shared/types/domain/internationalization';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { SettingsFormModal } from '@/shared/ui';

import { CurrencyFormFields } from './CurrencyFormFields';
import { CurrencyModalProvider } from './CurrencyModalContext';
import { useCurrencyForm } from './hooks/useCurrencyForm';

interface CurrencyModalProps extends EntityModalProps<CurrencyOption> {}

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
        <CurrencyModalProvider value={{ form, setForm }}>
          <CurrencyFormFields />
        </CurrencyModalProvider>
      </div>
    </SettingsFormModal>
  );
}
