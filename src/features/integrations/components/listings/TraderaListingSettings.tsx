'use client';

import React, { useEffect } from 'react';

import { useListingTraderaSettings } from '@/features/integrations/context/ListingSettingsContext';
import { Badge, Input } from '@/shared/ui/primitives.public';
import { FormField, ToggleRow } from '@/shared/ui/forms-and-actions.public';

import { useTraderaListingAction } from './hooks/useTraderaListingAction';

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
    selectedConcurrencyMode,
    setSelectedConcurrencyMode,
  } = useListingTraderaSettings();

  const {
    loading: actionLoading,
    saving: actionSaving,
    actionKey,
    actionName,
    actionDescription,
    actionId,
    browserModeLabel,
    defaultConcurrencyMode,
    enabledStepCount,
    hasUnsavedChanges,
    headless,
    isSeedFallback,
    setHeadless,
    totalStepCount,
  } = useTraderaListingAction();

  // When the governing action loads, initialise concurrency from its default (only once).
  useEffect(() => {
    if (selectedConcurrencyMode === null && defaultConcurrencyMode !== null) {
      setSelectedConcurrencyMode(defaultConcurrencyMode);
    }
  }, [defaultConcurrencyMode, selectedConcurrencyMode, setSelectedConcurrencyMode]);

  const effectiveConcurrencyMode = selectedConcurrencyMode ?? 'sequential';

  return (
    <div className='space-y-4'>
      {/* Governing action info */}
      {(actionLoading || actionName) && (
        <div className='rounded-md border border-border/40 bg-muted/10 px-3 py-2'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Playwright Sequencer Action
          </p>
          {actionLoading ? (
            <p className='mt-0.5 text-xs text-muted-foreground'>Loading…</p>
          ) : (
            <div className='mt-1 space-y-2'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-xs font-medium text-foreground'>{actionName}</span>
                  {actionKey ? <Badge variant='secondary'>{actionKey}</Badge> : null}
                  {isSeedFallback ? <Badge variant='neutral'>Seed default</Badge> : null}
                </div>
                <Badge variant='secondary'>{browserModeLabel}</Badge>
              </div>
              {actionDescription ? (
                <p className='text-xs text-muted-foreground'>{actionDescription}</p>
              ) : null}
              <div className='flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground'>
                {actionId ? <span>Action ID: {actionId}</span> : null}
                {enabledStepCount !== null && totalStepCount !== null ? (
                  <span>Steps: {enabledStepCount}/{totalStepCount}</span>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      <ToggleRow
        checked={headless}
        onCheckedChange={setHeadless}
        label='Action browser mode'
        description='Quick export uses this Step Sequencer action unless a specific queue run overrides browser mode.'
        disabled={actionKey === null || actionLoading || actionSaving}
        loading={actionLoading || actionSaving}
        variant='switch'
        toggleOnRowClick
      >
        <div className='pt-1 text-[11px] font-medium text-foreground'>
          Current: {headless ? 'Headless' : 'Headed'}
          {hasUnsavedChanges ? ' · Unsaved' : ''}
        </div>
      </ToggleRow>

      {/* Concurrency mode toggle */}
      <ToggleRow
        checked={effectiveConcurrencyMode === 'concurrent'}
        onCheckedChange={(checked): void => {
          setSelectedConcurrencyMode(checked ? 'concurrent' : 'sequential');
        }}
        label='Run concurrently'
        description='When enabled, multiple browser sessions may run at the same time. When disabled, jobs are queued one by one.'
        variant='checkbox'
      />

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
          aria-label='tradera-template-1'
          title='tradera-template-1'
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
          aria-label='Listing Duration (Hours)'
          title='Listing Duration (Hours)'
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
          aria-label='Relist Lead Time (Minutes)'
          title='Relist Lead Time (Minutes)'
        />
      </FormField>
    </div>
  );
}
