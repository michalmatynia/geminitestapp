import React from 'react';

import type { Country } from '@/features/internationalization/types';
import { Input, Label, Checkbox } from '@/shared/ui';

type LanguageFormFieldsProps = {
  code: string;
  onCodeChange: (value: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  nativeName: string;
  onNativeNameChange: (value: string) => void;
  countries: Country[];
  selectedCountryIds: string[];
  onCountryToggle: (id: string) => void;
};

export function LanguageFormFields({
  code,
  onCodeChange,
  name,
  onNameChange,
  nativeName,
  onNativeNameChange,
  countries,
  selectedCountryIds,
  onCountryToggle,
}: LanguageFormFieldsProps): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='lang-code'>Code</Label>
        <Input
          id='lang-code'
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          placeholder='e.g. EN'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='lang-name'>Name</Label>
        <Input
          id='lang-name'
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder='e.g. English'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='lang-native'>Native Name</Label>
        <Input
          id='lang-native'
          value={nativeName}
          onChange={(e) => onNativeNameChange(e.target.value)}
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
                onCheckedChange={() => onCountryToggle(country.id)}
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
