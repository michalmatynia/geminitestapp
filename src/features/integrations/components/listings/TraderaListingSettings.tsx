'use client';

import React from 'react';

import { useListingSettingsContext } from '@/features/integrations/context/ListingSettingsContext';
import { Checkbox, Input, Label } from '@/shared/ui';

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
      <div className='space-y-2'>
        <Label htmlFor='traderaTemplateId'>Template ID (Optional)</Label>
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
        <p className='text-xs text-gray-500'>
          Optional listing template identifier for Tradera automation mapping.
        </p>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='traderaDuration'>Listing Duration (Hours)</Label>
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
      </div>

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

      <div className='space-y-2'>
        <Label htmlFor='traderaRelistLead'>Relist Lead Time (Minutes)</Label>
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
        <p className='text-xs text-gray-500'>
          The relist job starts this many minutes before expiry.
        </p>
      </div>
    </div>
  );
}

