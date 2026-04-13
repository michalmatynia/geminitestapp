'use client';

import { useMemo } from 'react';
import { useListingSelection } from '@/features/integrations/context/ListingSettingsContext';
import { useConnectedIntegrationSelectorOptions } from './useConnectedIntegrationSelectorOptions';
import { resolveIntegrationDisplayName } from '../product-listings-labels';
import { resolveListProductIntegrationSelectionCopy } from '../product-listings-copy';

export function useIntegrationSelectorProps() {
  const {
    integrations,
    loadingIntegrations: loading,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useListingSelection();

  const { integrationOptions, connectionOptions } = useConnectedIntegrationSelectorOptions(
    integrations,
    selectedIntegration?.connections ?? null
  );

  const copy = useMemo(() => resolveListProductIntegrationSelectionCopy({
    selectedIntegrationName: resolveIntegrationDisplayName(
      selectedIntegration?.name,
      selectedIntegration?.slug
    ),
    selectedIntegrationSlug: selectedIntegration?.slug,
  }), [selectedIntegration]);

  return {
    loading,
    selectedIntegrationId,
    setSelectedIntegrationId,
    integrationOptions,
    selectedConnectionId,
    setSelectedConnectionId,
    connectionOptions,
    showAccountField: Boolean(selectedIntegration),
    ...copy,
  };
}
