'use client';

import React, { useMemo } from 'react';

import { useInternationalizationData } from '@/features/internationalization/public';
import type { PriceGroup } from '@/shared/contracts/products/catalogs';
import type { EntityModalProps } from '@/shared/contracts/ui/modals';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';

import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

import { useProductSettingsPriceGroupsContext } from '../../ProductSettingsContext';
import { usePriceGroupForm } from './hooks/usePriceGroupForm';

interface PriceGroupModalProps extends EntityModalProps<PriceGroup> {}

type PriceGroupFormState = {
  name: string;
  currencyCode: string;
  isDefault: boolean;
  type: string;
  sourceGroupId: string;
  priceMultiplier: number;
  addToPrice: number;
};

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const wouldCreateSourceGroupCycle = ({
  currentPriceGroup,
  sourceGroupId,
  priceGroups,
}: {
  currentPriceGroup?: PriceGroup | null | undefined;
  sourceGroupId: string;
  priceGroups: PriceGroup[];
}): boolean => {
  const normalizedSourceGroupId = toTrimmedString(sourceGroupId);
  if (!normalizedSourceGroupId) {
    return false;
  }

  const selfIdentifiers = new Set(
    [currentPriceGroup?.id, currentPriceGroup?.groupId]
      .map((value) => toTrimmedString(value))
      .filter(Boolean)
  );
  const groupByIdentifier = new Map<string, PriceGroup>();

  priceGroups.forEach((group) => {
    const id = toTrimmedString(group.id);
    const groupId = toTrimmedString(group.groupId);
    if (id) {
      groupByIdentifier.set(id, group);
    }
    if (groupId) {
      groupByIdentifier.set(groupId, group);
    }
  });

  const visited = new Set<string>();
  let currentIdentifier = normalizedSourceGroupId;

  while (currentIdentifier) {
    if (selfIdentifiers.has(currentIdentifier) || visited.has(currentIdentifier)) {
      return true;
    }

    visited.add(currentIdentifier);
    const currentGroup = groupByIdentifier.get(currentIdentifier);
    currentIdentifier = toTrimmedString(currentGroup?.sourceGroupId);
  }

  return false;
};

export function PriceGroupModal(props: PriceGroupModalProps): React.JSX.Element {
  const { isOpen, onClose, onSuccess, item: priceGroup } = props;

  const { currencies: currencyOptions, loadingCurrencies } = useInternationalizationData();
  const { priceGroups } = useProductSettingsPriceGroupsContext();

  const {
    form,
    setForm,
    saveMutation,
    handleSubmit: handleFormSubmit,
  } = usePriceGroupForm({ priceGroup, priceGroups });

  const sourceGroupOptions = useMemo(
    () =>
      priceGroups
        .filter((group) => {
          const normalizedId = toTrimmedString(group.id);
          if (!normalizedId) return false;
          return !wouldCreateSourceGroupCycle({
            currentPriceGroup: priceGroup,
            sourceGroupId: normalizedId,
            priceGroups,
          });
        })
        .map((group) => ({
          value: group.id,
          label: `${group.name} (${group.currencyCode})`,
        })),
    [priceGroup, priceGroups]
  );

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
      {
        key: 'type',
        label: 'Group type',
        type: 'select',
        options: [
          { value: 'standard', label: 'Standard' },
          { value: 'dependent', label: 'Dependent' },
        ],
        placeholder: 'Select price group type',
        required: true,
      },
      {
        key: 'sourceGroupId',
        label: 'Source price group',
        type: 'select',
        options: sourceGroupOptions,
        placeholder: 'Select source price group',
        disabled: form.type !== 'dependent',
      },
      {
        key: 'priceMultiplier',
        label: 'Price multiplier',
        type: 'number',
        step: 0.01,
      },
      {
        key: 'addToPrice',
        label: 'Add to price',
        type: 'number',
        step: 0.01,
      },
    ],
    [currencyOptions, form.type, loadingCurrencies, sourceGroupOptions]
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
