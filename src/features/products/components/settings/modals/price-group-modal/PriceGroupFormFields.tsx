import React from 'react';

import { Input, Label, Checkbox } from '@/shared/ui';

import { usePriceGroupModalContext } from './PriceGroupModalContext';

export function PriceGroupFormFields(): React.JSX.Element {
  const { form, setForm } = usePriceGroupModalContext();

  return (
    <>
      <div className='space-y-2'>
        <Label htmlFor='price-group-name'>Name</Label>
        <Input
          id='price-group-name'
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder='e.g. Standard'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='price-group-currency'>Currency Code</Label>
        <Input
          id='price-group-currency'
          value={form.currencyCode}
          onChange={(e) => setForm((prev) => ({ ...prev, currencyCode: e.target.value.toUpperCase() }))}
          placeholder='e.g. PLN'
          maxLength={3}
        />
      </div>
      <Label className='flex items-center gap-2 text-gray-300'>
        <Checkbox
          checked={form.isDefault}
          onCheckedChange={(v) => setForm((prev) => ({ ...prev, isDefault: Boolean(v) }))}
        />
        Set as default price group
      </Label>
    </>
  );
}
