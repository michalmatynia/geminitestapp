import React from 'react';
import { Input, Label, Checkbox } from '@/shared/ui';

interface PriceGroupFormFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  currencyCode: string;
  onCurrencyCodeChange: (code: string) => void;
  isDefault: boolean;
  onIsDefaultChange: (value: boolean) => void;
}

export function PriceGroupFormFields({
  name,
  onNameChange,
  currencyCode,
  onCurrencyCodeChange,
  isDefault,
  onIsDefaultChange,
}: PriceGroupFormFieldsProps): React.JSX.Element {
  return (
    <>
      <div className='space-y-2'>
        <Label htmlFor='price-group-name'>Name</Label>
        <Input
          id='price-group-name'
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder='e.g. Standard'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='price-group-currency'>Currency Code</Label>
        <Input
          id='price-group-currency'
          value={currencyCode}
          onChange={(e) => onCurrencyCodeChange(e.target.value.toUpperCase())}
          placeholder='e.g. PLN'
          maxLength={3}
        />
      </div>
      <Label className='flex items-center gap-2 text-gray-300'>
        <Checkbox
          checked={isDefault}
          onCheckedChange={(v) => onIsDefaultChange(Boolean(v))}
        />
        Set as default price group
      </Label>
    </>
  );
}
