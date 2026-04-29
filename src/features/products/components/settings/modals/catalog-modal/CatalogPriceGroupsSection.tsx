'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { matchesPriceGroupIdentifier } from '@/shared/lib/products/utils/price-group-identifiers';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/select-simple';

import { useCatalogModalContext } from './context/CatalogModalContext';

type CatalogPriceGroup = ReturnType<typeof useCatalogModalContext>['priceGroups'][number];

const findPriceGroupByIdentifier = (
  priceGroups: readonly CatalogPriceGroup[],
  identifier: string
): CatalogPriceGroup | undefined =>
  priceGroups.find((group) => matchesPriceGroupIdentifier(group, identifier));

const buildCatalogPriceGroupOptions = (
  catalogPriceGroupIds: readonly string[],
  priceGroups: readonly CatalogPriceGroup[]
): Array<LabeledOptionDto<string>> =>
  catalogPriceGroupIds.map((id) => ({
    value: id,
    label: findPriceGroupByIdentifier(priceGroups, id)?.name ?? id,
  }));

const resolvePriceGroupToggleLabel = (selectedIdentifier: string | undefined): string =>
  selectedIdentifier !== undefined && selectedIdentifier !== '' ? 'Remove' : 'Add';

export function CatalogPriceGroupsSection(): React.JSX.Element {
  const {
    catalogPriceGroupIds,
    togglePriceGroup,
    catalogDefaultPriceGroupId,
    setCatalogDefaultPriceGroupId,
    priceGroups,
    loadingGroups,
  } = useCatalogModalContext();
  const catalogPriceGroupOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () => buildCatalogPriceGroupOptions(catalogPriceGroupIds, priceGroups),
    [catalogPriceGroupIds, priceGroups]
  );

  return (
    <div className='rounded-md border border-border bg-card/70 p-4 space-y-4'>
      <Label className='text-sm font-semibold text-white'>Price Groups</Label>
      {loadingGroups ? (
        <p className='text-xs text-gray-500'>Loading groups...</p>
      ) : (
        <CatalogPriceGroupsContent
          catalogPriceGroupIds={catalogPriceGroupIds}
          catalogDefaultPriceGroupId={catalogDefaultPriceGroupId}
          setCatalogDefaultPriceGroupId={setCatalogDefaultPriceGroupId}
          catalogPriceGroupOptions={catalogPriceGroupOptions}
          priceGroups={priceGroups}
          togglePriceGroup={togglePriceGroup}
        />
      )}
    </div>
  );
}

function CatalogPriceGroupsContent({
  catalogPriceGroupIds,
  catalogDefaultPriceGroupId,
  setCatalogDefaultPriceGroupId,
  catalogPriceGroupOptions,
  priceGroups,
  togglePriceGroup,
}: {
  catalogPriceGroupIds: readonly string[];
  catalogDefaultPriceGroupId: string;
  setCatalogDefaultPriceGroupId: (id: string) => void;
  catalogPriceGroupOptions: Array<LabeledOptionDto<string>>;
  priceGroups: readonly CatalogPriceGroup[];
  togglePriceGroup: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <SelectedPriceGroupBadges
        catalogPriceGroupIds={catalogPriceGroupIds}
        priceGroups={priceGroups}
        togglePriceGroup={togglePriceGroup}
      />
      <AvailablePriceGroupList
        catalogPriceGroupIds={catalogPriceGroupIds}
        priceGroups={priceGroups}
        togglePriceGroup={togglePriceGroup}
      />
      <DefaultPriceGroupSelect
        catalogPriceGroupIds={catalogPriceGroupIds}
        catalogDefaultPriceGroupId={catalogDefaultPriceGroupId}
        setCatalogDefaultPriceGroupId={setCatalogDefaultPriceGroupId}
        catalogPriceGroupOptions={catalogPriceGroupOptions}
      />
    </div>
  );
}

function SelectedPriceGroupBadges({
  catalogPriceGroupIds,
  priceGroups,
  togglePriceGroup,
}: {
  catalogPriceGroupIds: readonly string[];
  priceGroups: readonly CatalogPriceGroup[];
  togglePriceGroup: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      {catalogPriceGroupIds.map((id) => (
        <Badge
          key={id}
          variant='secondary'
          className='h-7 rounded-full px-3 text-xs cursor-pointer hover:bg-secondary/80'
          onClick={() => togglePriceGroup(id)}
        >
          {findPriceGroupByIdentifier(priceGroups, id)?.name ?? id}{' '}
          <span className='ml-1 text-gray-500'>×</span>
        </Badge>
      ))}
    </div>
  );
}

function AvailablePriceGroupList({
  catalogPriceGroupIds,
  priceGroups,
  togglePriceGroup,
}: {
  catalogPriceGroupIds: readonly string[];
  priceGroups: readonly CatalogPriceGroup[];
  togglePriceGroup: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className='max-h-32 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-xs'>
      {priceGroups.map((group) => {
        const selectedIdentifier = catalogPriceGroupIds.find((identifier) =>
          matchesPriceGroupIdentifier(group, identifier)
        );
        return (
          <Button
            key={group.id}
            variant='ghost'
            className='w-full justify-between h-8 px-2'
            onClick={() => togglePriceGroup(selectedIdentifier ?? group.id)}
          >
            <span>
              {group.name} ({group.currencyCode})
            </span>
            <span>{resolvePriceGroupToggleLabel(selectedIdentifier)}</span>
          </Button>
        );
      })}
    </div>
  );
}

function DefaultPriceGroupSelect({
  catalogPriceGroupIds,
  catalogDefaultPriceGroupId,
  setCatalogDefaultPriceGroupId,
  catalogPriceGroupOptions,
}: {
  catalogPriceGroupIds: readonly string[];
  catalogDefaultPriceGroupId: string;
  setCatalogDefaultPriceGroupId: (id: string) => void;
  catalogPriceGroupOptions: Array<LabeledOptionDto<string>>;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label className='text-xs text-gray-400'>Default price group</Label>
      <SelectSimple
        size='sm'
        value={catalogDefaultPriceGroupId}
        onValueChange={setCatalogDefaultPriceGroupId}
        disabled={catalogPriceGroupIds.length === 0}
        placeholder='Select default price group'
        ariaLabel='Default price group'
        options={catalogPriceGroupOptions}
        triggerClassName='w-full bg-gray-900 border-border text-xs text-white h-9'
        title='Select default price group'
      />
    </div>
  );
}
