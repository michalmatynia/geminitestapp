'use client';

import React from 'react';

import { useListingSelection } from '@/features/integrations/context/ListingSettingsContext';

import { ConnectedIntegrationFieldsSection } from '../ConnectedIntegrationFieldsSection';
import { IntegrationSelectionEmptyState } from '../IntegrationSelectionEmptyState';
import { useConnectedIntegrationSelectorOptions } from '../hooks/useConnectedIntegrationSelectorOptions';
import { resolveIntegrationDisplayName } from '../product-listings-labels';
import {
  resolveIntegrationSelectionConfiguredAccountsEmptyStateCopy,
  resolveListProductIntegrationSelectionCopy,
} from '../product-listings-copy';

export function IntegrationSelection(): React.JSX.Element {
  const { integrations, loadingIntegrations: loading, selectedIntegration } = useListingSelection();
  const { integrationsWithConnections } = useConnectedIntegrationSelectorOptions(
    integrations,
    selectedIntegration?.connections ?? null
  );
  const { sectionTitle } = resolveListProductIntegrationSelectionCopy({
    selectedIntegrationName: resolveIntegrationDisplayName(
      selectedIntegration?.name,
      selectedIntegration?.slug
    ),
    selectedIntegrationSlug: selectedIntegration?.slug,
  });
  const { message: emptyStateMessage, detail: emptyStateDetail } =
    resolveIntegrationSelectionConfiguredAccountsEmptyStateCopy();

  if (loading) {
    return (
      <ConnectedIntegrationFieldsSection
        title={sectionTitle}
        className='p-4 space-y-4'
        loadingVariant='inline-text'
        loadingClassName='text-sm text-gray-400'
      />
    );
  }

  if (integrationsWithConnections.length === 0) {
    return (
      <IntegrationSelectionEmptyState
        variant='section-detail'
        message={emptyStateMessage}
        detail={emptyStateDetail}
      />
    );
  }

  return (
    <ConnectedIntegrationFieldsSection
      title={sectionTitle}
      className='p-4 space-y-4'
      loadingVariant='inline-text'
      loadingClassName='text-sm text-gray-400'
    />
  );
}
