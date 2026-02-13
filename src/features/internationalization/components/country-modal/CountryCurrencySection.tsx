import React from 'react';
import { Label, Checkbox } from '@/shared/ui';
import type { Currency } from '@/shared/types/domain/internationalization';

interface CountryCurrencySectionProps {
  currencyOptions: Currency[];
  selectedCurrencyIds: string[];
  onToggleCurrency: (id: string) => void;
  loadingCurrencies: boolean;
}

export function CountryCurrencySection({
  currencyOptions,
  selectedCurrencyIds,
  onToggleCurrency,
  loadingCurrencies,
}: CountryCurrencySectionProps): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label>Associated Currencies</Label>
      {loadingCurrencies ? (
        <p className='text-xs text-gray-500'>Loading currencies...</p>
      ) : (
        <div className='mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-border bg-card/50 p-3'>
          {currencyOptions.map((curr) => (
            <Label
              key={curr.id}
              className='flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors'
            >
              <Checkbox
                checked={selectedCurrencyIds.includes(curr.id)}
                onCheckedChange={() => onToggleCurrency(curr.id)}
              />
              <span className='text-xs text-gray-200'>
                {curr.code} ({curr.name})
              </span>
            </Label>
          ))}
        </div>
      )}
    </div>
  );
}
