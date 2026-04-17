'use client';

import { PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG } from '@/features/integrations/constants/slugs';
import {
  useIntegrations,
  useProgrammableIntegrationConnections,
} from '@/features/integrations/hooks/useIntegrationQueries';
import { useUpsertProgrammableConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import type { ProgrammableConnections } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';
import type { Integration } from '@/shared/contracts/integrations/base';
import { usePlaywrightActions } from '@/shared/hooks/usePlaywrightStepSequencer';

export const usePlaywrightProgrammableIntegrationPageQueries = (): {
  connections: ProgrammableConnections;
  connectionsQuery: ReturnType<typeof useProgrammableIntegrationConnections>;
  integrationsQuery: ReturnType<typeof useIntegrations>;
  personasQuery: ReturnType<typeof usePlaywrightPersonas>;
  playwrightActionsQuery: ReturnType<typeof usePlaywrightActions>;
  programmableIntegration: Integration | null;
  upsertConnection: ReturnType<typeof useUpsertProgrammableConnection>;
} => {
  const integrationsQuery = useIntegrations();
  const personasQuery = usePlaywrightPersonas();
  const playwrightActionsQuery = usePlaywrightActions();
  const upsertConnection = useUpsertProgrammableConnection();

  const programmableIntegration =
    integrationsQuery.data?.find(
      (integration: Integration) => integration.slug === PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG
    ) ?? null;
  const connectionsQuery = useProgrammableIntegrationConnections(programmableIntegration?.id, {
    enabled: Boolean(programmableIntegration?.id),
  });

  return {
    connections: connectionsQuery.data ?? [],
    connectionsQuery,
    integrationsQuery,
    personasQuery,
    playwrightActionsQuery,
    programmableIntegration,
    upsertConnection,
  };
};
