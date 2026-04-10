'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import {
  defaultIntegrationConnectionPlaywrightSettings,
  normalizeIntegrationConnectionPlaywrightPersonaId,
  resolveIntegrationConnectionPlaywrightSettingsWithPersona,
} from '@/features/integrations/utils/playwright-connection-settings';

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
  preferredConnectionId: string | null = null,
  playwrightPersonas: PlaywrightPersona[] = []
) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionIdState] = useState<string | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<IntegrationConnection | null>(null);
  const [playwrightSettings, setPlaywrightSettings] = useState(
    defaultIntegrationConnectionPlaywrightSettings
  );
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
      setPlaywrightSettings(defaultIntegrationConnectionPlaywrightSettings);
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
      ...resolveIntegrationConnectionPlaywrightSettingsWithPersona(connection, playwrightPersonas),
      proxyPassword: '',
    });
    setPlaywrightPersonaId(
      normalizeIntegrationConnectionPlaywrightPersonaId(connection.playwrightPersonaId)
    );
  }, [connections, editingConnectionId, playwrightPersonas, preferredConnectionId]);

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
