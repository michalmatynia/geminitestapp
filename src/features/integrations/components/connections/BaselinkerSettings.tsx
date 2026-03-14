'use client';

import React from 'react';

import { useBaselinkerSettingsState } from '@/features/integrations/hooks/useBaselinkerSettingsState';
import {
  Button,
  Input,
  SelectSimple,
  StatusBadge,
  FormSection,
  FormField,
  EmptyState,
  FormActions,
  useToast,
  MetadataItem,
  Card,
  Hint,
} from '@/shared/ui';

export function BaselinkerSettings(): React.JSX.Element {
  const { toast } = useToast();
  const {
    connections,
    activeConnection,
    baselinkerConnected,
    baseTokenUpdatedAt,
    syncIntervalMinutes,
    setSyncIntervalMinutes,
    handleSaveAll,
    isSaving,
    isDirty,
    defaultOneClickConnectionId,
    setDefaultOneClickConnectionId,
    defaultExportConnectionId,
    handleBaselinkerTest,
    isTesting,
  } = useBaselinkerSettingsState();

  const onSave = async (): Promise<void> => {
    try {
      await handleSaveAll();
      toast('Baselinker settings saved successfully.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save settings.', {
        variant: 'error',
      });
    }
  };

  return (
    <FormSection
      title='Baselinker API'
      description='Enter your Baselinker API token in the connection fields, then test the connection to verify it works.'
      className='p-6'
    >
      {!activeConnection ? (
        <EmptyState
          title='No connection'
          description='Add a connection first to enable Baselinker API access.'
          variant='compact'
          className='bg-card/20 py-8'
        />
      ) : (
        <div className='space-y-6'>
          {/* Connection Status */}
          <div className='grid gap-6 md:grid-cols-2'>
            <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-white'>Connection status</span>
                <StatusBadge status={baselinkerConnected ? 'Connected' : 'Not tested'} />
              </div>
              <MetadataItem label='Last verified' value={baseTokenUpdatedAt} variant='minimal' />
              {activeConnection.baseLastInventoryId && (
                <MetadataItem
                  label='Last inventory'
                  value={activeConnection.baseLastInventoryId}
                  variant='minimal'
                />
              )}
              <div className='pt-2'>
                <Button
                  type='button'
                  onClick={() => {
                    void handleBaselinkerTest(activeConnection);
                  }}
                  loading={isTesting}
                  variant='outline'
                  size='xs'
                  className='w-full'
                >
                  {baselinkerConnected ? 'Re-test Connection' : 'Test Connection'}
                </Button>
              </div>
            </Card>

            <div className='space-y-4'>
              <FormField label='Sync Interval' description='How often to check for status updates.'>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min='1'
                    value={syncIntervalMinutes}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setSyncIntervalMinutes(event.target.value)
                    }
                    size='sm'
                    className='w-24 h-9'
                   aria-label="Sync Interval" title="Sync Interval"/>
                  <span className='text-xs text-gray-500 font-medium uppercase'>Minutes</span>
                </div>
              </FormField>

              <Hint>
                Frequent sync ensures real-time listing status but consumes more API credits.
              </Hint>
            </div>
          </div>

          {/* OneClick Configuration */}
          <FormSection
            title='Default OneClick Export'
            description='Used by Product List one-click export to Base.com (BL button).'
            variant='subtle'
            className='p-4 bg-white/5 border border-white/5'
          >
            <div className='space-y-3 mt-2'>
              <SelectSimple
                value={defaultOneClickConnectionId || undefined}
                onValueChange={(value: string): void => {
                  setDefaultOneClickConnectionId(value);
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
                size='sm'
               ariaLabel="Select default connection..." title="Select default connection..."/>
              {defaultExportConnectionId ? (
                <MetadataItem
                  label='Active Default ID'
                  value={defaultExportConnectionId}
                  mono
                  variant='subtle'
                />
              ) : (
                <Hint>No default connection configured yet.</Hint>
              )}
            </div>
          </FormSection>

          {/* Help Card */}
          <Card variant='subtle-compact' padding='sm' className='bg-blue-500/5 border-blue-500/20'>
            <div className='flex gap-3 text-xs text-blue-300/80'>
              <span className='shrink-0'>ℹ</span>
              <p>
                To get your API token, log in to{' '}
                <a
                  href='https://baselinker.com'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-300 underline hover:text-blue-200'
                >
                  Baselinker
                </a>{' '}
                → My Account → API.
              </p>
            </div>
          </Card>

          <FormActions
            onSave={() => {
              void onSave();
            }}
            saveText='Save Baselinker Settings'
            isSaving={isSaving}
            isDisabled={!isDirty}
            className='pt-4 border-t border-white/5'
          />
        </div>
      )}
    </FormSection>
  );
}
