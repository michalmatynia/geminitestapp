'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  isBaseIntegrationSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { useIntegrationsWithConnections } from '@/features/integrations/hooks/useIntegrationQueries';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations';
import { useToast } from '@/shared/ui';
import { createStrictContext } from './createStrictContext';

const CATEGORY_MAPPING_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com', 'tradera']);

export type CategoryMapperMarketplace = 'base' | 'tradera';

type MarketplaceOption = {
  value: CategoryMapperMarketplace;
  label: string;
  description: string;
};

const MARKETPLACE_OPTIONS: MarketplaceOption[] = [
  {
    value: 'base',
    label: 'Base.com',
    description: 'Map Base.com categories, producers, and tags.',
  },
  {
    value: 'tradera',
    label: 'Tradera',
    description: 'Map Tradera categories for browser Tradera connections.',
  },
];

const normalizeMarketplaceValue = (
  value: string | null | undefined
): CategoryMapperMarketplace | null => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'base' || normalized === 'tradera') {
    return normalized;
  }
  return null;
};

const resolveMarketplaceForSlug = (
  slug: string | null | undefined
): CategoryMapperMarketplace | null => {
  if (isBaseIntegrationSlug(slug)) return 'base';
  if (isTraderaBrowserIntegrationSlug(slug)) return 'tradera';
  return null;
};

const getMarketplaceLabel = (value: CategoryMapperMarketplace): string =>
  MARKETPLACE_OPTIONS.find((option) => option.value === value)?.label ?? value;

type SelectedMarketplaceConnection = {
  id: string;
  name: string;
  integration: IntegrationWithConnections;
};

// --- Granular Contexts ---

export interface CategoryMapperPageData {
  marketplaces: MarketplaceOption[];
  integrations: IntegrationWithConnections[];
  loading: boolean;
}
export const { Context: DataContext, useValue: useCategoryMapperPageData } =
  createStrictContext<CategoryMapperPageData>({
    displayName: 'CategoryMapperPageDataContext',
    errorMessage: 'useCategoryMapperPageData must be used within CategoryMapperPageProvider',
  });

export interface CategoryMapperPageSelection {
  selectedMarketplace: CategoryMapperMarketplace;
  selectedMarketplaceLabel: string;
  selectedConnectionId: string | null;
  selectedConnection: SelectedMarketplaceConnection | null;
  isSupportedConnection: boolean;
  setSelectedMarketplace: (marketplace: CategoryMapperMarketplace) => void;
  setSelectedConnectionId: (connectionId: string) => void;
}
export const { Context: SelectionContext, useValue: useCategoryMapperPageSelection } =
  createStrictContext<CategoryMapperPageSelection>({
    displayName: 'CategoryMapperPageSelectionContext',
    errorMessage: 'useCategoryMapperPageSelection must be used within CategoryMapperPageProvider',
  });

type CategoryMapperPageProviderProps = {
  children: React.ReactNode;
  initialMarketplace?: CategoryMapperMarketplace;
};

export function CategoryMapperPageProvider({
  children,
  initialMarketplace,
}: CategoryMapperPageProviderProps): React.JSX.Element {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const integrationsQuery = useIntegrationsWithConnections();
  const [selectedMarketplaceOverride, setSelectedMarketplaceOverride] =
    useState<CategoryMapperMarketplace | null>(null);
  const [selectedConnectionIdOverride, setSelectedConnectionIdOverride] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!integrationsQuery.isError) return;
    const message =
      integrationsQuery.error instanceof Error
        ? integrationsQuery.error.message
        : 'Failed to load integrations.';
    toast(message, { variant: 'error' });
  }, [integrationsQuery.error, integrationsQuery.isError, toast]);

  const supportedIntegrations = useMemo<IntegrationWithConnections[]>((): IntegrationWithConnections[] => {
    const data = integrationsQuery.data ?? [];
    return data.filter((integration: IntegrationWithConnections) =>
      CATEGORY_MAPPING_MARKETPLACE_SLUGS.has(integration.slug.toLowerCase())
    );
  }, [integrationsQuery.data]);

  const requestedConnectionId = useMemo((): string | null => {
    const value = searchParams.get('connectionId')?.trim() ?? '';
    return value.length > 0 ? value : null;
  }, [searchParams]);

  const requestedMarketplace = useMemo(
    (): CategoryMapperMarketplace | null =>
      normalizeMarketplaceValue(searchParams.get('marketplace')),
    [searchParams]
  );

  const selectedMarketplace = useMemo((): CategoryMapperMarketplace => {
    if (selectedMarketplaceOverride) {
      return selectedMarketplaceOverride;
    }

    if (requestedConnectionId) {
      const requestedIntegration = supportedIntegrations.find((integration) =>
        integration.connections.some((connection) => connection.id === requestedConnectionId)
      );
      const requestedConnectionMarketplace = resolveMarketplaceForSlug(requestedIntegration?.slug);
      if (requestedConnectionMarketplace) {
        return requestedConnectionMarketplace;
      }
    }

    if (requestedMarketplace) {
      return requestedMarketplace;
    }

    if (initialMarketplace) {
      return initialMarketplace;
    }

    const firstAvailableMarketplace = supportedIntegrations
      .map((integration) => resolveMarketplaceForSlug(integration.slug))
      .find((value): value is CategoryMapperMarketplace => value !== null);

    return firstAvailableMarketplace ?? 'base';
  }, [
    initialMarketplace,
    requestedConnectionId,
    requestedMarketplace,
    selectedMarketplaceOverride,
    supportedIntegrations,
  ]);

  const integrations = useMemo<IntegrationWithConnections[]>(
    () =>
      supportedIntegrations.filter(
        (integration) => resolveMarketplaceForSlug(integration.slug) === selectedMarketplace
      ),
    [selectedMarketplace, supportedIntegrations]
  );

  const selectedConnectionId = useMemo((): string | null => {
    if (selectedConnectionIdOverride) {
      const exists = integrations.some((integration: IntegrationWithConnections) =>
        integration.connections.some(
          (connection: { id: string }) => connection.id === selectedConnectionIdOverride
        )
      );
      if (exists) return selectedConnectionIdOverride;
    }

    if (requestedConnectionId) {
      const exists = integrations.some((integration: IntegrationWithConnections) =>
        integration.connections.some(
          (connection: { id: string }) => connection.id === requestedConnectionId
        )
      );
      if (exists) return requestedConnectionId;
    }

    const firstConnection = integrations
      .flatMap((integration: IntegrationWithConnections) => integration.connections)
      .find((connection: { id: string }) => connection);
    return firstConnection?.id ?? null;
  }, [integrations, requestedConnectionId, selectedConnectionIdOverride]);

  const selectedConnection = useMemo((): SelectedMarketplaceConnection | null => {
    if (!selectedConnectionId) return null;
    const allConnections = integrations.flatMap((integration: IntegrationWithConnections) =>
      integration.connections.map((connection: { id: string; name: string }) => ({
        ...connection,
        integration,
      }))
    );
    return (
      allConnections.find((connection: { id: string }) => connection.id === selectedConnectionId) ??
      null
    );
  }, [integrations, selectedConnectionId]);

  const isSupportedConnection = useMemo(
    (): boolean => Boolean(selectedConnection),
    [selectedConnection]
  );

  const setSelectedMarketplace = useCallback((marketplace: CategoryMapperMarketplace): void => {
    setSelectedMarketplaceOverride(marketplace);
    setSelectedConnectionIdOverride(null);
  }, []);

  const setSelectedConnectionId = useCallback((connectionId: string): void => {
    setSelectedConnectionIdOverride(connectionId);
  }, []);

  const dataValue = useMemo<CategoryMapperPageData>(
    () => ({
      marketplaces: MARKETPLACE_OPTIONS,
      integrations,
      loading: integrationsQuery.isLoading,
    }),
    [integrations, integrationsQuery.isLoading]
  );

  const selectedMarketplaceLabel = useMemo(
    (): string => getMarketplaceLabel(selectedMarketplace),
    [selectedMarketplace]
  );

  const selectionValue = useMemo<CategoryMapperPageSelection>(
    () => ({
      selectedMarketplace,
      selectedMarketplaceLabel,
      selectedConnectionId,
      selectedConnection,
      isSupportedConnection,
      setSelectedMarketplace,
      setSelectedConnectionId,
    }),
    [
      isSupportedConnection,
      selectedConnection,
      selectedConnectionId,
      selectedMarketplace,
      selectedMarketplaceLabel,
      setSelectedConnectionId,
      setSelectedMarketplace,
    ]
  );

  return (
    <DataContext.Provider value={dataValue}>
      <SelectionContext.Provider value={selectionValue}>{children}</SelectionContext.Provider>
    </DataContext.Provider>
  );
}
