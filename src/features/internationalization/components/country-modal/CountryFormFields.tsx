import React from 'react';

import { countryCodeOptions } from '@/shared/constants/internationalization';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui';

import { useCountryModalContext } from './CountryModalContext';

export function CountryFormFields(): React.JSX.Element {
  const { form, setForm } = useCountryModalContext();

  return (
    <>
      <div className='space-y-2'>
        <Label htmlFor='country-code'>Code</Label>
        <Select
          value={form.code}
          onValueChange={(value: string) => {
            const sel = countryCodeOptions.find(
              (o) => o.code === value,
            );
            setForm({ code: value, name: sel?.name ?? '' });
          }}
        >
          <SelectTrigger className='w-full bg-gray-900 border-border text-white'>
            <SelectValue placeholder='Select code' />
          </SelectTrigger>
          <SelectContent>
            {countryCodeOptions.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                {opt.code} · {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='space-y-2'>
        <Label htmlFor='country-name'>Name</Label>
        <Input
          id='country-name'
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>
    </>
  );
}
