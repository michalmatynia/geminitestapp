'use client';

import React, { useMemo } from 'react';
import type { UseFormSetValue } from 'react-hook-form';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  PRICE_GROUP_SOURCE_PRICE_FIELD,
  type CatalogRecord,
} from '@/shared/contracts/products/catalogs';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { PriceGroupWithDetails } from '@/shared/contracts/products/product';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { SelectSimple } from '@/shared/ui/select-simple';
import { StatusBadge } from '@/shared/ui/status-badge';
import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';

import { ValidatedField } from './ValidatedField';

interface PriceGroupWithCalculatedPrice extends PriceGroupWithDetails {
  calculatedPrice: number | null;
  isCalculated: boolean;
  sourceGroupName: string | undefined;
}

type ProductFormOtherPricingSectionProps = {
  hasCatalogs: boolean;
  isNewProduct: boolean;
  catalogs: CatalogRecord[];
  selectedCatalogIds: string[];
  basePrice: number;
  sourcePrice: number | null;
  selectedDefaultPriceGroupId: string;
  filteredPriceGroups: PriceGroupWithDetails[];
  setValue: UseFormSetValue<ProductFormData>;
};

const hasPriceMultiplierSource = (group: PriceGroupWithDetails): boolean =>
  ((typeof group.sourceGroupId === 'string' && group.sourceGroupId.trim() !== '') ||
    group.basePriceField === PRICE_GROUP_SOURCE_PRICE_FIELD) &&
  typeof group.priceMultiplier === 'number' &&
  Number.isFinite(group.priceMultiplier);

const resolvePriceGroupCurrencyCode = (group: PriceGroupWithDetails): string => {
  const currency = (group as { currency?: { code?: unknown } }).currency;
  return typeof currency?.code === 'string' ? currency.code : group.currencyCode;
};

const buildBasePriceGroupPrice = (
  group: PriceGroupWithDetails,
  basePrice: number,
  selectedDefaultPriceGroupId: string
): PriceGroupWithCalculatedPrice => ({
  ...group,
  calculatedPrice: group.id === selectedDefaultPriceGroupId ? basePrice : null,
  isCalculated: false,
  sourceGroupName: undefined,
});

const buildCalculatedPriceGroupPrice = (
  group: PriceGroupWithDetails,
  sourcePrice: number | null,
  sourceGroupName: string | undefined
): PriceGroupWithCalculatedPrice => ({
  ...group,
  calculatedPrice:
    sourcePrice !== null ? sourcePrice * group.priceMultiplier + group.addToPrice : null,
  isCalculated: true,
  sourceGroupName,
});

const buildPriceGroupPrices = ({
  filteredPriceGroups,
  selectedDefaultPriceGroupId,
  basePrice,
  sourcePrice,
}: Pick<
  ProductFormOtherPricingSectionProps,
  'filteredPriceGroups' | 'selectedDefaultPriceGroupId' | 'basePrice' | 'sourcePrice'
>): PriceGroupWithCalculatedPrice[] =>
  filteredPriceGroups.map((group) => {
    if (hasPriceMultiplierSource(group) === false) {
      return buildBasePriceGroupPrice(group, basePrice, selectedDefaultPriceGroupId);
    }
    if (group.basePriceField === PRICE_GROUP_SOURCE_PRICE_FIELD) {
      return buildCalculatedPriceGroupPrice(group, sourcePrice, 'Source price');
    }
    const sourceGroup =
      filteredPriceGroups.find((candidate) => candidate.id === group.sourceGroupId) ?? null;
    const resolvedSourcePrice = sourceGroup?.id === selectedDefaultPriceGroupId ? basePrice : null;
    return buildCalculatedPriceGroupPrice(group, resolvedSourcePrice, sourceGroup?.name);
  });

const buildPriceGroupOptions = (
  filteredPriceGroups: PriceGroupWithDetails[]
): Array<LabeledOptionDto<string>> =>
  filteredPriceGroups.map((group) => ({
    value: group.id,
    label: `${group.name}${group.isDefault ? ' (Default)' : ''} (${resolvePriceGroupCurrencyCode(group)})`,
  }));

const PriceGroupsOverview = ({
  priceGroupPrices,
  selectedDefaultPriceGroupId,
}: {
  priceGroupPrices: PriceGroupWithCalculatedPrice[];
  selectedDefaultPriceGroupId: string;
}): React.JSX.Element | null => {
  if (selectedDefaultPriceGroupId === '' || priceGroupPrices.length === 0) return null;
  return (
    <div className='md:col-span-2 space-y-2'>
      <StandardDataTablePanel
        title='Price Groups Overview'
        description='Blue prices are automatically calculated based on the default group.'
        columns={[
          {
            accessorKey: 'name',
            header: 'Price Group',
            cell: ({ row }: { row: { original: PriceGroupWithCalculatedPrice } }) => (
              <PriceGroupNameCell row={row} selectedDefaultPriceGroupId={selectedDefaultPriceGroupId} />
            ),
          },
          {
            accessorKey: 'currencyCode',
            header: 'Currency',
            cell: ({ row }: { row: { original: PriceGroupWithCalculatedPrice } }) => (
              <span className='text-gray-500'>{resolvePriceGroupCurrencyCode(row.original)}</span>
            ),
          },
          {
            accessorKey: 'calculatedPrice',
            header: () => <div className='text-right'>Price</div>,
            cell: ({ row }: { row: { original: PriceGroupWithCalculatedPrice } }) => (
              <PriceGroupPriceCell row={row} />
            ),
          },
        ]}
        data={priceGroupPrices}
        variant='flat'
      />
    </div>
  );
};

const PriceGroupNameCell = ({
  row,
  selectedDefaultPriceGroupId,
}: {
  row: { original: PriceGroupWithCalculatedPrice };
  selectedDefaultPriceGroupId: string;
}): React.JSX.Element => {
  const isSelected = row.original.id === selectedDefaultPriceGroupId;
  return (
    <div className='flex items-center gap-2'>
      <span className={isSelected ? 'font-semibold text-white' : 'text-gray-300'}>
        {row.original.name}
      </span>
      {isSelected ? (
        <StatusBadge status='Selected' variant='active' size='sm' className='font-bold' />
      ) : null}
      {row.original.isCalculated && row.original.sourceGroupName !== undefined ? (
        <span className='text-[10px] text-gray-500 italic'>
          ({row.original.sourceGroupName} x {row.original.priceMultiplier})
        </span>
      ) : null}
    </div>
  );
};

const PriceGroupPriceCell = ({
  row,
}: {
  row: { original: PriceGroupWithCalculatedPrice };
}): React.JSX.Element => (
  <div className='text-right font-mono'>
    {row.original.calculatedPrice !== null ? (
      <span className={row.original.isCalculated ? 'text-blue-400' : 'text-white'}>
        {row.original.calculatedPrice.toFixed(2)}
      </span>
    ) : (
      <span className='text-gray-600'>-</span>
    )}
  </div>
);

export function ProductFormOtherPricingSection(
  props: ProductFormOtherPricingSectionProps
): React.JSX.Element | null {
  const selectedCatalog = props.catalogs.find((catalog) =>
    props.selectedCatalogIds.includes(catalog.id)
  );
  const isPriceGroupAutoAssigned =
    props.isNewProduct && typeof selectedCatalog?.defaultPriceGroupId === 'string';
  const priceGroupPrices = useMemo(
    () => buildPriceGroupPrices(props),
    [
      props.basePrice,
      props.filteredPriceGroups,
      props.selectedDefaultPriceGroupId,
      props.sourcePrice,
    ]
  );
  const priceGroupOptions = useMemo(
    () => buildPriceGroupOptions(props.filteredPriceGroups),
    [props.filteredPriceGroups]
  );
  if (props.hasCatalogs === false) return null;
  return (
    <FormSection title='Pricing' gridClassName='md:grid-cols-2'>
      <ValidatedField name='price' label='Base Price' type='number' step='0.01' placeholder='0.00' />
      <FormField
        label='Default Price Group'
        id='defaultPriceGroupId'
        description={isPriceGroupAutoAssigned ? 'Auto-assigned from catalog' : undefined}
      >
        <SelectSimple
          size='sm'
          onValueChange={(value: string): void =>
            props.setValue('defaultPriceGroupId', value, {
              shouldDirty: true,
              shouldTouch: true,
            })
          }
          value={props.selectedDefaultPriceGroupId}
          disabled={isPriceGroupAutoAssigned}
          ariaLabel='Default price group'
          options={priceGroupOptions}
          placeholder='Select default price group'
          triggerClassName={isPriceGroupAutoAssigned ? 'cursor-not-allowed opacity-60' : ''}
          title='Select default price group'
        />
      </FormField>
      <PriceGroupsOverview
        priceGroupPrices={priceGroupPrices}
        selectedDefaultPriceGroupId={props.selectedDefaultPriceGroupId}
      />
    </FormSection>
  );
}
