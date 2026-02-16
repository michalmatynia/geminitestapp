'use client';

import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization';
import type { PriceGroup } from '@/features/products/types';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { SettingsFormModal, SelectSimple } from '@/shared/ui';

import { usePriceGroupForm } from './hooks/usePriceGroupForm';
import { PriceGroupFormFields } from './PriceGroupFormFields';
import { PriceGroupModalProvider } from './PriceGroupModalContext';

interface PriceGroupModalProps extends EntityModalProps<PriceGroup> {}

export function PriceGroupModal({
  isOpen,
  onClose,
  onSuccess,
  item: priceGroup,
  items: _priceGroups,
}: PriceGroupModalProps): React.JSX.Element {
  const {
    currencies: currencyOptions,
    loadingCurrencies,
  } = useInternationalizationContext();

  const { form, setForm, saveMutation, handleSubmit: handleFormSubmit } =
    usePriceGroupForm({ priceGroup });

  const handleSave = async (): Promise<void> => {
    await handleFormSubmit();
    onSuccess?.();
  };

  return (
    <SettingsFormModal
      open={isOpen}
      onClose={onClose}
      title={priceGroup ? 'Edit Price Group' : 'Create Price Group'}
      onSave={handleSave}
      isSaving={saveMutation.isPending}
      size='md'
    >
      <div className='space-y-4'>
        <PriceGroupModalProvider value={{ form, setForm }}>
          <PriceGroupFormFields />

          <div className='space-y-2'>
            <label className='text-sm font-medium text-white'>Select Currency</label>
            {loadingCurrencies ? (
              <p className='text-xs text-gray-500'>Loading currencies...</p>
            ) : (
              <SelectSimple
                size='sm'
                value={form.currencyCode}
                onValueChange={(value: string) =>
                  setForm((p) => ({ ...p, currencyCode: value }))
                }
                options={currencyOptions.map((curr) => ({
                  value: curr.code,
                  label: `${curr.code} - ${curr.name}`,
                }))}
                placeholder='Select currency'
                triggerClassName='w-full bg-gray-900 border-border text-white'
              />
            )}
          </div>
        </PriceGroupModalProvider>
      </div>
    </SettingsFormModal>
  );
}
