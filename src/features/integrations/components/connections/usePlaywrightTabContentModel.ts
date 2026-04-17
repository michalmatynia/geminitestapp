'use client';

import React from 'react';

import {
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useIntegrationsActions,
  useIntegrationsData,
  useIntegrationsForm,
} from '@/features/integrations/context/IntegrationsContext';
import { resolveIntegrationManagedRuntimeActionKeys } from '@/features/integrations/utils/playwright-managed-actions';
import { buildManagedPlaywrightActionSummaries } from '@/features/playwright/utils/playwright-managed-runtime-actions';
import { usePlaywrightActions } from '@/shared/hooks/usePlaywrightStepSequencer';

type PlaywrightTabContentModel = {
  activeIntegrationSlug: string | null | undefined;
  managedActionsLoading: boolean;
  managedActionSummaries: ReturnType<typeof buildManagedPlaywrightActionSummaries>;
  usesSequencerManagedActions: boolean;
  showListingScriptReset: boolean;
  handleResetListingScript: () => void;
};

export function usePlaywrightTabContentModel(): PlaywrightTabContentModel {
  const data = useIntegrationsData();
  const form = useIntegrationsForm();
  const actions = useIntegrationsActions();
  const activeConnection =
    data.connections.find((connection) => connection.id === form.editingConnectionId) ??
    data.connections[0] ??
    null;
  const runtimeKeys = React.useMemo(
    () =>
      resolveIntegrationManagedRuntimeActionKeys({
        integrationSlug: data.activeIntegration?.slug,
        connection: activeConnection,
      }),
    [activeConnection, data.activeIntegration?.slug]
  );
  const managedActionsQuery = usePlaywrightActions({
    enabled: runtimeKeys.length > 0,
  });
  const managedActionSummaries = React.useMemo(
    () =>
      buildManagedPlaywrightActionSummaries({
        actions: managedActionsQuery.data ?? [],
        runtimeKeys,
      }),
    [managedActionsQuery.data, runtimeKeys]
  );

  const usesSequencerManagedActions = runtimeKeys.length > 0;

  return {
    activeIntegrationSlug: data.activeIntegration?.slug,
    managedActionsLoading: managedActionsQuery.isLoading,
    managedActionSummaries,
    usesSequencerManagedActions,
    showListingScriptReset: isTraderaBrowserIntegrationSlug(data.activeIntegration?.slug),
    handleResetListingScript: (): void => {
      actions.handleResetListingScript().catch(() => undefined);
    },
  };
}
