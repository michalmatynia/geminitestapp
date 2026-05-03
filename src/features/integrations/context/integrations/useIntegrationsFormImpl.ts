'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { type IntegrationConnection } from '@/shared/contracts/integrations/connections';

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
  const lastAutoSelectedConnectionIdRef = useRef<string | null>(null);

  const setEditingConnectionId = useCallback((id: string | null) => {
    lastAutoSelectedConnectionIdRef.current = null;
    setEditingConnectionIdState(id);
  }, []);

  useEffect(() => {
    if (connections.length === 0) {
      lastAutoSelectedConnectionIdRef.current = null;
      setEditingConnectionIdState(null);
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
  }, [connections, editingConnectionId, preferredConnectionId]);

  return {
    isModalOpen,
    setIsModalOpen,
    editingConnectionId,
    setEditingConnectionId,
    connectionToDelete,
    setConnectionToDelete,
  };
}
