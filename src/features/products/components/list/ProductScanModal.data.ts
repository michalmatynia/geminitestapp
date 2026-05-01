import {
  useDefault1688Connection,
  useIntegrationsWithConnections,
} from '@/features/integrations/hooks/useIntegrationQueries';
import { useAmazonSelectorRegistry } from '@/features/integrations/hooks/useAmazonSelectorRegistry';

import { useProductScanModalFormBindings } from './ProductScanModal.form-bindings';
import {
  useProductScan1688ConnectionModel,
  useProductScanConnectionNames,
  useSelectedProductEntries,
} from './ProductScanModal.selection';
import type { ProductScanModalProps } from './ProductScanModal.types';

type ProductScanModalDataInput = {
  amazonSelectorProfile: string;
  productIds: ProductScanModalProps['productIds'];
  products: ProductScanModalProps['products'];
  provider: NonNullable<ProductScanModalProps['provider']>;
  refreshed1688ConnectionIds: Set<string>;
};

type ProductScanModalData = ReturnType<typeof useProductScanModalFormBindings> &
  ReturnType<typeof useProductScan1688ConnectionModel> & {
    amazonSelectorRegistryQuery: ReturnType<typeof useAmazonSelectorRegistry>;
    connectionNamesById: ReturnType<typeof useProductScanConnectionNames>;
    selectedProductIdsKey: ReturnType<typeof useSelectedProductEntries>['selectedProductIdsKey'];
    selectedProducts: ReturnType<typeof useSelectedProductEntries>['selectedProducts'];
  };

export const useProductScanModalData = (
  input: ProductScanModalDataInput
): ProductScanModalData => {
  const amazonSelectorRegistryQuery = useAmazonSelectorRegistry({
    profile: input.amazonSelectorProfile,
  });
  const integrationsWithConnectionsQuery = useIntegrationsWithConnections();
  const default1688ConnectionQuery = useDefault1688Connection();
  const { productFormBindings, productSupplier1688FormBindings } =
    useProductScanModalFormBindings();
  const { selectedProducts, selectedProductIdsKey } = useSelectedProductEntries(
    input.productIds,
    input.products
  );
  const integrationConnections = integrationsWithConnectionsQuery.data ?? [];
  const connectionNamesById = useProductScanConnectionNames(integrationConnections);
  const connectionModel = useProductScan1688ConnectionModel({
    provider: input.provider,
    integrationConnections,
    defaultConnectionId: default1688ConnectionQuery.data?.connectionId,
    refreshedConnectionIds: input.refreshed1688ConnectionIds,
    isConnectionsLoading: integrationsWithConnectionsQuery.isLoading,
    isDefaultConnectionLoading: default1688ConnectionQuery.isLoading,
  });

  return {
    amazonSelectorRegistryQuery,
    connectionNamesById,
    productFormBindings,
    productSupplier1688FormBindings,
    selectedProductIdsKey,
    selectedProducts,
    ...connectionModel,
  };
};
