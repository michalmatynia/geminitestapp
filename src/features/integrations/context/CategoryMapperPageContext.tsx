'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useIntegrationsWithConnections } from '@/features/integrations/hooks/useIntegrationQueries';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations';
import { useToast } from '@/shared/ui';
import { internalError } from '@/shared/errors/app-error';

const BASE_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com']);
const CATEGORY_MAPPING_MARKETPLACE_SLUGS = new Set([...BASE_MARKETPLACE_SLUGS, 'tradera']);

type SelectedMarketplaceConnection = {
  id: string;
  name: string;
  integration: IntegrationWithConnections;
};

// --- Granular Contexts ---

export interface CategoryMapperPageData {
  integrations: IntegrationWithConnections[];
  loading: boolean;
}
const DataContext = createContext<CategoryMapperPageData | null>(null);
export const useCategoryMapperPageData = () => {
  const context = useContext(DataContext);
  if (!context)
    throw internalError('useCategoryMapperPageData must be used within CategoryMapperPageProvider');
  return context;
};

export interface CategoryMapperPageSelection {
  selectedConnectionId: string | null;
  selectedConnection: SelectedMarketplaceConnection | null;
  isSupportedConnection: boolean;
  setSelectedConnectionId: (connectionId: string) => void;
}
const SelectionContext = createContext<CategoryMapperPageSelection | null>(null);
export const useCategoryMapperPageSelection = () => {
  const context = useContext(SelectionContext);
  if (!context)
    throw internalError(
      'useCategoryMapperPageSelection must be used within CategoryMapperPageProvider'
    );
  return context;
};

type CategoryMapperPageProviderProps = {
  children: React.ReactNode;
};

export function CategoryMapperPageProvider({
  children,
}: CategoryMapperPageProviderProps): React.JSX.Element {
  const { toast } = useToast();
  const integrationsQuery = useIntegrationsWithConnections();
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

  const integrations = useMemo<IntegrationWithConnections[]>((): IntegrationWithConnections[] => {
    const data = integrationsQuery.data ?? [];
    return data.filter((integration: IntegrationWithConnections) =>
      CATEGORY_MAPPING_MARKETPLACE_SLUGS.has(integration.slug.toLowerCase())
    );
  }, [integrationsQuery.data]);

  const selectedConnectionId = useMemo((): string | null => {
    if (selectedConnectionIdOverride) {
      const exists = integrations.some((integration: IntegrationWithConnections) =>
        integration.connections.some(
          (connection: { id: string }) => connection.id === selectedConnectionIdOverride
        )
      );
      if (exists) return selectedConnectionIdOverride;
    }

    const firstConnection = integrations
      .flatMap((integration: IntegrationWithConnections) => integration.connections)
      .find((connection: { id: string }) => connection);
    return firstConnection?.id ?? null;
  }, [integrations, selectedConnectionIdOverride]);

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

  const isSupportedConnection = useMemo((): boolean => {
    if (!selectedConnection) return false;
    const slug = selectedConnection.integration.slug.toLowerCase();
    return CATEGORY_MAPPING_MARKETPLACE_SLUGS.has(slug);
  }, [selectedConnection]);

  const setSelectedConnectionId = useCallback((connectionId: string): void => {
    setSelectedConnectionIdOverride(connectionId);
  }, []);

  const dataValue = useMemo<CategoryMapperPageData>(
    () => ({
      integrations,
      loading: integrationsQuery.isLoading,
    }),
    [integrations, integrationsQuery.isLoading]
  );

  const selectionValue = useMemo<CategoryMapperPageSelection>(
    () => ({
      selectedConnectionId,
      selectedConnection,
      isSupportedConnection,
      setSelectedConnectionId,
    }),
    [selectedConnectionId, selectedConnection, isSupportedConnection, setSelectedConnectionId]
  );

  return (
    <DataContext.Provider value={dataValue}>
      <SelectionContext.Provider value={selectionValue}>{children}</SelectionContext.Provider>
    </DataContext.Provider>
  );
}
