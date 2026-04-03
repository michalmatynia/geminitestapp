'use client';

import { useMemo } from 'react';

import type {
  IntegrationConnectionBasic,
  IntegrationWithConnections,
} from '@/shared/contracts/integrations';

import {
  resolveConnectedIntegrations,
  resolveConnectionOptions,
  resolveIntegrationOptions,
} from '../integration-selector-options';

export function useConnectedIntegrationSelectorOptions(
  integrations: IntegrationWithConnections[],
  selectedConnections: IntegrationConnectionBasic[] | null | undefined
): {
  integrationsWithConnections: IntegrationWithConnections[];
  integrationOptions: Array<{ value: string; label: string }>;
  connectionOptions: Array<{ value: string; label: string }>;
} {
  const integrationsWithConnections = useMemo(
    () => resolveConnectedIntegrations(integrations),
    [integrations]
  );
  const integrationOptions = useMemo(
    () => resolveIntegrationOptions(integrationsWithConnections),
    [integrationsWithConnections]
  );
  const connectionOptions = useMemo(
    () => resolveConnectionOptions(selectedConnections ?? []),
    [selectedConnections]
  );

  return {
    integrationsWithConnections,
    integrationOptions,
    connectionOptions,
  };
}
