'use client';

import { useEffect, useState } from 'react';

import type {
  ProgrammableConnection,
  ProgrammableConnections,
} from '@/features/playwright/pages/playwright-programmable-integration-page.types';

export const usePlaywrightProgrammableConnectionSelection = (
  connections: ProgrammableConnections
): {
  selectedConnection: ProgrammableConnection | null;
  selectedConnectionId: string;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string>>;
} => {
  const [selectedConnectionId, setSelectedConnectionId] = useState('');

  useEffect(() => {
    if (connections.length === 0) {
      setSelectedConnectionId((current) => (current === '' ? current : ''));
      return;
    }

    if (!connections.some((connection) => connection.id === selectedConnectionId)) {
      setSelectedConnectionId(connections[0]?.id ?? '');
    }
  }, [connections, selectedConnectionId]);

  return {
    selectedConnection: connections.find((connection) => connection.id === selectedConnectionId) ?? null,
    selectedConnectionId,
    setSelectedConnectionId,
  };
};
