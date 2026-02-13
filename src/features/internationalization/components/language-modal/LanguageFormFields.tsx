import React from 'react';

import { Input, Label, Checkbox } from '@/shared/ui';

import { useLanguageModalContext } from './LanguageModalContext';

export function LanguageFormFields(): React.JSX.Element {
  const { form, setForm, countries, selectedCountryIds, toggleCountry } = useLanguageModalContext();

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='lang-code'>Code</Label>
        <Input
          id='lang-code'
          value={form.code}
          onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
          placeholder='e.g. EN'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='lang-name'>Name</Label>
        <Input
          id='lang-name'
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder='e.g. English'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='lang-native'>Native Name</Label>
        <Input
          id='lang-native'
          value={form.nativeName}
          onChange={(e) => setForm((prev) => ({ ...prev, nativeName: e.target.value }))}
          placeholder='e.g. English'
        />
      </div>
      <div className='space-y-2'>
        <Label>Associated Countries</Label>
        <div className='mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-border bg-card/50 p-3'>
          {countries.map((country) => (
            <Label
              key={country.id}
              className='flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors'
            >
              <Checkbox
                checked={selectedCountryIds.includes(country.id)}
                onCheckedChange={() => toggleCountry(country.id)}
              />
              <span className='text-xs text-gray-200'>
                {country.name} ({country.code})
              </span>
            </Label>
          ))}
        </div>
      </div>
    </div>
  );
}
