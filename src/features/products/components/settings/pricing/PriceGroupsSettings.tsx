import React from 'react';

import { PriceGroup } from '@/shared/contracts/products';
import { Badge, Button, FormSection, SelectSimple, SimpleSettingsList } from '@/shared/ui';

import { useProductSettingsContext } from '../ProductSettingsContext';

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
  } = useProductSettingsContext();

  return (
    <div className='space-y-4'>
      <FormSection
        title='Price Groups'
        description='Configure pricing tiers and group rules for products.'
        actions={
          <Button
            className='min-w-[100px]'
            type='button'
            onClick={onOpenPriceGroupCreate}
          >
            Add Price Group
          </Button>
        }
        className='p-6'
      >
        <div className='mt-4'>
          <SimpleSettingsList
            items={priceGroups.map((group: PriceGroup) => ({
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
              subtitle: `${group.currencyCode} · ${group.groupType}`,
              description: group.description || 'No description',
              original: group
            }))}
            isLoading={loadingGroups}
            onEdit={(item) => { onEditPriceGroup(item.original); }}
            onDelete={(item) => { onDeletePriceGroup(item.original); }}
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
          <SelectSimple size='sm'
            value={defaultGroupId}
            onValueChange={onDefaultGroupChange}
            disabled={priceGroups.length === 0 || defaultGroupSaving}
            options={priceGroups.map((group: PriceGroup) => ({
              value: group.id,
              label: `${group.name} (${group.groupId})`,
            }))}
            placeholder='Select default price group'
          />
          {defaultGroupSaving ? (
            <p className='mt-2 text-xs text-gray-500'>Saving default...</p>
          ) : null}
        </div>
      </FormSection>
    </div>
  );
}
