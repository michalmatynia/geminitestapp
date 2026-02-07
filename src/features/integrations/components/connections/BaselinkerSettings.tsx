'use client';

import { useEffect, useState, useRef } from 'react';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { useSettings, useUpdateSetting } from '@/shared/hooks/useSettings';
import { Button, Input, SectionPanel, StatusBadge } from '@/shared/ui';

export function BaselinkerSettings(): React.JSX.Element {
  const { connections, handleBaselinkerTest, isTesting } = useIntegrationsContext();
  const activeConnection = connections[0] || null;
  const baselinkerConnected = Boolean(activeConnection?.hasBaseApiToken);
  const baseTokenUpdatedAt = activeConnection?.baseTokenUpdatedAt
    ? new Date(activeConnection.baseTokenUpdatedAt).toLocaleString()
    : '—';
  
  const settingsQuery = useSettings();
  const updateSettingMutation = useUpdateSetting();
  
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState('10');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
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

  return (
    <SectionPanel variant="subtle" className="space-y-4 text-sm text-gray-200">
      <div>
        <h3 className="text-sm font-semibold text-white">Baselinker API</h3>
        <p className="mt-1 text-xs text-gray-400">
          Enter your Baselinker API token in the connection fields, then test the
          connection to verify it works.
        </p>
      </div>
      {!activeConnection ? (
        <div className="rounded-md border border-dashed border-border p-4 text-xs text-gray-400">
          Add a connection first to enable Baselinker API access.
        </div>
      ) : (
        <div className="space-y-3">
          <SectionPanel variant="subtle" className="p-3 text-xs text-gray-300">
            <div className="flex items-center justify-between">
              <span>Connection status</span>
              <StatusBadge status={baselinkerConnected ? 'Connected' : 'Not tested'} />
            </div>
            <p className="mt-2">
              <span className="text-gray-400">Last verified:</span>{' '}
              {baseTokenUpdatedAt}
            </p>
            {activeConnection.baseLastInventoryId && (
              <p className="mt-1">
                <span className="text-gray-400">Last inventory:</span>{' '}
                {activeConnection.baseLastInventoryId}
              </p>
            )}
          </SectionPanel>
          <SectionPanel variant="subtle" className="p-3 text-xs text-gray-300">
            <div className="flex items-center justify-between">
              <span>Listing sync interval</span>
              {settingsQuery.isLoading ? (
                <span className="text-[10px] text-gray-500">Loading...</span>
              ) : (
                <span className="text-[10px] text-gray-500">Minutes</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min="1"
                value={syncIntervalMinutes}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setSyncIntervalMinutes(event.target.value)}
                className="w-32 rounded-md border border-border bg-gray-900 px-2 py-1 text-xs text-white"
              />
              <Button
                type="button"
                onClick={(): void => { void handleSaveSyncInterval(); }}
                disabled={updateSettingMutation.isPending}
                className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50"
              >
                {updateSettingMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-gray-400">
              Controls how often Base.com is checked for listing status updates.
            </p>
            {syncMessage && (
              <p className="mt-2 text-[10px] text-gray-400">{syncMessage}</p>
            )}
          </SectionPanel>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => { void handleBaselinkerTest(activeConnection); }}
              disabled={isTesting}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50"
            >
              {isTesting
                ? 'Testing...'
                : baselinkerConnected
                  ? 'Re-test Connection'
                  : 'Test Connection'}
            </Button>
          </div>
          <SectionPanel variant="subtle" className="p-3 text-xs text-gray-400">
            <p>
              To get your API token, log in to{' '}
              <a
                href="https://baselinker.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-300 hover:text-purple-200"
              >
                Baselinker
              </a>{' '}
              → My Account → API.
            </p>
          </SectionPanel>
        </div>
      )}
    </SectionPanel>
  );
}