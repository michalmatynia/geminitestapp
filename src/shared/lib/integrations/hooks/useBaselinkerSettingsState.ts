'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef, useCallback } from 'react';

import { useIntegrationsContext } from '@/shared/lib/integrations/context/IntegrationsContext';
import { useDefaultExportConnection } from '@/shared/lib/integrations/hooks/useIntegrationQueries';
import { useSettings, useUpdateSetting } from '@/shared/hooks/useSettings';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useBaselinkerSettingsState() {
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
      const found = settingsQuery.data.find(
        (setting: { key: string; value: string }) =>
          setting.key === 'base_sync_poll_interval_minutes'
      );
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

    const persistedConnectionId = defaultExportConnectionQuery.data?.connectionId?.trim() ?? '';
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

  const handleSaveSyncInterval = useCallback(async (): Promise<void> => {
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
  }, [syncIntervalMinutes, updateSettingMutation]);

  const handleSaveDefaultConnection = useCallback(async (): Promise<void> => {
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
        error instanceof Error ? error.message : 'Failed to save default OneClick connection.'
      );
    } finally {
      setSavingDefaultConnection(false);
    }
  }, [defaultOneClickConnectionId, queryClient]);

  return {
    connections,
    activeConnection,
    baselinkerConnected,
    baseTokenUpdatedAt,
    syncIntervalMinutes,
    setSyncIntervalMinutes,
    syncMessage,
    handleSaveSyncInterval,
    isSavingSyncInterval: updateSettingMutation.isPending,
    defaultOneClickConnectionId,
    setDefaultOneClickConnectionId,
    savingDefaultConnection,
    defaultConnectionMessage,
    setDefaultConnectionMessage,
    handleSaveDefaultConnection,
    defaultExportConnectionId: defaultExportConnectionQuery.data?.connectionId?.trim() ?? '',
    handleBaselinkerTest,
    isTesting,
  };
}
