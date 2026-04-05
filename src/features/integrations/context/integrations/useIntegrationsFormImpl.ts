'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import { defaultPlaywrightSettings } from '@/shared/lib/playwright/settings';

export const resolveEditingConnection = (args: {
  connections: IntegrationConnection[];
  editingConnectionId: string | null;
  preferredConnectionId?: string | null;
  lastAutoSelectedConnectionId?: string | null;
}): IntegrationConnection | null => {
  const {
    connections,
    editingConnectionId,
    preferredConnectionId = null,
    lastAutoSelectedConnectionId = null,
  } = args;

  if (connections.length === 0) {
    return null;
  }

  const selectedConnection =
    connections.find((item: IntegrationConnection) => item.id === editingConnectionId) ?? null;
  const preferredConnection =
    connections.find((item: IntegrationConnection) => item.id === preferredConnectionId) ?? null;
  const canPromotePreferred =
    Boolean(preferredConnection) &&
    (!selectedConnection || editingConnectionId === lastAutoSelectedConnectionId);

  return (canPromotePreferred ? preferredConnection : selectedConnection) ?? connections[0] ?? null;
};

export function useIntegrationsFormImpl(
  connections: IntegrationConnection[],
  preferredConnectionId: string | null = null
) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionIdState] = useState<string | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<IntegrationConnection | null>(null);
  const [playwrightSettings, setPlaywrightSettings] = useState(defaultPlaywrightSettings);
  const [playwrightPersonaId, setPlaywrightPersonaId] = useState<string | null>(null);
  const lastAutoSelectedConnectionIdRef = useRef<string | null>(null);

  const setEditingConnectionId = useCallback((id: string | null) => {
    lastAutoSelectedConnectionIdRef.current = null;
    setEditingConnectionIdState(id);
  }, []);

  useEffect(() => {
    if (connections.length === 0) {
      lastAutoSelectedConnectionIdRef.current = null;
      setEditingConnectionIdState(null);
      setPlaywrightSettings(defaultPlaywrightSettings);
      setPlaywrightPersonaId(null);
      return;
    }

    const connection = resolveEditingConnection({
      connections,
      editingConnectionId,
      preferredConnectionId,
      lastAutoSelectedConnectionId: lastAutoSelectedConnectionIdRef.current,
    });
    if (!connection) return;

    if (editingConnectionId !== connection.id) {
      lastAutoSelectedConnectionIdRef.current = connection.id;
      setEditingConnectionIdState(connection.id);
    }
    setPlaywrightSettings({
      headless: connection.playwrightHeadless ?? defaultPlaywrightSettings.headless,
      slowMo: connection.playwrightSlowMo ?? defaultPlaywrightSettings.slowMo,
      timeout: connection.playwrightTimeout ?? defaultPlaywrightSettings.timeout,
      navigationTimeout:
        connection.playwrightNavigationTimeout ?? defaultPlaywrightSettings.navigationTimeout,
      humanizeMouse: connection.playwrightHumanizeMouse ?? defaultPlaywrightSettings.humanizeMouse,
      mouseJitter: connection.playwrightMouseJitter ?? defaultPlaywrightSettings.mouseJitter,
      clickDelayMin: connection.playwrightClickDelayMin ?? defaultPlaywrightSettings.clickDelayMin,
      clickDelayMax: connection.playwrightClickDelayMax ?? defaultPlaywrightSettings.clickDelayMax,
      inputDelayMin: connection.playwrightInputDelayMin ?? defaultPlaywrightSettings.inputDelayMin,
      inputDelayMax: connection.playwrightInputDelayMax ?? defaultPlaywrightSettings.inputDelayMax,
      actionDelayMin:
        connection.playwrightActionDelayMin ?? defaultPlaywrightSettings.actionDelayMin,
      actionDelayMax:
        connection.playwrightActionDelayMax ?? defaultPlaywrightSettings.actionDelayMax,
      proxyEnabled: connection.playwrightProxyEnabled ?? defaultPlaywrightSettings.proxyEnabled,
      proxyServer: connection.playwrightProxyServer ?? defaultPlaywrightSettings.proxyServer,
      proxyUsername: connection.playwrightProxyUsername ?? defaultPlaywrightSettings.proxyUsername,
      proxyPassword: '',
      emulateDevice: connection.playwrightEmulateDevice ?? defaultPlaywrightSettings.emulateDevice,
      deviceName: connection.playwrightDeviceName ?? defaultPlaywrightSettings.deviceName,
    });
    setPlaywrightPersonaId(connection.playwrightPersonaId ?? null);
  }, [connections, editingConnectionId, preferredConnectionId]);

  return {
    isModalOpen,
    setIsModalOpen,
    editingConnectionId,
    setEditingConnectionId,
    connectionToDelete,
    setConnectionToDelete,
    playwrightSettings,
    setPlaywrightSettings,
    playwrightPersonaId,
    setPlaywrightPersonaId,
  };
}
