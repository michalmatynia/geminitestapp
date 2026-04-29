import 'server-only';

import { callBaseApi, getIntegrationRepository, resolveBaseConnectionToken } from '@/features/integrations/server';
import { getProductOrdersImportRepository } from '@/features/products/server';
import {
  filterNormalizedBaseOrders,
  normalizeBaseOrderStatuses,
  normalizeBaseOrders,
} from '@/features/products/services/product-orders-import-normalization';
import type { BaseOrderImportPreviewItem, BaseOrderImportPreviousSnapshot, BaseOrderImportPreviewPayload, BaseOrderImportPreviewResponse } from '@/shared/contracts/products/orders-import';
import { badRequestError } from '@/shared/errors/app-error';

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

type BaseOrderPreviousImportSnapshotSource = Pick<
  BaseOrderImportPreviewItem,
  | 'buyerEmail'
  | 'buyerName'
  | 'currency'
  | 'deliveryMethod'
  | 'externalStatusId'
  | 'externalStatusName'
  | 'lineItems'
  | 'orderCreatedAt'
  | 'orderNumber'
  | 'orderUpdatedAt'
  | 'paymentMethod'
  | 'source'
  | 'totalGross'
>;

const nullable = <T>(value: T | null | undefined): T | null => value ?? null;

const buildPreviousImportSnapshot = (
  source: BaseOrderPreviousImportSnapshotSource,
  lastImportedAt: string
): BaseOrderImportPreviousSnapshot => ({
  orderNumber: nullable(source.orderNumber),
  externalStatusId: nullable(source.externalStatusId),
  externalStatusName: nullable(source.externalStatusName),
  buyerName: source.buyerName,
  buyerEmail: nullable(source.buyerEmail),
  currency: nullable(source.currency),
  totalGross: nullable(source.totalGross),
  deliveryMethod: nullable(source.deliveryMethod),
  paymentMethod: nullable(source.paymentMethod),
  source: nullable(source.source),
  orderCreatedAt: nullable(source.orderCreatedAt),
  orderUpdatedAt: nullable(source.orderUpdatedAt),
  lineItems: source.lineItems,
  lastImportedAt,
});

const buildOrderImportPreviewStats = (
  orders: readonly BaseOrderImportPreviewItem[]
): BaseOrderImportPreviewResponse['stats'] => ({
  total: orders.length,
  newCount: orders.filter((order) => order.importState === 'new').length,
  importedCount: orders.filter((order) => order.importState === 'imported').length,
  changedCount: orders.filter((order) => order.importState === 'changed').length,
});

export const buildBaseOrderPreviousImportSnapshot = (
  order: BaseOrderImportPreviewItem,
  syncedAt: string
): BaseOrderImportPreviousSnapshot => buildPreviousImportSnapshot(order, syncedAt);

const resolveBaseConnectionTokenForImport = async (connectionId: string): Promise<string> => {
  const integrationRepo = getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration) =>
    BASE_INTEGRATION_SLUGS.has(integration.slug.trim().toLowerCase())
  );
  if (!baseIntegration) {
    throw badRequestError('Base.com integration is not configured.');
  }

  const connection = await integrationRepo.getConnectionByIdAndIntegration(connectionId, baseIntegration.id);
  if (!connection) {
    throw badRequestError('Selected Base.com connection was not found.');
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  const token = tokenResolution.token;
  if (token === null || token.length === 0) {
    throw badRequestError(
      tokenResolution.error ??
        'Base.com API token is required. Password token fallback is disabled.'
    );
  }

  return token;
};

export const loadBaseOrderImportPreview = async (
  payload: BaseOrderImportPreviewPayload
): Promise<BaseOrderImportPreviewResponse> => {
  const token = await resolveBaseConnectionTokenForImport(payload.connectionId);
  const remoteLimit = Math.min(Math.max(payload.limit * 4, payload.limit), 250);
  const ordersPayload = await callBaseApi(token, 'getOrders', {
    get_unconfirmed_orders: 1,
    limit: remoteLimit,
  });

  let statusesPayload: unknown = null;
  try {
    statusesPayload = await callBaseApi(token, 'getOrderStatusList');
  } catch {
    statusesPayload = null;
  }

  const statuses = normalizeBaseOrderStatuses(statusesPayload);
  const statusNameById = new Map(statuses.map((status) => [status.id, status.name] as const));
  const normalizedOrders = normalizeBaseOrders(ordersPayload, statusNameById);
  const filteredOrders = filterNormalizedBaseOrders(normalizedOrders, payload);
  const repository = await getProductOrdersImportRepository();
  const existingRecords = await repository.findByConnectionAndBaseOrderIds(
    payload.connectionId,
    filteredOrders.map((order) => order.baseOrderId)
  );
  const existingByOrderId = new Map(existingRecords.map((record) => [record.baseOrderId, record] as const));

  const orders: BaseOrderImportPreviewItem[] = filteredOrders.map<BaseOrderImportPreviewItem>((order) => {
    const existing = existingByOrderId.get(order.baseOrderId);
    if (existing === undefined) {
      return order;
    }

    return {
      ...order,
      importState: existing.fingerprint === order.fingerprint ? 'imported' : 'changed',
      lastImportedAt: existing.lastImportedAt,
      previousImport: buildPreviousImportSnapshot(existing, existing.lastImportedAt),
    };
  });

  return {
    orders,
    stats: buildOrderImportPreviewStats(orders),
  };
};

export const markPreviewOrdersAsImported = (
  preview: BaseOrderImportPreviewResponse,
  syncedAt: string,
  importedOrderIds: string[]
): BaseOrderImportPreviewResponse => {
  const importedIds = new Set(importedOrderIds);
  const orders = preview.orders.map((order) =>
    importedIds.has(order.baseOrderId)
      ? {
          ...order,
          importState: 'imported' as const,
          lastImportedAt: syncedAt,
          previousImport: buildBaseOrderPreviousImportSnapshot(order, syncedAt),
        }
      : order
  );

  return {
    orders,
    stats: buildOrderImportPreviewStats(orders),
  };
};
