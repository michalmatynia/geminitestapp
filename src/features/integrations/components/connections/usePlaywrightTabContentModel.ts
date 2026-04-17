'use client';

import React from 'react';

import {
  is1688IntegrationSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useIntegrationsActions,
  useIntegrationsData,
  useIntegrationsForm,
} from '@/features/integrations/context/IntegrationsContext';
import { buildIntegrationManagedPlaywrightActionSummaries, resolveIntegrationManagedRuntimeActionKeys } from '@/features/integrations/utils/playwright-managed-actions';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import { usePlaywrightActions } from '@/shared/hooks/usePlaywrightStepSequencer';

const resolveFallbackCopy = (usesSequencerManagedActions: boolean): {
  title: string;
  description: string;
} =>
  usesSequencerManagedActions
    ? {
        title: 'Legacy connection fallback overrides',
        description:
          'These connection-level settings remain as compatibility fallback only. Browser mode, environment preparation, and per-step overrides now belong in the Step Sequencer runtime actions above.',
      }
    : {
        title: 'Playwright connection settings',
        description:
          'Connection-level Playwright configuration remains the active editor for this integration.',
      };

type PlaywrightTabContentModel = {
  activeIntegrationSlug: string | null | undefined;
  managedActionsLoading: boolean;
  managedActionSummaries: ReturnType<
    typeof buildIntegrationManagedPlaywrightActionSummaries
  >;
  usesSequencerManagedActions: boolean;
  fallbackCopy: {
    title: string;
    description: string;
  };
  collapsibleFallback: boolean;
  showListingScriptReset: boolean;
  playwrightPersonaId: string | null;
  playwrightPersonas: PlaywrightPersona[];
  playwrightPersonasLoading: boolean;
  handlePersonaSelection: (value: string | null) => void;
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
      buildIntegrationManagedPlaywrightActionSummaries({
        actions: managedActionsQuery.data ?? [],
        runtimeKeys,
      }),
    [managedActionsQuery.data, runtimeKeys]
  );

  const usesSequencerManagedActions = runtimeKeys.length > 0;
  const fallbackCopy = resolveFallbackCopy(usesSequencerManagedActions);

  return {
    activeIntegrationSlug: data.activeIntegration?.slug,
    managedActionsLoading: managedActionsQuery.isLoading,
    managedActionSummaries,
    usesSequencerManagedActions,
    fallbackCopy,
    collapsibleFallback:
      usesSequencerManagedActions && !is1688IntegrationSlug(data.activeIntegration?.slug),
    showListingScriptReset: isTraderaBrowserIntegrationSlug(data.activeIntegration?.slug),
    playwrightPersonaId: form.playwrightPersonaId,
    playwrightPersonas: data.playwrightPersonas,
    playwrightPersonasLoading: data.playwrightPersonasLoading,
    handlePersonaSelection: (value: string | null): void => {
      actions.handleSelectPlaywrightPersona(value).catch(() => undefined);
    },
    handleResetListingScript: (): void => {
      actions.handleResetListingScript().catch(() => undefined);
    },
  };
}
