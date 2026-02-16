'use client';

import React from 'react';

import type { BaseInventory, Template } from '@/features/data-import-export/types/imports';
import { useListingSettingsContext } from '@/features/integrations/context/ListingSettingsContext';
import { SelectSimple, Checkbox, FormField, Label, Alert } from '@/shared/ui';

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
      <FormField 
        label={'Base.com Inventory ${loadingInventories ? \'(Loading...)\' : \'\'}'}
        id='inventory'
      >
        <SelectSimple
          value={selectedInventoryId}
          onValueChange={setSelectedInventoryId}
          disabled={loadingInventories || inventories.length === 0}
          options={inventories
            .filter((inventory: BaseInventory): boolean => !!inventory.id)
            .map((inventory: BaseInventory) => ({
              value: inventory.id,
              label: inventory.name
            }))}
          placeholder='Select inventory...'
        />
        {inventories.length === 0 && !loadingInventories && (
          <Alert variant='error' className='mt-2 py-1 text-xs'>
            No inventories found. Please check your Base.com account.
          </Alert>
        )}
      </FormField>

      <FormField 
        label='Template (Optional)' 
        id='template'
        description='Templates define how product fields map to Base.com fields.'
      >
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
      </FormField>

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
