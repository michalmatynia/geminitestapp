'use client';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';

import { ApiConsole, type ApiPreset } from './ApiConsole';

export function BaseApiConsole(): React.JSX.Element {
  const {
    connections,
    baseApiMethod,
    setBaseApiMethod,
    baseApiParams,
    setBaseApiParams,
    baseApiLoading,
    baseApiError,
    baseApiResponse,
    handleBaseApiRequest,
  } = useIntegrationsContext();

  const activeConnection = connections[0] || null;
  const defaultInventoryId = activeConnection?.baseLastInventoryId ?? '';
  
  const baseApiPresets: ApiPreset[] = [
    { label: 'Inventories', method: 'getInventories', params: {} },
    {
      label: 'Products List',
      method: 'getInventoryProductsList',
      params: { inventory_id: defaultInventoryId, limit: 10 },
    },
    {
      label: 'Inventory Products',
      method: 'getInventoryProductsList',
      params: { inventory_id: defaultInventoryId },
    },
    {
      label: 'Detailed Product',
      method: 'getInventoryProductDetailed',
      params: { inventory_id: defaultInventoryId, product_id: '' },
    },
    { label: 'Orders', method: 'getOrders', params: { get_unconfirmed_orders: 1, limit: 10 } },
    { label: 'Order Statuses', method: 'getOrderStatusList', params: {} },
    { label: 'Orders Log', method: 'getOrdersLog', params: { limit: 10 } },
  ];

  return (
    <ApiConsole
      title="Base.com API Console"
      description="Send Base.com API requests using the active connection token."
      presets={baseApiPresets}
      method={baseApiMethod}
      setMethod={setBaseApiMethod}
      bodyOrParams={baseApiParams}
      setBodyOrParams={setBaseApiParams}
      bodyOrParamsLabel="Parameters (JSON)"
      loading={baseApiLoading}
      error={baseApiError}
      response={baseApiResponse}
      onRequest={() => { void handleBaseApiRequest(); }}
      baseUrl="https://api.baselinker.com/connector.php"
      methodType="input"
    />
  );
}
