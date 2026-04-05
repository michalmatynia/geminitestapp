import { BaseInventory, BaseWarehouse } from '@/shared/contracts/integrations/base-com';
import { isAppError } from '@/shared/errors/app-error';

import { callBaseApi, callBaseApiRaw, BaseApiRawResult } from './core';
import { extractInventoryList, extractWarehouseList } from '../base-client-parsers';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const isUnknownMethodError = (error: unknown): boolean =>
  isAppError(error) && error.meta?.['errorCode'] === 'ERROR_UNKNOWN_METHOD';

export async function fetchBaseInventories(token: string): Promise<BaseInventory[]> {
  const methods = ['getInventories', 'getInventory', 'getInventoryList'];
  let lastError: Error | null = null;
  for (const method of methods) {
    try {
      const payload = await callBaseApi(token, method);
      const inventories = extractInventoryList(payload);
      if (inventories.length > 0) {
        return inventories;
      }
    } catch (error: unknown) {
      logClientError(error);
      const resolvedError = error instanceof Error ? error : new Error('Base API error.');
      if (isAppError(error) && error.expected && !isUnknownMethodError(error)) {
        throw resolvedError;
      }
      if (!isUnknownMethodError(error) || lastError === null) {
        lastError = resolvedError;
      }
    }
  }
  if (lastError) {
    throw lastError;
  }
  return [];
}

export async function fetchBaseInventoriesDebug(token: string): Promise<
  BaseApiRawResult & {
    inventories: BaseInventory[];
    method: string;
    parameters: Record<string, unknown>;
  }
> {
  const methods = ['getInventories', 'getInventory', 'getInventoryList'];
  let lastResult: BaseApiRawResult | null = null;
  for (const method of methods) {
    const result = await callBaseApiRaw(token, method);
    lastResult = result;
    const inventories = result.payload ? extractInventoryList(result.payload) : [];
    if (inventories.length > 0) {
      return {
        ...result,
        method,
        parameters: {},
        inventories,
      };
    }
  }
  return {
    ...(lastResult ?? {
      ok: false,
      statusCode: 500,
      payload: null,
      error: 'No inventory response.',
    }),
    method: methods[0] as string,
    parameters: {},
    inventories: [],
  };
}

export async function fetchBaseWarehouses(
  token: string,
  inventoryId: string
): Promise<BaseWarehouse[]> {
  const methods = ['getInventoryWarehouses'];
  let lastError: Error | null = null;
  for (const method of methods) {
    try {
      const payload = await callBaseApi(token, method, {
        inventory_id: inventoryId,
      });
      const warehouses = extractWarehouseList(payload);
      if (warehouses.length > 0) {
        return warehouses;
      }
    } catch (error: unknown) {
      logClientError(error);
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }
  if (lastError) {
    throw lastError;
  }
  return [];
}

export async function fetchBaseWarehousesDebug(
  token: string,
  inventoryId: string
): Promise<
  BaseApiRawResult & {
    warehouses: BaseWarehouse[];
    method: string;
    parameters: Record<string, unknown>;
  }
> {
  const method = 'getInventoryWarehouses';
  const parameters = { inventory_id: inventoryId };
  const result = await callBaseApiRaw(token, method, parameters);
  const warehouses = result.payload ? extractWarehouseList(result.payload) : [];
  return {
    ...result,
    method,
    parameters,
    warehouses,
  };
}

export async function fetchBaseAllWarehouses(token: string): Promise<BaseWarehouse[]> {
  const methods = ['getWarehouses'];
  let lastError: Error | null = null;
  for (const method of methods) {
    try {
      const payload = await callBaseApi(token, method);
      const warehouses = extractWarehouseList(payload);
      if (warehouses.length > 0) {
        return warehouses;
      }
    } catch (error: unknown) {
      logClientError(error);
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }
  if (lastError) {
    throw lastError;
  }
  return [];
}

export async function fetchBaseAllWarehousesDebug(token: string): Promise<
  BaseApiRawResult & {
    warehouses: BaseWarehouse[];
    method: string;
    parameters: Record<string, unknown>;
  }
> {
  const method = 'getWarehouses';
  const parameters = {};
  const result = await callBaseApiRaw(token, method, parameters);
  const warehouses = result.payload ? extractWarehouseList(result.payload) : [];
  return {
    ...result,
    method,
    parameters,
    warehouses,
  };
}
