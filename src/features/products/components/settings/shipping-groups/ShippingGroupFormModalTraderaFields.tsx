'use client';

import React from 'react';

import type { ShippingGroupFormData } from '@/shared/contracts/products/shipping-groups';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';

import { useShippingGroupsState } from './ShippingGroupsContext';

export function ShippingGroupFormModalTraderaFields(): React.JSX.Element {
  const { formData, setFormData } = useShippingGroupsState();

  return (
    <>
      <FormField
        label='Tradera Shipping Condition'
        description='Optional Tradera-facing shipping/delivery label to use later in listing flows.'
      >
        <Input
          className='h-9'
          value={formData.traderaShippingCondition}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: ShippingGroupFormData) => ({
              ...prev,
              traderaShippingCondition: event.target.value,
            }))
          }
          placeholder='Buyer pays shipping'
          aria-label='Tradera shipping condition'
          title='Tradera shipping condition'
        />
      </FormField>

      <FormField
        label='Tradera Shipping Price (EUR)'
        description='Optional EUR amount to use when Tradera opens the shipping options modal during browser listings.'
      >
        <Input
          className='h-9'
          type='number'
          min='0'
          step='0.01'
          value={formData.traderaShippingPriceEur}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: ShippingGroupFormData) => ({
              ...prev,
              traderaShippingPriceEur: event.target.value,
            }))
          }
          placeholder='5.00'
          aria-label='Tradera shipping price in EUR'
          title='Tradera shipping price in EUR'
        />
      </FormField>
    </>
  );
}
