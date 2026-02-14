'use client';

import React from 'react';

import { useListingSettingsContext } from '@/features/integrations/context/ListingSettingsContext';
import { Checkbox, Input, Label, FormField } from '@/shared/ui';

export function TraderaListingSettings(): React.JSX.Element {
  const {
    selectedTraderaDurationHours,
    setSelectedTraderaDurationHours,
    selectedTraderaAutoRelistEnabled,
    setSelectedTraderaAutoRelistEnabled,
    selectedTraderaAutoRelistLeadMinutes,
    setSelectedTraderaAutoRelistLeadMinutes,
    selectedTraderaTemplateId,
    setSelectedTraderaTemplateId,
  } = useListingSettingsContext();

  return (
    <div className='space-y-4'>
      <FormField 
        label='Template ID (Optional)'
        description='Optional listing template identifier for Tradera automation mapping.'
      >
        <Input
          id='traderaTemplateId'
          value={selectedTraderaTemplateId === 'none' ? '' : selectedTraderaTemplateId}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const value = event.target.value.trim();
            setSelectedTraderaTemplateId(value || 'none');
          }}
          placeholder='tradera-template-1'
          className='h-9 border bg-card/60 text-gray-200'
        />
      </FormField>

      <FormField label='Listing Duration (Hours)'>
        <Input
          id='traderaDuration'
          type='number'
          min={1}
          max={720}
          value={String(selectedTraderaDurationHours)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const value = Number(event.target.value);
            if (!Number.isFinite(value)) return;
            setSelectedTraderaDurationHours(Math.max(1, Math.min(720, Math.floor(value))));
          }}
          className='h-9 border bg-card/60 text-gray-200'
        />
      </FormField>

      <div className='flex items-center gap-2 pt-1'>
        <Checkbox
          id='traderaAutoRelist'
          checked={selectedTraderaAutoRelistEnabled}
          onCheckedChange={(checked: boolean | 'indeterminate'): void =>
            setSelectedTraderaAutoRelistEnabled(Boolean(checked))
          }
          className='h-4 w-4 rounded border bg-gray-900 text-blue-500'
        />
        <Label htmlFor='traderaAutoRelist' className='text-sm text-gray-300'>
          Enable automatic relist on expiry
        </Label>
      </div>

      <FormField 
        label='Relist Lead Time (Minutes)'
        description='The relist job starts this many minutes before expiry.'
      >
        <Input
          id='traderaRelistLead'
          type='number'
          min={0}
          max={10080}
          disabled={!selectedTraderaAutoRelistEnabled}
          value={String(selectedTraderaAutoRelistLeadMinutes)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const value = Number(event.target.value);
            if (!Number.isFinite(value)) return;
            setSelectedTraderaAutoRelistLeadMinutes(
              Math.max(0, Math.min(10080, Math.floor(value)))
            );
          }}
          className='h-9 border bg-card/60 text-gray-200 disabled:opacity-50'
        />
      </FormField>
    </div>
  );
}

