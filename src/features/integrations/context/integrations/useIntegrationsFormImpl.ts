'use client';

import { useState, useEffect } from 'react';

import { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import { defaultPlaywrightSettings } from '@/shared/lib/playwright/settings';

export function useIntegrationsFormImpl(connections: IntegrationConnection[]) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<IntegrationConnection | null>(null);
  const [playwrightSettings, setPlaywrightSettings] = useState(defaultPlaywrightSettings);
  const [playwrightPersonaId, setPlaywrightPersonaId] = useState<string | null>(null);

  useEffect(() => {
    if (connections.length === 0) {
      setEditingConnectionId(null);
      setPlaywrightSettings(defaultPlaywrightSettings);
      setPlaywrightPersonaId(null);
      return;
    }

    const connection =
      connections.find((item: IntegrationConnection) => item.id === editingConnectionId) ??
      connections[0];
    if (!connection) return;

    if (editingConnectionId !== connection.id) {
      setEditingConnectionId(connection.id);
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
  }, [connections, editingConnectionId]);

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
