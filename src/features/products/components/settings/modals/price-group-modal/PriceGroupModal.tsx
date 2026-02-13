'use client';

import React from 'react';
import { useInternationalizationContext } from '@/features/internationalization';
import { SettingsFormModal, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui';
import { usePriceGroupForm } from './hooks/usePriceGroupForm';
import { PriceGroupFormFields } from './PriceGroupFormFields';
import type { PriceGroup } from '@/features/products/types';

interface PriceGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  priceGroup?: PriceGroup | null;
  priceGroups: PriceGroup[];
}

export function PriceGroupModal({
  isOpen,
  onClose,
  onSuccess,
  priceGroup,
  priceGroups,
}: PriceGroupModalProps): React.JSX.Element {
  const {
    currencies: currencyOptions,
    loadingCurrencies,
  } = useInternationalizationContext();

  const { form, setForm, saveMutation, handleSubmit: handleFormSubmit } =
    usePriceGroupForm({ priceGroup });

  const handleSave = async (): Promise<void> => {
    await handleFormSubmit();
    onSuccess();
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
        <PriceGroupFormFields
          name={form.name}
          onNameChange={(name) => setForm((p) => ({ ...p, name }))}
          currencyCode={form.currencyCode}
          onCurrencyCodeChange={(currencyCode) =>
            setForm((p) => ({ ...p, currencyCode }))
          }
          isDefault={form.isDefault}
          onIsDefaultChange={(isDefault) =>
            setForm((p) => ({ ...p, isDefault }))
          }
        />

        <div className='space-y-2'>
          <label className='text-sm font-medium text-white'>Select Currency</label>
          {loadingCurrencies ? (
            <p className='text-xs text-gray-500'>Loading currencies...</p>
          ) : (
            <Select
              value={form.currencyCode}
              onValueChange={(value: string) =>
                setForm((p) => ({ ...p, currencyCode: value }))
              }
            >
              <SelectTrigger className='w-full bg-gray-900 border-border text-white'>
                <SelectValue placeholder='Select currency' />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((curr) => (
                  <SelectItem key={curr.id} value={curr.code}>
                    {curr.code} - {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </SettingsFormModal>
  );
}
