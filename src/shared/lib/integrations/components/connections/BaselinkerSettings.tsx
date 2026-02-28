'use client';

import React from 'react';

import { useBaselinkerSettingsState } from '@/shared/lib/integrations/hooks/useBaselinkerSettingsState';
import {
  Button,
  Input,
  SelectSimple,
  StatusBadge,
  FormSection,
  FormField,
  EmptyState,
} from '@/shared/ui';

export function BaselinkerSettings(): React.JSX.Element {
  const {
    connections,
    activeConnection,
    baselinkerConnected,
    baseTokenUpdatedAt,
    syncIntervalMinutes,
    setSyncIntervalMinutes,
    syncMessage,
    handleSaveSyncInterval,
    isSavingSyncInterval,
    defaultOneClickConnectionId,
    setDefaultOneClickConnectionId,
    savingDefaultConnection,
    defaultConnectionMessage,
    setDefaultConnectionMessage,
    handleSaveDefaultConnection,
    defaultExportConnectionId,
    handleBaselinkerTest,
    isTesting,
  } = useBaselinkerSettingsState();

  return (
    <FormSection
      title='Baselinker API'
      description='Enter your Baselinker API token in the connection fields, then test the connection to verify it works.'
      className='space-y-4 text-sm text-gray-200'
    >
      {!activeConnection ? (
        <EmptyState
          title='No connection'
          description='Add a connection first to enable Baselinker API access.'
          variant='compact'
          className='bg-card/20 py-8'
        />
      ) : (
        <div className='space-y-3'>
          <FormSection variant='subtle' className='p-3 text-xs text-gray-300'>
            <div className='flex items-center justify-between'>
              <span>Connection status</span>
              <StatusBadge status={baselinkerConnected ? 'Connected' : 'Not tested'} />
            </div>
            <p className='mt-2'>
              <span className='text-gray-400'>Last verified:</span> {baseTokenUpdatedAt}
            </p>
            {activeConnection.baseLastInventoryId && (
              <p className='mt-1'>
                <span className='text-gray-400'>Last inventory:</span>{' '}
                {activeConnection.baseLastInventoryId}
              </p>
            )}
          </FormSection>

          <FormSection
            title='Default OneClick connection'
            description='Used by Product List one-click export to Base.com (BL button).'
            variant='subtle'
            className='p-3 text-xs text-gray-300'
          >
            <div className='mt-2 space-y-2'>
              <SelectSimple
                value={defaultOneClickConnectionId || undefined}
                onValueChange={(value: string): void => {
                  setDefaultOneClickConnectionId(value);
                  setDefaultConnectionMessage(null);
                }}
                options={connections.map((connection) => ({
                  value: connection.id,
                  label: connection.name,
                  description: connection.hasBaseApiToken
                    ? 'Base API token configured'
                    : 'Token not detected',
                }))}
                placeholder='Select default connection...'
                disabled={connections.length === 0}
                variant='subtle'
                size='sm'
                triggerClassName='w-full'
              />
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  onClick={(): void => {
                    void handleSaveDefaultConnection();
                  }}
                  loading={savingDefaultConnection}
                  disabled={connections.length === 0}
                  size='sm'
                >
                  Save Default
                </Button>
                {defaultExportConnectionId ? (
                  <span className='text-[10px] text-gray-400'>
                    Current default ID: {defaultExportConnectionId}
                  </span>
                ) : null}
              </div>
              {defaultConnectionMessage ? (
                <p className='text-[10px] text-gray-400'>{defaultConnectionMessage}</p>
              ) : null}
            </div>
          </FormSection>

          <FormSection
            title='Listing sync interval'
            description='Controls how often Base.com is checked for listing status updates.'
            variant='subtle'
            className='p-3 text-xs text-gray-300'
          >
            <div className='mt-2 flex flex-wrap items-center gap-2'>
              <FormField label='Interval (Minutes)'>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min='1'
                    value={syncIntervalMinutes}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setSyncIntervalMinutes(event.target.value)
                    }
                    variant='subtle'
                    size='sm'
                    className='w-32'
                  />
                  <Button
                    type='button'
                    onClick={(): void => {
                      void handleSaveSyncInterval();
                    }}
                    loading={isSavingSyncInterval}
                    size='sm'
                  >
                    Save
                  </Button>
                </div>
              </FormField>
            </div>
            {syncMessage && <p className='mt-2 text-[10px] text-gray-400'>{syncMessage}</p>}
          </FormSection>

          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='button'
              onClick={() => {
                void handleBaselinkerTest(activeConnection);
              }}
              loading={isTesting}
              variant='solid'
            >
              {baselinkerConnected ? 'Re-test Connection' : 'Test Connection'}
            </Button>
          </div>

          <div className='rounded-md border border-border/60 bg-card/30 p-3 text-xs text-gray-400'>
            <p>
              To get your API token, log in to{' '}
              <a
                href='https://baselinker.com'
                target='_blank'
                rel='noopener noreferrer'
                className='text-purple-300 hover:text-purple-200'
              >
                Baselinker
              </a>{' '}
              → My Account → API.
            </p>
          </div>
        </div>
      )}
    </FormSection>
  );
}
