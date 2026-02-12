import React from 'react';

import { PriceGroup } from '@/features/products/types';
import { Badge, Button, FormSection, UnifiedSelect } from '@/shared/ui';


type PriceGroupsSettingsProps = {
  loadingGroups: boolean;
  priceGroups: PriceGroup[];
  defaultGroupId: string;
  onDefaultGroupChange: (groupId: string) => void;
  defaultGroupSaving: boolean;
  handleOpenCreate: () => void;
  handleEditGroup: (group: PriceGroup) => void;
  handleDeleteGroup: (group: PriceGroup) => void;
};

export function PriceGroupsSettings({
  loadingGroups,
  priceGroups,
  defaultGroupId,
  onDefaultGroupChange,
  defaultGroupSaving,
  handleOpenCreate,
  handleEditGroup,
  handleDeleteGroup,
}: PriceGroupsSettingsProps): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <FormSection
        title='Price Groups'
        description='Configure pricing tiers and group rules for products.'
        actions={
          <Button
            className='min-w-[100px]'
            type='button'
            onClick={handleOpenCreate}
          >
            Add Price Group
          </Button>
        }
        className='p-6'
      >
        <div className='mt-4'>
          {loadingGroups ? (
            <div className='rounded-md border border-dashed border p-6 text-center text-gray-400'>
              Loading price groups...
            </div>
          ) : priceGroups.length === 0 ? (
            <div className='rounded-md border border-dashed border p-6 text-center text-gray-400'>
              At least one price group is required. Add a price group to continue.
            </div>
          ) : (
            <div className='space-y-3'>
              {priceGroups.map((group: PriceGroup) => (
                <div
                  key={group.id}
                  className='flex items-center justify-between rounded-md border border-border/40 bg-gray-900/40 p-4'
                >
                  <div>
                    <div className='flex items-center gap-2 text-white'>
                      <span className='font-semibold'>{group.name}</span>
                      {group.isDefault && (
                        <Badge variant='success'>
                          Default
                        </Badge>
                      )}
                      <Badge variant='neutral'>
                        {group.groupId}
                      </Badge>
                    </div>
                    <p className='text-sm text-gray-400 mt-1'>
                      {group.currencyCode} · {group.groupType}
                    </p>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm text-gray-500 hidden sm:inline'>
                      {group.description || 'No description'}
                    </span>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        type='button'
                        onClick={() => handleEditGroup(group)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-red-400 border-red-500/20 hover:bg-red-500/10'
                        type='button'
                        onClick={() => handleDeleteGroup(group)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      <FormSection
        title='Default price group'
        description='Required. Select one of the available price groups.'
        variant='subtle'
        className='p-4'
      >
        <div className='mt-4'>
          <UnifiedSelect
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
