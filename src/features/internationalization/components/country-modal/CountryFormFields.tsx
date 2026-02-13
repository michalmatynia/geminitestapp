import React from 'react';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui';
import { countryCodeOptions } from '@/shared/constants/internationalization';

interface CountryFormFieldsProps {
  code: string;
  onCodeChange: (code: string, name: string) => void;
  name: string;
  onNameChange: (name: string) => void;
}

export function CountryFormFields({
  code,
  onCodeChange,
  name,
  onNameChange,
}: CountryFormFieldsProps): React.JSX.Element {
  return (
    <>
      <div className='space-y-2'>
        <Label htmlFor='country-code'>Code</Label>
        <Select
          value={code}
          onValueChange={(value: string) => {
            const sel = countryCodeOptions.find(
              (o) => o.code === value,
            );
            onCodeChange(value, sel?.name ?? '');
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
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
    </>
  );
}
