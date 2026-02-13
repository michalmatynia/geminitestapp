import React from 'react';
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui';
import type { PriceGroup } from '@/features/products/types';

interface CatalogPriceGroupsSectionProps {
  catalogPriceGroupIds: string[];
  onTogglePriceGroup: (id: string) => void;
  catalogDefaultPriceGroupId: string;
  onSetDefaultPriceGroupId: (id: string) => void;
  priceGroups: PriceGroup[];
  loadingGroups: boolean;
}

export function CatalogPriceGroupsSection({
  catalogPriceGroupIds,
  onTogglePriceGroup,
  catalogDefaultPriceGroupId,
  onSetDefaultPriceGroupId,
  priceGroups,
  loadingGroups,
}: CatalogPriceGroupsSectionProps): React.JSX.Element {
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
                  onClick={() => onTogglePriceGroup(id)}
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
                onClick={() => onTogglePriceGroup(group.id)}
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
            <Select
              value={catalogDefaultPriceGroupId}
              onValueChange={onSetDefaultPriceGroupId}
              disabled={catalogPriceGroupIds.length === 0}
            >
              <SelectTrigger className='w-full bg-gray-900 border-border text-xs text-white'>
                <SelectValue placeholder='Select default price group' />
              </SelectTrigger>
              <SelectContent>
                {catalogPriceGroupIds.map((id) => {
                  const group = priceGroups.find((g) => g.id === id);
                  return (
                    <SelectItem key={id} value={id}>
                      {group?.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
