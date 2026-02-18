import React from 'react';

import { Button, Label, SelectSimple } from '@/shared/ui';

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

  return (
    <div className='rounded-md border border-border bg-card/70 p-4 space-y-4'>
      <Label className='text-sm font-semibold text-white'>
        Price Groups
      </Label>
      {loadingGroups ? (
        <p className='text-xs text-gray-500'>Loading groups...</p>
      ) : (
        <div className='space-y-4'>
          <div className='flex flex-wrap gap-2'>
            {catalogPriceGroupIds.map((id) => {
              const group = priceGroups.find((g) => g.id === id);
              return (
                <Button
                  key={id}
                  variant='secondary'
                  className='h-7 rounded-full px-3 text-xs'
                  onClick={() => togglePriceGroup(id)}
                >
                  {group?.name ?? id}{' '}
                  <span className='ml-1 text-gray-500'>×</span>
                </Button>
              );
            })}
          </div>

          <div className='max-h-32 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-xs'>
            {priceGroups.map((group) => (
              <Button
                key={group.id}
                variant='ghost'
                className='w-full justify-between h-8 px-2'
                onClick={() => togglePriceGroup(group.id)}
              >
                <span>
                  {group.name} ({group.currencyCode})
                </span>
                <span>
                  {catalogPriceGroupIds.includes(group.id)
                    ? 'Remove'
                    : 'Add'}
                </span>
              </Button>
            ))}
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>
              Default price group
            </Label>
            <SelectSimple
              size='sm'
              value={catalogDefaultPriceGroupId}
              onValueChange={setCatalogDefaultPriceGroupId}
              disabled={catalogPriceGroupIds.length === 0}
              placeholder='Select default price group'
              options={catalogPriceGroupIds.map((id) => {
                const group = priceGroups.find((g) => g.id === id);
                return {
                  value: id,
                  label: group?.name ?? id
                };
              })}
              triggerClassName='w-full bg-gray-900 border-border text-xs text-white h-9'
            />
          </div>
        </div>
      )}
    </div>
  );
}
