'use client';

import { useState, useEffect } from 'react';

import {
  useIntegrations,
  useIntegrationConnections,
  usePlaywrightPersonas,
} from '@/features/integrations/hooks/useIntegrationQueries';
import type { Integration } from '@/shared/contracts/integrations/base';
import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import { useToast } from '@/shared/ui/primitives.public';

const EMPTY_INTEGRATIONS: Integration[] = [];
const EMPTY_CONNECTIONS: IntegrationConnection[] = [];
const EMPTY_PERSONAS: PlaywrightPersona[] = [];

export function useIntegrationsDataImpl() {
  const { toast } = useToast();

  const integrationsQuery = useIntegrations();
  const integrations = integrationsQuery.data ?? EMPTY_INTEGRATIONS;
  const integrationsLoading = integrationsQuery.isLoading;

  const [activeIntegration, setActiveIntegration] = useState<Integration | null>(null);
  const connectionsQuery = useIntegrationConnections(activeIntegration?.id);
  const connections = connectionsQuery.data ?? EMPTY_CONNECTIONS;
  const connectionsLoading = connectionsQuery.isLoading;

  const playwrightPersonasQuery = usePlaywrightPersonas();
  const playwrightPersonas = playwrightPersonasQuery.data ?? EMPTY_PERSONAS;
  const playwrightPersonasLoading = playwrightPersonasQuery.isLoading;

  useEffect(() => {
    if (!integrationsQuery.isError) return;
    toast(integrationsQuery.error?.message ?? 'Failed to load integrations.', { variant: 'error' });
  }, [integrationsQuery.error, integrationsQuery.isError, toast]);

  useEffect(() => {
    if (!connectionsQuery.isError) return;
    toast(connectionsQuery.error?.message ?? 'Failed to load connections.', { variant: 'error' });
  }, [connectionsQuery.error, connectionsQuery.isError, toast]);

  useEffect(() => {
    if (!activeIntegration) return;
    if (integrations.find((item: Integration) => item.id === activeIntegration.id)) return;
    setActiveIntegration(null);
  }, [activeIntegration, integrations]);

  return {
    integrations,
    integrationsLoading,
    activeIntegration,
    setActiveIntegration,
    connections,
    connectionsLoading,
    playwrightPersonas,
    playwrightPersonasLoading,
    integrationsQuery, // for refetching
  };
}
