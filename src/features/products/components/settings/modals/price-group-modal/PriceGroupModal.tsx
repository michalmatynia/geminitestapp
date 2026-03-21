'use client';

import React, { useMemo } from 'react';

import { useInternationalizationData } from '@/features/internationalization/public';
import type { PriceGroup } from '@/shared/contracts/products';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui';

import { usePriceGroupForm } from './hooks/usePriceGroupForm';

interface PriceGroupModalProps extends EntityModalProps<PriceGroup> {}

type PriceGroupFormState = {
  name: string;
  currencyCode: string;
  isDefault: boolean;
};

export function PriceGroupModal(props: PriceGroupModalProps): React.JSX.Element {
  const { isOpen, onClose, onSuccess, item: priceGroup } = props;

  const { currencies: currencyOptions, loadingCurrencies } = useInternationalizationData();

  const {
    form,
    setForm,
    saveMutation,
    handleSubmit: handleFormSubmit,
  } = usePriceGroupForm({ priceGroup });

  const handleSave = async (): Promise<void> => {
    await handleFormSubmit();
    onSuccess?.();
  };

  const fields: SettingsPanelField<PriceGroupFormState>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'e.g. Standard',
        required: true,
      },
      {
        key: 'currencyCode',
        label: 'Currency',
        type: 'select',
        options: currencyOptions.map((curr) => ({
          value: curr.code,
          label: `${curr.code} · ${curr.name}`,
        })),
        placeholder: loadingCurrencies ? 'Loading currencies...' : 'Select currency',
        disabled: loadingCurrencies,
        required: true,
      },
      {
        key: 'isDefault',
        label: 'Set as default price group',
        type: 'checkbox',
      },
    ],
    [currencyOptions, loadingCurrencies]
  );

  const handleChange = (values: Partial<PriceGroupFormState>) => {
    setForm((prev) => ({ ...prev, ...values }));
  };

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title={priceGroup ? 'Edit Price Group' : 'Create Price Group'}
      fields={fields}
      values={form}
      onChange={handleChange}
      onSave={handleSave}
      isSaving={saveMutation.isPending}
      size='md'
    />
  );
}
