'use client';

import {
  usePlaywrightProgrammableConnections,
  usePlaywrightProgrammableIntegration,
  useUpsertPlaywrightProgrammableConnection,
} from '@/features/playwright/hooks/usePlaywrightProgrammableIntegration';
import {
  useCleanupAllPlaywrightBrowserPersistence,
  useCleanupPlaywrightBrowserPersistence,
  usePromotePlaywrightBrowserOwnership,
  useTestPlaywrightProgrammableConnection,
} from '@/features/playwright/hooks/usePlaywrightProgrammableAdminMutations';
import type { ProgrammableConnections } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';
import { usePlaywrightActions } from '@/shared/hooks/usePlaywrightStepSequencer';

export const usePlaywrightProgrammableIntegrationPageQueries = (): {
  connections: ProgrammableConnections;
  connectionsQuery: ReturnType<typeof usePlaywrightProgrammableConnections>;
  integrationsQuery: ReturnType<typeof usePlaywrightProgrammableIntegration>['integrationsQuery'];
  personasQuery: ReturnType<typeof usePlaywrightPersonas>;
  playwrightActionsQuery: ReturnType<typeof usePlaywrightActions>;
  programmableIntegration: ReturnType<
    typeof usePlaywrightProgrammableIntegration
  >['programmableIntegration'];
  cleanupAllBrowserPersistence: ReturnType<typeof useCleanupAllPlaywrightBrowserPersistence>;
  cleanupBrowserPersistence: ReturnType<typeof useCleanupPlaywrightBrowserPersistence>;
  promoteBrowserOwnership: ReturnType<typeof usePromotePlaywrightBrowserOwnership>;
  testProgrammableConnection: ReturnType<typeof useTestPlaywrightProgrammableConnection>;
  upsertConnection: ReturnType<typeof useUpsertPlaywrightProgrammableConnection>;
} => {
  const { integrationQuery, programmableIntegration } = usePlaywrightProgrammableIntegration();
  const personasQuery = usePlaywrightPersonas();
  const playwrightActionsQuery = usePlaywrightActions();
  const promoteBrowserOwnership = usePromotePlaywrightBrowserOwnership();
  const cleanupBrowserPersistence = useCleanupPlaywrightBrowserPersistence();
  const cleanupAllBrowserPersistence = useCleanupAllPlaywrightBrowserPersistence();
  const testProgrammableConnection = useTestPlaywrightProgrammableConnection();
  const upsertConnection = useUpsertPlaywrightProgrammableConnection();
  const connectionsQuery = usePlaywrightProgrammableConnections({
    enabled: programmableIntegration !== null,
  });

  return {
    connections: connectionsQuery.data ?? [],
    connectionsQuery,
    cleanupAllBrowserPersistence,
    cleanupBrowserPersistence,
    integrationsQuery: integrationQuery,
    personasQuery,
    playwrightActionsQuery,
    promoteBrowserOwnership,
    programmableIntegration,
    testProgrammableConnection,
    upsertConnection,
  };
};
