'use client';

import React from 'react';

import type { ShippingGroupFormData } from '@/shared/contracts/products/shipping-groups';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Textarea } from '@/shared/ui/textarea';

import { useShippingGroupsState } from './ShippingGroupsContext';

export function ShippingGroupFormModalBasicFields(): React.JSX.Element {
  const { formData, setFormData, catalogOptions } = useShippingGroupsState();

  return (
    <>
      <FormField label='Name'>
        <Input
          className='h-9'
          value={formData.name}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: ShippingGroupFormData) => ({
              ...prev,
              name: event.target.value,
            }))
          }
          placeholder='Shipping group name'
          aria-label='Shipping group name'
          title='Shipping group name'
        />
      </FormField>

      <FormField label='Catalog'>
        <SelectSimple
          size='sm'
          value={formData.catalogId}
          onValueChange={(value: string): void =>
            setFormData((prev: ShippingGroupFormData) => ({
              ...prev,
              catalogId: value,
              autoAssignCategoryIds: [],
              autoAssignCurrencyCodes: [],
            }))
          }
          options={catalogOptions}
          placeholder='Select catalog'
          ariaLabel='Select catalog'
          title='Select catalog'
        />
      </FormField>

      <FormField
        label='Description'
        description='Optional internal note about when this shipping group should be used.'
      >
        <Textarea
          value={formData.description}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            setFormData((prev: ShippingGroupFormData) => ({
              ...prev,
              description: event.target.value,
            }))
          }
          placeholder='Internal shipping notes'
          aria-label='Shipping group description'
          title='Shipping group description'
        />
      </FormField>
    </>
  );
}
