'use client';

import React from 'react';

import { useListingBaseComSettings } from '@/features/integrations/context/ListingSettingsContext';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  BaseInventory,
  IntegrationTemplate as Template,
} from '@/shared/contracts/integrations';
import { SelectSimple, FormField, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { Alert } from '@/shared/ui/primitives.public';

const NO_TEMPLATE_OPTION: LabeledOptionDto<string> = {
  value: 'none',
  label: 'No template',
};

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
  } = useListingBaseComSettings();
  const inventoryOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> =>
      inventories
        .filter((inventory: BaseInventory): boolean => !!inventory.id)
        .map((inventory: BaseInventory) => ({
          value: inventory.id,
          label: inventory.name,
        })),
    [inventories]
  );
  const templateOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> => [
      NO_TEMPLATE_OPTION,
      ...templates
        .filter((template: Template): boolean => !!template.id)
        .map((template: Template) => ({
          value: template.id,
          label: template.name,
        })),
    ],
    [templates]
  );

  return (
    <div className='space-y-4'>
      <FormField
        label={`Base.com Inventory ${loadingInventories ? '(Loading...)' : ''}`}
        id='inventory'
      >
        <SelectSimple
          value={selectedInventoryId}
          onValueChange={setSelectedInventoryId}
          disabled={loadingInventories || inventories.length === 0}
          options={inventoryOptions}
          placeholder='Select inventory...'
         ariaLabel='Select inventory...' title='Select inventory...'/>
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
          options={templateOptions}
          placeholder='No template (use defaults)'
         ariaLabel='No template (use defaults)' title='No template (use defaults)'/>
      </FormField>

      <ToggleRow
        checked={allowDuplicateSku}
        onCheckedChange={setAllowDuplicateSku}
        label='Allow duplicate SKUs'
        description='When unchecked, export will fail if the SKU already exists in the Base.com inventory.'
        variant='checkbox'
      />
    </div>
  );
}
