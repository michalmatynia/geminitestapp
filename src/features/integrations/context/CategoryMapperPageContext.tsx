'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useIntegrationsWithConnections } from '@/features/integrations/hooks/useIntegrationQueries';
import type { IntegrationWithConnections } from '@/features/integrations/types/listings';
import { internalError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';

const BASE_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com']);

type SelectedMarketplaceConnection = {
  id: string;
  name: string;
  integration: IntegrationWithConnections;
};

type CategoryMapperPageContextType = {
  integrations: IntegrationWithConnections[];
  loading: boolean;
  selectedConnectionId: string | null;
  selectedConnection: SelectedMarketplaceConnection | null;
  isBaseConnection: boolean;
  setSelectedConnectionId: (connectionId: string) => void;
};

const CategoryMapperPageContext = createContext<CategoryMapperPageContextType | null>(null);

export function useCategoryMapperPageContext(): CategoryMapperPageContextType {
  const context = useContext(CategoryMapperPageContext);
  if (!context) {
    throw internalError(
      'useCategoryMapperPageContext must be used within CategoryMapperPageProvider'
    );
  }
  return context;
}

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
    const data = (integrationsQuery.data ?? []) as any[];
    return data.filter((integration: IntegrationWithConnections) =>
      BASE_MARKETPLACE_SLUGS.has(integration.slug.toLowerCase())
    );
  }, [integrationsQuery.data]);

  const selectedConnectionId = useMemo((): string | null => {
    if (selectedConnectionIdOverride) {
      const exists = integrations.some((integration: IntegrationWithConnections) =>
        integration.connections.some((connection: { id: string }) => connection.id === selectedConnectionIdOverride)
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
    return allConnections.find((connection: { id: string }) => connection.id === selectedConnectionId) ?? null;
  }, [integrations, selectedConnectionId]);

  const isBaseConnection = useMemo((): boolean => {
    if (!selectedConnection) return false;
    const slug = selectedConnection.integration.slug.toLowerCase();
    return BASE_MARKETPLACE_SLUGS.has(slug);
  }, [selectedConnection]);

  const setSelectedConnectionId = useCallback((connectionId: string): void => {
    setSelectedConnectionIdOverride(connectionId);
  }, []);

  const value = useMemo<CategoryMapperPageContextType>(
    () => ({
      integrations,
      loading: integrationsQuery.isLoading,
      selectedConnectionId,
      selectedConnection,
      isBaseConnection,
      setSelectedConnectionId,
    }),
    [
      integrations,
      integrationsQuery.isLoading,
      selectedConnectionId,
      selectedConnection,
      isBaseConnection,
      setSelectedConnectionId,
    ]
  );

  return (
    <CategoryMapperPageContext.Provider value={value}>
      {children}
    </CategoryMapperPageContext.Provider>
  );
}
