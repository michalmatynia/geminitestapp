'use client';

import React, { useEffect, useState } from 'react';

import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import {
  useDefaultExportConnection,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';

type UseIntegrationSelectionResult = {
  integrations: IntegrationWithConnections[];
  isLoading: boolean;
  selectedIntegrationId: string;
  setSelectedIntegrationId: React.Dispatch<React.SetStateAction<string>>;
  selectedConnectionId: string;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string>>;
};

type ResolveSelectedConnectionIdArgs = {
  isOpen: boolean;
  integrations: IntegrationWithConnections[];
  selectedIntegrationId: string;
  selectedConnectionId: string;
  preferredConnectionId: string | null;
};

const getIntegrationConnectionIds = (
  integrations: IntegrationWithConnections[],
  selectedIntegrationId: string
): string[] => {
  const integration = integrations.find(
    (entry: IntegrationWithConnections) => entry.id === selectedIntegrationId
  );
  return integration?.connections.map((connection) => connection.id) ?? [];
};

const isSelectedConnectionValid = (
  selectedConnectionId: string,
  connectionIds: string[]
): boolean => selectedConnectionId !== '' && connectionIds.includes(selectedConnectionId);

const resolvePreferredConnectionId = (
  preferredConnectionId: string | null,
  connectionIds: string[]
): string | null => {
  if (preferredConnectionId === null) return null;
  if (connectionIds.includes(preferredConnectionId)) return preferredConnectionId;
  return null;
};

const resolveSelectedConnectionId = ({
  isOpen,
  integrations,
  selectedIntegrationId,
  selectedConnectionId,
  preferredConnectionId,
}: ResolveSelectedConnectionIdArgs): string | null => {
  if (isOpen === false) return null;
  if (selectedIntegrationId === '') return null;

  const connectionIds = getIntegrationConnectionIds(integrations, selectedIntegrationId);
  if (connectionIds.length === 0) return '';

  if (isSelectedConnectionValid(selectedConnectionId, connectionIds)) return null;

  const preferredId = resolvePreferredConnectionId(preferredConnectionId, connectionIds);
  if (preferredId !== null) return preferredId;

  return connectionIds[0] ?? '';
};

export function useIntegrationSelection(args: {
  isOpen: boolean;
}): UseIntegrationSelectionResult {
  const { isOpen } = args;
  const { data: integrationsData = [], isLoading } = useIntegrationsWithConnections();
  const { data: preferredConnection } = useDefaultExportConnection();
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');

  const integrations = React.useMemo(
    (): IntegrationWithConnections[] =>
      integrationsData.filter(
        (integration: IntegrationWithConnections) => integration.connections.length > 0
      ),
    [integrationsData]
  );

  useEffect(() => {
    if (isOpen === false) return;
    if (integrations.length === 0) {
      if (selectedIntegrationId !== '') setSelectedIntegrationId('');
      if (selectedConnectionId !== '') setSelectedConnectionId('');
      return;
    }
    const hasSelectedIntegration = integrations.some(
      (integration: IntegrationWithConnections) => integration.id === selectedIntegrationId
    );
    if (hasSelectedIntegration === false) {
      setSelectedIntegrationId(integrations[0]?.id ?? '');
    }
  }, [integrations, isOpen, selectedConnectionId, selectedIntegrationId]);

  useEffect(() => {
    const nextConnectionId = resolveSelectedConnectionId({
      isOpen,
      integrations,
      selectedIntegrationId,
      selectedConnectionId,
      preferredConnectionId: preferredConnection?.connectionId ?? null,
    });
    if (nextConnectionId !== null && nextConnectionId !== selectedConnectionId) {
      setSelectedConnectionId(nextConnectionId);
    }
  }, [
    integrations,
    isOpen,
    preferredConnection?.connectionId,
    selectedConnectionId,
    selectedIntegrationId,
  ]);

  return {
    integrations,
    isLoading,
    selectedIntegrationId,
    setSelectedIntegrationId,
    selectedConnectionId,
    setSelectedConnectionId,
  };
}
