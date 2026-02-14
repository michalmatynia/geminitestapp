'use client';

import React from 'react';

import type { BaseInventory, Template } from '@/features/data-import-export/types/imports';
import { useListingSettingsContext } from '@/features/integrations/context/ListingSettingsContext';
import { Label, SelectSimple, Checkbox } from '@/shared/ui';

export function BaseListingSettings(): React.JSX.Element {
  const {
    inventories,
    selectedInventoryId,
    setSelectedInventoryId,
    loadingInventories,
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    allowDuplicateSku,
    setAllowDuplicateSku,
  } = useListingSettingsContext();

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='inventory'>
          Base.com Inventory {loadingInventories && '(Loading...)'}
        </Label>
        <SelectSimple
          value={selectedInventoryId}
          onValueChange={setSelectedInventoryId}
          disabled={loadingInventories || inventories.length === 0}
          options={inventories
            .filter((inventory: BaseInventory): boolean => !!inventory.inventory_id)
            .map((inventory: BaseInventory) => ({
              value: inventory.inventory_id,
              label: inventory.name
            }))}
          placeholder='Select inventory...'
        />
        {inventories.length === 0 && !loadingInventories && (
          <p className='text-xs text-red-400'>
            No inventories found. Please check your Base.com account.
          </p>
        )}
      </div>

      <div className='space-y-2'>
        <Label htmlFor='template'>Template (Optional)</Label>
        <SelectSimple
          value={selectedTemplateId}
          onValueChange={setSelectedTemplateId}
          options={[
            { value: 'none', label: 'No template' },
            ...templates
              .filter((template: Template): boolean => !!template.id)
              .map((template: Template) => ({
                value: template.id,
                label: template.name
              }))
          ]}
          placeholder='No template (use defaults)'
        />
        <p className='text-xs text-gray-500'>
          Templates define how product fields map to Base.com fields.
        </p>
      </div>

      <div className='flex items-center gap-2 pt-2'>
        <Checkbox
          id='allowDuplicateSku'
          checked={allowDuplicateSku} 
          onCheckedChange={(checked: boolean | 'indeterminate'): void => setAllowDuplicateSku(Boolean(checked))}
          className='h-4 w-4 rounded border bg-gray-900 text-blue-500'
        />
        <Label htmlFor='allowDuplicateSku' className='text-sm text-gray-300'>
          Allow duplicate SKUs
        </Label>
      </div>
      <p className='text-xs text-gray-500'>
        When unchecked, export will fail if the SKU already exists in the Base.com inventory.
      </p>
    </div>
  );
}
