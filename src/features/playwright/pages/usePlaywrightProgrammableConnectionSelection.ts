'use client';

import { useEffect, useState } from 'react';

import type {
  ProgrammableConnection,
  ProgrammableConnections,
} from '@/features/playwright/pages/playwright-programmable-integration-page.types';

type ProgrammableImportSelectionHint = {
  importActionId: string;
  retainedRunId: string | null;
  matchedConnectionId: string | null;
};

const readTrimmedQueryParam = (key: string): string => {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key)?.trim() ?? '';
};

export const usePlaywrightProgrammableConnectionSelection = (
  connections: ProgrammableConnections
): {
  importSelectionHint: ProgrammableImportSelectionHint | null;
  selectedConnection: ProgrammableConnection | null;
  selectedConnectionId: string;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string>>;
} => {
  const [selectedConnectionId, setSelectedConnectionId] = useState(() =>
    readTrimmedQueryParam('connectionId')
  );
  const [initialImportActionId] = useState(() => readTrimmedQueryParam('importActionId'));
  const [initialRetainedRunId] = useState(() => readTrimmedQueryParam('retainedRunId'));

  const importSelectionHint =
    initialImportActionId === ''
      ? null
      : {
          importActionId: initialImportActionId,
          retainedRunId: initialRetainedRunId === '' ? null : initialRetainedRunId,
          matchedConnectionId:
            connections.find(
              (connection) => connection.playwrightImportActionId?.trim() === initialImportActionId
            )?.id ?? null,
        };

  useEffect(() => {
    if (connections.length === 0) {
      setSelectedConnectionId((current) => (current === '' ? current : ''));
      return;
    }

    if (connections.some((connection) => connection.id === selectedConnectionId)) {
      return;
    }

    if (initialImportActionId !== '') {
      const hintedConnection = connections.find(
        (connection) => connection.playwrightImportActionId?.trim() === initialImportActionId
      );

      if (hintedConnection !== undefined) {
        setSelectedConnectionId(hintedConnection.id);
        return;
      }
    }

    setSelectedConnectionId(connections[0]?.id ?? '');
  }, [connections, initialImportActionId, selectedConnectionId]);

  return {
    importSelectionHint,
    selectedConnection: connections.find((connection) => connection.id === selectedConnectionId) ?? null,
    selectedConnectionId,
    setSelectedConnectionId,
  };
};
