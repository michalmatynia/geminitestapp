'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { matchesPriceGroupIdentifier } from '@/shared/lib/products/utils/price-group-identifiers';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/select-simple';

import { useCatalogModalContext } from './context/CatalogModalContext';

export function CatalogPriceGroupsSection(): React.JSX.Element {
  const {
    catalogPriceGroupIds,
    togglePriceGroup,
    catalogDefaultPriceGroupId,
    setCatalogDefaultPriceGroupId,
    priceGroups,
    loadingGroups,
  } = useCatalogModalContext();
  const catalogPriceGroupOptions = useMemo<Array<LabeledOptionDto<string>>>(() => {
    const groupByIdentifier = (identifier: string) =>
      priceGroups.find((group) => matchesPriceGroupIdentifier(group, identifier));

    return catalogPriceGroupIds.map((id) => ({
      value: id,
      label: groupByIdentifier(id)?.name ?? id,
    }));
  }, [catalogPriceGroupIds, priceGroups]);

  return (
    <div className='rounded-md border border-border bg-card/70 p-4 space-y-4'>
      <Label className='text-sm font-semibold text-white'>Price Groups</Label>
      {loadingGroups ? (
        <p className='text-xs text-gray-500'>Loading groups...</p>
      ) : (
        <div className='space-y-4'>
          <div className='flex flex-wrap gap-2'>
            {catalogPriceGroupIds.map((id) => {
              const group = priceGroups.find((priceGroup) =>
                matchesPriceGroupIdentifier(priceGroup, id)
              );
              return (
                <Badge
                  key={id}
                  variant='secondary'
                  className='h-7 rounded-full px-3 text-xs cursor-pointer hover:bg-secondary/80'
                  onClick={() => togglePriceGroup(id)}
                >
                  {group?.name ?? id} <span className='ml-1 text-gray-500'>×</span>
                </Badge>
              );
            })}
          </div>

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
                  <span>{selectedIdentifier ? 'Remove' : 'Add'}</span>
                </Button>
              );
            })}
          </div>

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
             title='Select default price group'/>
          </div>
        </div>
      )}
    </div>
  );
}
