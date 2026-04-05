'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { PriceGroup } from '@/shared/contracts/products/catalogs';
import { findPriceGroupByIdentifier } from '@/shared/lib/products/utils/price-group-identifiers';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/form-section';
import { SelectSimple } from '@/shared/ui/select-simple';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';

import { useProductSettingsPriceGroupsContext } from '../ProductSettingsContext';

const formatPriceAdjustment = (group: PriceGroup): string => {
  const multiplier = Number.isFinite(group.priceMultiplier) ? group.priceMultiplier : 1;
  const addToPrice = Number.isFinite(group.addToPrice) ? group.addToPrice : 0;
  const operator = addToPrice >= 0 ? '+' : '-';

  return `× ${multiplier.toFixed(2)} ${operator} ${Math.abs(addToPrice).toFixed(2)}`;
};

const hasBasePriceAdjustment = (group: PriceGroup): boolean =>
  (Number.isFinite(group.priceMultiplier) ? group.priceMultiplier : 1) !== 1 ||
  (Number.isFinite(group.addToPrice) ? group.addToPrice : 0) !== 0;

const buildPriceGroupDescription = (group: PriceGroup, priceGroups: PriceGroup[]): string => {
  const descriptionParts: string[] = [];
  const trimmedDescription = group.description?.trim();

  if (trimmedDescription) {
    descriptionParts.push(trimmedDescription);
  }

  if (group.type === 'dependent') {
    const sourceGroup = findPriceGroupByIdentifier(priceGroups, group.sourceGroupId);
    const normalizedSourceIdentifier = String(group.sourceGroupId ?? '').trim();
    const sourceGroupLabel = sourceGroup
      ? `${sourceGroup.name} (${sourceGroup.currencyCode})`
      : normalizedSourceIdentifier
        ? `missing source group (${normalizedSourceIdentifier})`
        : 'missing source group';

    descriptionParts.push(`Depends on ${sourceGroupLabel} ${formatPriceAdjustment(group)}`);
  } else if (hasBasePriceAdjustment(group)) {
    descriptionParts.push(`Base price ${formatPriceAdjustment(group)}`);
  }

  return descriptionParts.join(' · ') || 'No description';
};

export function PriceGroupsSettings(): React.JSX.Element {
  const {
    loadingGroups,
    priceGroups,
    defaultGroupId,
    onDefaultGroupChange,
    defaultGroupSaving,
    onOpenPriceGroupCreate,
    onEditPriceGroup,
    onDeletePriceGroup,
  } = useProductSettingsPriceGroupsContext();
  const defaultGroupOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      priceGroups.map((group: PriceGroup) => ({
        value: group.id,
        label: `${group.name} (${group.groupId})`,
      })),
    [priceGroups]
  );
  const priceGroupItems = useMemo(
    () =>
      priceGroups.map((group: PriceGroup) => ({
        id: group.id,
        title: (
          <div className='flex items-center gap-2'>
            <span>{group.name}</span>
            {group.isDefault && (
              <Badge variant='success' className='text-[9px] h-4 px-1'>
                Default
              </Badge>
            )}
            <Badge variant='neutral' className='text-[9px] h-4 px-1 font-mono'>
              {group.groupId}
            </Badge>
          </div>
        ),
        subtitle: `${group.currencyCode} · ${group.type}`,
        description: buildPriceGroupDescription(group, priceGroups),
        original: group,
      })),
    [priceGroups]
  );

  return (
    <div className='space-y-4'>
      <FormSection
        title='Price Groups'
        description='Configure pricing tiers and group rules for products.'
        actions={
          <Button className='min-w-[100px]' type='button' onClick={onOpenPriceGroupCreate}>
            Add Price Group
          </Button>
        }
        className='p-6'
      >
        <div className='mt-4'>
          <SimpleSettingsList
            items={priceGroupItems}
            isLoading={loadingGroups}
            onEdit={(item) => {
              onEditPriceGroup(item.original);
            }}
            onDelete={(item) => {
              onDeletePriceGroup(item.original);
            }}
            emptyMessage='At least one price group is required. Add a price group to continue.'
          />
        </div>
      </FormSection>

      <FormSection
        title='Default price group'
        description='Required. Select one of the available price groups.'
        variant='subtle'
        className='p-4'
      >
        <div className='mt-4'>
          <SelectSimple
            size='sm'
            value={defaultGroupId}
            onValueChange={onDefaultGroupChange}
            disabled={priceGroups.length === 0 || defaultGroupSaving}
            options={defaultGroupOptions}
            placeholder='Select default price group'
            ariaLabel='Default price group'
           title='Select default price group'/>
          {defaultGroupSaving ? (
            <p className='mt-2 text-xs text-gray-500'>Saving default...</p>
          ) : null}
        </div>
      </FormSection>
    </div>
  );
}
