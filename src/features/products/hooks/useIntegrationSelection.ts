'use client';

import React, { useEffect, useState } from 'react';

import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import {
  useDefaultExportConnection,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';

export function useIntegrationSelection(args: {
  isOpen: boolean;
}) {
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
    if (isOpen === false || selectedIntegrationId === '') return;
    const integration = integrations.find(
      (entry: IntegrationWithConnections) => entry.id === selectedIntegrationId
    );
    const connectionIds = integration?.connections.map((connection) => connection.id) ?? [];
    if (connectionIds.length === 0) {
      if (selectedConnectionId !== '') setSelectedConnectionId('');
      return;
    }
    if (selectedConnectionId !== '' && connectionIds.includes(selectedConnectionId)) {
      return;
    }
    const preferredId = preferredConnection?.connectionId ?? null;
    if (preferredId !== null && connectionIds.includes(preferredId)) {
      setSelectedConnectionId(preferredId);
      return;
    }
    setSelectedConnectionId(connectionIds[0] ?? '');
  }, [integrations, isOpen, preferredConnection?.connectionId, selectedConnectionId, selectedIntegrationId]);

  return {
    integrations,
    isLoading,
    selectedIntegrationId,
    setSelectedIntegrationId,
    selectedConnectionId,
    setSelectedConnectionId,
  };
}
