'use client';

import { useCallback, useEffect, useState } from 'react';

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
  hasUnresolvedSelectedConnectionId: boolean;
  importSelectionHint: ProgrammableImportSelectionHint | null;
  selectedConnection: ProgrammableConnection | null;
  selectedConnectionId: string;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string>>;
} => {
  const [selectedConnectionId, setSelectedConnectionIdState] = useState(() =>
    readTrimmedQueryParam('connectionId')
  );
  const [initialImportActionId] = useState(() => readTrimmedQueryParam('importActionId'));
  const [initialRetainedRunId] = useState(() => readTrimmedQueryParam('retainedRunId'));
  const [preserveUnresolvedSelectedConnectionId, setPreserveUnresolvedSelectedConnectionId] =
    useState(false);

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
  const selectedConnection =
    connections.find((connection) => connection.id === selectedConnectionId) ?? null;
  const hasUnresolvedSelectedConnectionId =
    selectedConnectionId.trim().length > 0 && selectedConnection === null;

  useEffect(() => {
    if (connections.length === 0) {
      setSelectedConnectionIdState((current) => (current === '' ? current : ''));
      setPreserveUnresolvedSelectedConnectionId(false);
      return;
    }

    if (connections.some((connection) => connection.id === selectedConnectionId)) {
      setPreserveUnresolvedSelectedConnectionId(false);
      return;
    }

    if (preserveUnresolvedSelectedConnectionId && selectedConnectionId.trim().length > 0) {
      return;
    }

    if (initialImportActionId !== '') {
      const hintedConnection = connections.find(
        (connection) => connection.playwrightImportActionId?.trim() === initialImportActionId
      );

      if (hintedConnection !== undefined) {
        setSelectedConnectionIdState(hintedConnection.id);
        return;
      }
    }

    setSelectedConnectionIdState(connections[0]?.id ?? '');
  }, [
    connections,
    initialImportActionId,
    preserveUnresolvedSelectedConnectionId,
    selectedConnectionId,
  ]);

  const setSelectedConnectionId: React.Dispatch<React.SetStateAction<string>> = useCallback(
    (value) => {
      setPreserveUnresolvedSelectedConnectionId(true);
      setSelectedConnectionIdState((current) =>
        typeof value === 'function' ? value(current) : value
      );
    },
    []
  );

  return {
    hasUnresolvedSelectedConnectionId,
    importSelectionHint,
    selectedConnection,
    selectedConnectionId,
    setSelectedConnectionId,
  };
};
