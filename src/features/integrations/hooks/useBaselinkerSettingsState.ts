'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';

import {
  useIntegrationsActions,
  useIntegrationsData,
  useIntegrationsForm,
  useIntegrationsTesting,
} from '@/features/integrations/context/IntegrationsContext';
import {
  useIntegrationSettingsMap,
  useUpdateIntegrationSettingsBulk,
} from '@/features/integrations/hooks/useIntegrationSettings';
import { useUpdateDefaultExportConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import { useDefaultExportConnection } from '@/features/integrations/hooks/useIntegrationQueries';

const BASE_SYNC_POLL_INTERVAL_MINUTES_KEY = 'base_sync_poll_interval_minutes';

export function useBaselinkerSettingsState() {
  const { connections } = useIntegrationsData();
  const { editingConnectionId } = useIntegrationsForm();
  const { handleBaselinkerTest } = useIntegrationsActions();
  const { isTesting } = useIntegrationsTesting();
  const activeConnection = useMemo(
    () =>
      connections.find((connection) => connection.id === editingConnectionId) ??
      connections[0] ??
      null,
    [connections, editingConnectionId]
  );
  const baselinkerConnected = Boolean(activeConnection?.hasBaseApiToken);
  const baseTokenUpdatedAt = activeConnection?.baseTokenUpdatedAt
    ? new Date(activeConnection.baseTokenUpdatedAt).toLocaleString()
    : '—';

  const settingsQuery = useIntegrationSettingsMap([BASE_SYNC_POLL_INTERVAL_MINUTES_KEY]);
  const updateSettingsBulkMutation = useUpdateIntegrationSettingsBulk();
  const defaultExportConnectionQuery = useDefaultExportConnection();
  const updateDefaultConnectionMutation = useUpdateDefaultExportConnection();

  const storedSyncInterval = useMemo(() => {
    return settingsQuery.data?.get(BASE_SYNC_POLL_INTERVAL_MINUTES_KEY) ?? '10';
  }, [settingsQuery.data]);

  const storedDefaultConnectionId = useMemo(() => {
    return defaultExportConnectionQuery.data?.connectionId?.trim() ?? '';
  }, [defaultExportConnectionQuery.data]);

  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(storedSyncInterval);
  const [defaultOneClickConnectionId, setDefaultOneClickConnectionId] =
    useState(storedDefaultConnectionId);
  const [isSaving, setIsSaving] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current && storedSyncInterval !== '10') {
      setSyncIntervalMinutes(storedSyncInterval);
      hasInitialized.current = true;
    }
  }, [storedSyncInterval]);

  useEffect(() => {
    if (connections.length === 0) {
      setDefaultOneClickConnectionId('');
      return;
    }

    if (!defaultOneClickConnectionId && storedDefaultConnectionId) {
      setDefaultOneClickConnectionId(storedDefaultConnectionId);
    } else if (!defaultOneClickConnectionId && connections.length > 0) {
      setDefaultOneClickConnectionId(connections[0]!.id);
    }
  }, [connections, storedDefaultConnectionId, defaultOneClickConnectionId]);

  const isDirty = useMemo(() => {
    return (
      syncIntervalMinutes !== storedSyncInterval ||
      defaultOneClickConnectionId !== storedDefaultConnectionId
    );
  }, [
    syncIntervalMinutes,
    storedSyncInterval,
    defaultOneClickConnectionId,
    storedDefaultConnectionId,
  ]);

  const handleSaveAll = useCallback(async (): Promise<void> => {
    const intervalParsed = Number(syncIntervalMinutes);
    if (!Number.isFinite(intervalParsed) || intervalParsed <= 0) {
      throw new Error('Enter a valid number of minutes for sync interval.');
    }

    setIsSaving(true);
    try {
      const updates = [];

      if (syncIntervalMinutes !== storedSyncInterval) {
        updates.push({
          key: BASE_SYNC_POLL_INTERVAL_MINUTES_KEY,
          value: String(intervalParsed),
        });
      }

      if (updates.length > 0) {
        await updateSettingsBulkMutation.mutateAsync(updates);
      }

      if (defaultOneClickConnectionId !== storedDefaultConnectionId) {
        await updateDefaultConnectionMutation.mutateAsync({
          connectionId: defaultOneClickConnectionId,
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    syncIntervalMinutes,
    storedSyncInterval,
    defaultOneClickConnectionId,
    storedDefaultConnectionId,
    updateSettingsBulkMutation,
    updateDefaultConnectionMutation,
  ]);

  return {
    connections,
    activeConnection,
    baselinkerConnected,
    baseTokenUpdatedAt,
    syncIntervalMinutes,
    setSyncIntervalMinutes,
    handleSaveAll,
    isSaving: isSaving || updateSettingsBulkMutation.isPending,
    isDirty,
    defaultOneClickConnectionId,
    setDefaultOneClickConnectionId,
    defaultExportConnectionId: storedDefaultConnectionId,
    handleBaselinkerTest,
    isTesting,
  };
}
