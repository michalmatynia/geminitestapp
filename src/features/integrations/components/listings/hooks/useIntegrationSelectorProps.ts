'use client';

import { useMemo } from 'react';
import {
  ListingSelection,
  useListingSelection,
} from '@/features/integrations/context/ListingSettingsContext';
import { useConnectedIntegrationSelectorOptions } from './useConnectedIntegrationSelectorOptions';
import { resolveIntegrationDisplayName } from '../product-listings-labels';
import {
  resolveListProductIntegrationSelectionCopy,
  resolveSelectProductIntegrationSettingsCopy,
} from '../product-listings-copy';

export type IntegrationSelectorProps = {
  loading: boolean;
  selectedIntegrationId: string;
  setSelectedIntegrationId: (id: string) => void;
  integrationOptions: Array<{ value: string; label: string }>;
  selectedConnectionId: string;
  setSelectedConnectionId: (id: string) => void;
  connectionOptions: Array<{ value: string; label: string }>;
  showAccountField: boolean;
  marketplaceLabel: string;
  marketplacePlaceholder: string;
  accountLabel: string;
  accountPlaceholder: string;
  accountDescription: string | null;
};

export type IntegrationSelectorCopyStrategy = 'list' | 'select';

export function useIntegrationSelectorProps(
  strategy: IntegrationSelectorCopyStrategy = 'list'
): IntegrationSelectorProps {
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

  const copy = useMemo(() => {
    if (strategy === 'select') {
      const selectCopy = resolveSelectProductIntegrationSettingsCopy();
      return {
        ...selectCopy,
        accountDescription: null,
      };
    }

    return resolveListProductIntegrationSelectionCopy({
      selectedIntegrationName: resolveIntegrationDisplayName(
        selectedIntegration?.name,
        selectedIntegration?.slug
      ),
      selectedIntegrationSlug: selectedIntegration?.slug,
    });
  }, [selectedIntegration, strategy]);

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
