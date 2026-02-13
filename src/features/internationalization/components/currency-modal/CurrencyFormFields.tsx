import React from 'react';
import { Input, Label } from '@/shared/ui';

interface CurrencyFormFieldsProps {
  code: string;
  onCodeChange: (code: string) => void;
  name: string;
  onNameChange: (name: string) => void;
  symbol: string;
  onSymbolChange: (symbol: string) => void;
}

export function CurrencyFormFields({
  code,
  onCodeChange,
  name,
  onNameChange,
  symbol,
  onSymbolChange,
}: CurrencyFormFieldsProps): React.JSX.Element {
  return (
    <>
      <div className='space-y-2'>
        <Label htmlFor='currency-code'>Code</Label>
        <Input
          id='currency-code'
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          placeholder='PLN'
          maxLength={3}
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='currency-name'>Name</Label>
        <Input
          id='currency-name'
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder='Polish Zloty'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='currency-symbol'>Symbol</Label>
        <Input
          id='currency-symbol'
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          placeholder='zł'
        />
      </div>
    </>
  );
}
