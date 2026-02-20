'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { useDefaultExportConnection } from '@/features/integrations/hooks/useIntegrationQueries';
import { useSettings, useUpdateSetting } from '@/shared/hooks/useSettings';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Button, Input, SelectSimple, StatusBadge, FormSection, FormField } from '@/shared/ui';

export function BaselinkerSettings(): React.JSX.Element {
  const { connections, handleBaselinkerTest, isTesting } = useIntegrationsContext();
  const activeConnection = connections[0] || null;
  const baselinkerConnected = Boolean(activeConnection?.hasBaseApiToken);
  const baseTokenUpdatedAt = activeConnection?.baseTokenUpdatedAt
    ? new Date(activeConnection.baseTokenUpdatedAt).toLocaleString()
    : '—';
  
  const settingsQuery = useSettings();
  const updateSettingMutation = useUpdateSetting();
  const defaultExportConnectionQuery = useDefaultExportConnection();
  const queryClient = useQueryClient();
  
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState('10');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [defaultOneClickConnectionId, setDefaultOneClickConnectionId] = useState('');
  const [savingDefaultConnection, setSavingDefaultConnection] = useState(false);
  const [defaultConnectionMessage, setDefaultConnectionMessage] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (settingsQuery.data && !hasInitialized.current) {
      const found = settingsQuery.data.find((setting: { key: string; value: string }) => setting.key === 'base_sync_poll_interval_minutes');
      if (found?.value) {
        timer = setTimeout(() => {
          setSyncIntervalMinutes(found.value);
          hasInitialized.current = true;
        }, 0);
      }
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [settingsQuery.data]);

  useEffect(() => {
    if (connections.length === 0) {
      setDefaultOneClickConnectionId('');
      return;
    }

    const persistedConnectionId =
      defaultExportConnectionQuery.data?.connectionId?.trim() ?? '';
    const persistedExists = connections.some(
      (connection) => connection.id === persistedConnectionId
    );

    setDefaultOneClickConnectionId((current) => {
      const currentExists = connections.some((connection) => connection.id === current);
      if (currentExists) return current;
      if (persistedExists) return persistedConnectionId;
      return connections[0]?.id ?? '';
    });
  }, [connections, defaultExportConnectionQuery.data?.connectionId]);

  const handleSaveSyncInterval = async (): Promise<void> => {
    const parsed = Number(syncIntervalMinutes);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSyncMessage('Enter a valid number of minutes.');
      return;
    }
    setSyncMessage(null);
    try {
      await updateSettingMutation.mutateAsync({
        key: 'base_sync_poll_interval_minutes',
        value: String(parsed),
      });
      setSyncMessage('Sync interval saved.');
    } catch {
      setSyncMessage('Failed to save sync interval.');
    }
  };

  const handleSaveDefaultConnection = async (): Promise<void> => {
    const normalizedConnectionId = defaultOneClickConnectionId.trim();
    if (!normalizedConnectionId) {
      setDefaultConnectionMessage('Select a connection first.');
      return;
    }

    setDefaultConnectionMessage(null);
    setSavingDefaultConnection(true);

    try {
      await api.post('/api/integrations/exports/base/default-connection', {
        connectionId: normalizedConnectionId,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.integrations.selection.defaultConnection(),
        }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.integrations.importExport.pref('default-connection'),
        }),
      ]);

      setDefaultConnectionMessage('Default OneClick connection saved.');
    } catch (error) {
      setDefaultConnectionMessage(
        error instanceof Error
          ? error.message
          : 'Failed to save default OneClick connection.'
      );
    } finally {
      setSavingDefaultConnection(false);
    }
  };

  return (
    <FormSection
      title='Baselinker API'
      description='Enter your Baselinker API token in the connection fields, then test the connection to verify it works.'
      className='space-y-4 text-sm text-gray-200'
    >
      {!activeConnection ? (
        <div className='rounded-md border border-dashed border-border p-4 text-xs text-gray-400'>
          Add a connection first to enable Baselinker API access.
        </div>
      ) : (
        <div className='space-y-3'>
          <FormSection variant='subtle' className='p-3 text-xs text-gray-300'>
            <div className='flex items-center justify-between'>
              <span>Connection status</span>
              <StatusBadge status={baselinkerConnected ? 'Connected' : 'Not tested'} />
            </div>
            <p className='mt-2'>
              <span className='text-gray-400'>Last verified:</span>{' '}
              {baseTokenUpdatedAt}
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
                triggerClassName='w-full bg-card/40 border-border text-xs text-white'
                size='sm'
              />
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  onClick={(): void => { void handleSaveDefaultConnection(); }}
                  loading={savingDefaultConnection}
                  disabled={connections.length === 0}
                  size='sm'
                >
                  Save Default
                </Button>
                {defaultExportConnectionQuery.data?.connectionId?.trim() ? (
                  <span className='text-[10px] text-gray-400'>
                    Current default ID:{' '}
                    {defaultExportConnectionQuery.data.connectionId}
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
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setSyncIntervalMinutes(event.target.value)}
                    className='w-32 border-border bg-card/40 text-xs text-white'
                  />
                  <Button
                    type='button'
                    onClick={(): void => { void handleSaveSyncInterval(); }}
                    loading={updateSettingMutation.isPending}
                    size='sm'
                  >
                    Save
                  </Button>
                </div>
              </FormField>
            </div>
            {syncMessage && (
              <p className='mt-2 text-[10px] text-gray-400'>{syncMessage}</p>
            )}
          </FormSection>

          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='button'
              onClick={() => { void handleBaselinkerTest(activeConnection); }}
              loading={isTesting}
              variant='solid'
            >
              {baselinkerConnected
                ? 'Re-test Connection'
                : 'Test Connection'}
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

  
