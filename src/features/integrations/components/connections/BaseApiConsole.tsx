'use client';

import { IntegrationConnection } from '@/features/integrations/types/integrations-ui';

import { ApiConsole, type ApiPreset } from './ApiConsole';

type BaseApiConsoleProps = {
  activeConnection: IntegrationConnection | null;
  method: string;
  setMethod: (value: string) => void;
  params: string;
  setParams: (value: string) => void;
  loading: boolean;
  error: string | null;
  response: { data: unknown } | null;
  onRequest: () => void;
};

export function BaseApiConsole({
  activeConnection,
  method,
  setMethod,
  params,
  setParams,
  loading,
  error,
  response,
  onRequest,
}: BaseApiConsoleProps): React.JSX.Element {
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
      method={method}
      setMethod={setMethod}
      bodyOrParams={params}
      setBodyOrParams={setParams}
      bodyOrParamsLabel="Parameters (JSON)"
      loading={loading}
      error={error}
      response={response}
      onRequest={onRequest}
      baseUrl="https://api.baselinker.com/connector.php"
      methodType="input"
    />
  );
}
