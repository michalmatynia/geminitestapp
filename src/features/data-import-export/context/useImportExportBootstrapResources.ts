'use client';

import { useEffect, useMemo, type MutableRefObject } from 'react';

import { useCatalogs } from '@/features/data-import-export/hooks/useImportQueries';
import type { CatalogOption } from '@/shared/contracts/integrations/import-export';
import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import { useIntegrationsWithConnections } from '@/shared/hooks/useIntegrationQueries';

interface ImportExportBootstrapResourcesParams {
  catalogId: string;
  hasInitializedCatalog: MutableRefObject<boolean>;
  selectedBaseConnectionId: string;
  setBaseConnections: (connections: IntegrationConnectionBasic[]) => void;
  setCatalogId: (id: string) => void;
  setIsBaseConnected: (connected: boolean) => void;
  setSelectedBaseConnectionId: (id: string) => void;
}

interface ImportExportBootstrapResourcesResult {
  baseConnections: IntegrationConnectionBasic[];
  catalogsData: CatalogOption[];
  checkingIntegration: boolean;
  integrationsWithConnections: IntegrationWithConnections[];
  isBaseConnected: boolean;
  loadingCatalogs: boolean;
}

export function useImportExportBootstrapResources({
  catalogId,
  hasInitializedCatalog,
  selectedBaseConnectionId,
  setBaseConnections,
  setCatalogId,
  setIsBaseConnected,
  setSelectedBaseConnectionId,
}: ImportExportBootstrapResourcesParams): ImportExportBootstrapResourcesResult {
  const { data: integrationsWithConnectionsData, isLoading: checkingIntegration } =
    useIntegrationsWithConnections();
  const integrationsWithConnections = useMemo(
    (): IntegrationWithConnections[] =>
      Array.isArray(integrationsWithConnectionsData) ? integrationsWithConnectionsData : [],
    [integrationsWithConnectionsData]
  );

  const [baseConnections, isBaseConnected] = useMemo(
    (): [IntegrationConnectionBasic[], boolean] => {
      const baseIntegration = integrationsWithConnections.find(
        (integration: IntegrationWithConnections): boolean =>
          ['baselinker', 'base-com', 'base'].includes(
            (integration.slug ?? '').trim().toLowerCase()
          )
      );
      const connections = baseIntegration?.connections ?? [];
      return [connections, connections.length > 0];
    },
    [integrationsWithConnections]
  );

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    timer = setTimeout(() => {
      setBaseConnections(baseConnections);
      setIsBaseConnected(isBaseConnected);
      if (baseConnections.length === 0) {
        setSelectedBaseConnectionId('');
        return;
      }
      const hasSelected = baseConnections.some(
        (connection: IntegrationConnectionBasic) => connection.id === selectedBaseConnectionId
      );
      if (!selectedBaseConnectionId || !hasSelected) {
        setSelectedBaseConnectionId(baseConnections[0]?.id || '');
      }
    }, 0);
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [
    baseConnections,
    isBaseConnected,
    selectedBaseConnectionId,
    setBaseConnections,
    setIsBaseConnected,
    setSelectedBaseConnectionId,
  ]);

  const catalogsQuery = useCatalogs();
  const catalogsData = useMemo<CatalogOption[]>(
    () => catalogsQuery.data || [],
    [catalogsQuery.data]
  );
  const loadingCatalogs = catalogsQuery.isLoading;

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (catalogsData.length > 0 && !catalogId) {
      const defaultCatalog = catalogsData.find((catalog: CatalogOption) => catalog.isDefault);
      const fallbackCatalog = defaultCatalog ?? catalogsData[0];
      if (fallbackCatalog) {
        timer = setTimeout(() => {
          setCatalogId(fallbackCatalog.id);
          hasInitializedCatalog.current = true;
        }, 0);
      }
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [catalogId, catalogsData, hasInitializedCatalog, setCatalogId]);

  return {
    baseConnections,
    catalogsData,
    checkingIntegration,
    integrationsWithConnections,
    isBaseConnected,
    loadingCatalogs,
  };
}
