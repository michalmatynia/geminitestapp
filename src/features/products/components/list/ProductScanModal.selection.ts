import { useMemo } from 'react';

import type { ProductWithImages } from '@/shared/contracts/products/product';

import { resolve1688PostureWarnings } from './ProductScanModal.helpers';
import type {
  ProductScanModal1688Connection,
  ProductScanModalProvider,
  ProductScanModalSelectedProduct,
} from './ProductScanModal.types';

type IntegrationWithConnections = {
  slug?: string;
  connections?: ProductScanModal1688Connection[];
};

type SelectedProductsModel = {
  selectedProducts: ProductScanModalSelectedProduct[];
  selectedProductIdsKey: string;
};

export type ProductScan1688ConnectionModel = {
  active1688Connection: ProductScanModal1688Connection | null;
  active1688ConnectionId: string | null;
  active1688ConnectionName: string | null;
  active1688IntegrationId: string | null;
  active1688PostureWarnings: string[];
  active1688ProfileName: string | null;
  hasResolved1688Session: boolean;
  is1688ConnectionBootstrapPending: boolean;
  resolved1688ConnectionId: string | null;
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return trimmed;
};

const buildProductNamesById = (products: ProductWithImages[]): Map<string, string> => {
  const names = new Map<string, string>();
  for (const product of products) {
    const name =
      normalizeText(product.name_en) ??
      normalizeText(product.name_pl) ??
      normalizeText(product.name_de) ??
      normalizeText(product.sku) ??
      product.id;
    names.set(product.id, name);
  }
  return names;
};

const buildSelectedProducts = (
  productIds: string[],
  productNamesById: Map<string, string>
): ProductScanModalSelectedProduct[] =>
  Array.from(
    new Set(productIds.map((productId) => productId.trim()).filter((productId) => productId.length > 0))
  ).map((productId) => ({
      productId,
      productName: productNamesById.get(productId) ?? productId,
    }));

const buildSelectedProductIdsKey = (
  selectedProducts: ProductScanModalSelectedProduct[]
): string => selectedProducts.map((entry) => entry.productId).slice().sort().join('\u0000');

export const useSelectedProductEntries = (
  productIds: string[],
  products: ProductWithImages[]
): SelectedProductsModel => {
  const productNamesById = useMemo(() => buildProductNamesById(products), [products]);
  const selectedProducts = useMemo(
    () => buildSelectedProducts(productIds, productNamesById),
    [productIds, productNamesById]
  );
  const selectedProductIdsKey = useMemo(
    () => buildSelectedProductIdsKey(selectedProducts),
    [selectedProducts]
  );
  return { selectedProducts, selectedProductIdsKey };
};

export const useProductScanConnectionNames = (
  integrationConnections: IntegrationWithConnections[]
): Map<string, string> =>
  useMemo((): Map<string, string> => {
    const names = new Map<string, string>();
    for (const integration of integrationConnections) {
      for (const connection of integration.connections ?? []) {
        const connectionId = normalizeText(connection.id);
        const connectionName = normalizeText(connection.name);
        if (connectionId === null || connectionName === null || names.has(connectionId)) continue;
        names.set(connectionId, connectionName);
      }
    }
    return names;
  }, [integrationConnections]);

const resolve1688Connections = (
  integrationConnections: IntegrationWithConnections[]
): ProductScanModal1688Connection[] => {
  const integration = integrationConnections.find((entry) => entry.slug === '1688');
  return integration?.connections ?? [];
};

const resolve1688ConnectionId = (input: {
  provider: ProductScanModalProvider;
  defaultConnectionId: string | null | undefined;
  scanner1688Connections: ProductScanModal1688Connection[];
}): string | null => {
  if (input.provider !== '1688') return null;
  const preferredConnectionId = normalizeText(input.defaultConnectionId);
  if (
    preferredConnectionId !== null &&
    input.scanner1688Connections.some((connection) => connection.id === preferredConnectionId)
  ) {
    return preferredConnectionId;
  }
  return input.scanner1688Connections[0]?.id ?? null;
};

const resolveActive1688Connection = (
  scanner1688Connections: ProductScanModal1688Connection[],
  resolved1688ConnectionId: string | null
): ProductScanModal1688Connection | null => {
  if (resolved1688ConnectionId === null) return null;
  return scanner1688Connections.find((connection) => connection.id === resolved1688ConnectionId) ?? null;
};

const hasStoredOrRefreshedSession = (
  connection: ProductScanModal1688Connection | null,
  refreshedConnectionIds: Set<string>
): boolean => {
  const connectionId = normalizeText(connection?.id);
  if (connection?.hasPlaywrightStorageState === true) return true;
  return connectionId !== null && refreshedConnectionIds.has(connectionId);
};

const resolveHasResolved1688Session = (input: {
  active1688Connection: ProductScanModal1688Connection | null;
  provider: ProductScanModalProvider;
  refreshedConnectionIds: Set<string>;
}): boolean => {
  if (input.provider !== '1688') return false;
  return hasStoredOrRefreshedSession(input.active1688Connection, input.refreshedConnectionIds);
};

const resolve1688BootstrapPending = (input: {
  isConnectionsLoading: boolean;
  isDefaultConnectionLoading: boolean;
  provider: ProductScanModalProvider;
}): boolean => {
  if (input.provider !== '1688') return false;
  return input.isConnectionsLoading || input.isDefaultConnectionLoading;
};

export const useProductScan1688ConnectionModel = (input: {
  provider: ProductScanModalProvider;
  integrationConnections: IntegrationWithConnections[];
  defaultConnectionId: string | null | undefined;
  refreshedConnectionIds: Set<string>;
  isConnectionsLoading: boolean;
  isDefaultConnectionLoading: boolean;
}): ProductScan1688ConnectionModel => {
  const scanner1688Connections = useMemo(
    () => resolve1688Connections(input.integrationConnections),
    [input.integrationConnections]
  );
  const resolved1688ConnectionId = useMemo(
    () => resolve1688ConnectionId({ ...input, scanner1688Connections }),
    [input.defaultConnectionId, input.provider, scanner1688Connections]
  );
  const active1688Connection = useMemo(
    () => resolveActive1688Connection(scanner1688Connections, resolved1688ConnectionId),
    [resolved1688ConnectionId, scanner1688Connections]
  );
  const active1688ConnectionName = active1688Connection?.name ?? null;
  const active1688ConnectionId = normalizeText(active1688Connection?.id);
  const active1688IntegrationId = normalizeText(active1688Connection?.integrationId);
  const active1688ProfileName = normalizeText(active1688Connection?.name) ?? active1688ConnectionName;
  const active1688PostureWarnings = useMemo(
    () => resolve1688PostureWarnings(active1688Connection),
    [active1688Connection]
  );

  return {
    active1688Connection,
    active1688ConnectionId,
    active1688ConnectionName,
    active1688IntegrationId,
    active1688PostureWarnings,
    active1688ProfileName,
    hasResolved1688Session: resolveHasResolved1688Session({
      active1688Connection,
      provider: input.provider,
      refreshedConnectionIds: input.refreshedConnectionIds,
    }),
    is1688ConnectionBootstrapPending: resolve1688BootstrapPending(input),
    resolved1688ConnectionId,
  };
};
