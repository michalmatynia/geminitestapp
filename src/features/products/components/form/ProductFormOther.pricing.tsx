'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { SelectSimple } from '@/shared/ui/select-simple';
import { StatusBadge } from '@/shared/ui/status-badge';
import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';

import {
  buildPriceGroupPrices,
  resolvePriceGroupCurrencyCode,
  useCatalogDefaultPriceGroupSelection,
  type PriceGroupWithCalculatedPrice,
  type ProductFormOtherPricingSectionProps,
} from './ProductFormOther.pricing.logic';
import { ValidatedField } from './ValidatedField';

const DefaultPriceGroupField = ({
  isPriceGroupAutoSelected,
  onChange,
  options,
  value,
}: {
  isPriceGroupAutoSelected: boolean;
  onChange: (value: string) => void;
  options: Array<LabeledOptionDto<string>>;
  value: string;
}): React.JSX.Element => (
  <FormField
    label='Default Price Group'
    id='defaultPriceGroupId'
    description={isPriceGroupAutoSelected ? 'Auto-selected from catalog' : undefined}
  >
    <SelectSimple
      size='sm'
      onValueChange={onChange}
      value={value}
      ariaLabel='Default price group'
      options={options}
      placeholder='Select default price group'
      title='Select default price group'
    />
  </FormField>
);

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
  const { isPriceGroupAutoSelected, priceGroupOptions, selectedPriceGroupId } =
    useCatalogDefaultPriceGroupSelection(props);
  const priceGroupPrices = useMemo(
    () => buildPriceGroupPrices({ ...props, selectedDefaultPriceGroupId: selectedPriceGroupId }),
    [
      props.basePrice,
      props.filteredPriceGroups,
      props.sourcePrice,
      selectedPriceGroupId,
    ]
  );
  const handlePriceGroupChange = (value: string): void =>
    props.setValue('defaultPriceGroupId', value, {
      shouldDirty: true,
      shouldTouch: true,
    });
  if (props.hasCatalogs === false) return null;
  return (
    <FormSection title='Pricing' gridClassName='md:grid-cols-2'>
      <ValidatedField name='price' label='Base Price' type='number' step='0.01' placeholder='0.00' />
      <DefaultPriceGroupField
        isPriceGroupAutoSelected={isPriceGroupAutoSelected}
        onChange={handlePriceGroupChange}
        options={priceGroupOptions}
        value={selectedPriceGroupId}
      />
      <PriceGroupsOverview
        priceGroupPrices={priceGroupPrices}
        selectedDefaultPriceGroupId={selectedPriceGroupId}
      />
    </FormSection>
  );
}
