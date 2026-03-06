'use client';

import React from 'react';

import { useListingTraderaSettings } from '@/features/integrations/context/ListingSettingsContext';
import { Input, FormField, ToggleRow } from '@/shared/ui';

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
  } = useListingTraderaSettings();

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

      <ToggleRow
        checked={selectedTraderaAutoRelistEnabled}
        onCheckedChange={setSelectedTraderaAutoRelistEnabled}
        label='Enable automatic relist on expiry'
        variant='checkbox'
      />

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
