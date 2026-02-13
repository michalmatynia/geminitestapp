import React from 'react';

import { Input, Label } from '@/shared/ui';

import { useCurrencyModalContext } from './CurrencyModalContext';

export function CurrencyFormFields(): React.JSX.Element {
  const { form, setForm } = useCurrencyModalContext();

  return (
    <>
      <div className='space-y-2'>
        <Label htmlFor='currency-code'>Code</Label>
        <Input
          id='currency-code'
          value={form.code}
          onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
          placeholder='PLN'
          maxLength={3}
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='currency-name'>Name</Label>
        <Input
          id='currency-name'
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder='Polish Zloty'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='currency-symbol'>Symbol</Label>
        <Input
          id='currency-symbol'
          value={form.symbol}
          onChange={(e) => setForm((prev) => ({ ...prev, symbol: e.target.value }))}
          placeholder='zł'
        />
      </div>
    </>
  );
}
