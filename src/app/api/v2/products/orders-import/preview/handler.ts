import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { callBaseApi, getIntegrationRepository, resolveBaseConnectionToken } from '@/features/integrations/server';
import { getProductOrdersImportRepository } from '@/features/products/server';
import {
  filterNormalizedBaseOrders,
  normalizeBaseOrderStatuses,
  normalizeBaseOrders,
} from '@/features/products/services/product-orders-import-normalization';
import {
  baseOrderImportPreviewPayloadSchema,
  type BaseOrderImportPreviewItem,
  type BaseOrderImportPreviousSnapshot,
  type BaseOrderImportPreviewResponse,
} from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export { baseOrderImportPreviewPayloadSchema as previewOrdersImportSchema };

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const resolveBaseConnectionTokenForImport = async (connectionId: string): Promise<string> => {
  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration) =>
    BASE_INTEGRATION_SLUGS.has((integration.slug ?? '').trim().toLowerCase())
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
  if (!tokenResolution.token) {
    throw badRequestError(
      tokenResolution.error ??
        'Base.com API token is required. Password token fallback is disabled.'
    );
  }

  return tokenResolution.token;
};

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof baseOrderImportPreviewPayloadSchema>;
  const token = await resolveBaseConnectionTokenForImport(data.connectionId);
  const remoteLimit = Math.min(Math.max(data.limit * 4, data.limit), 250);
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
  const filteredOrders = filterNormalizedBaseOrders(normalizedOrders, data);
  const repository = await getProductOrdersImportRepository();
  const existingRecords = await repository.findByConnectionAndBaseOrderIds(
    data.connectionId,
    filteredOrders.map((order) => order.baseOrderId)
  );
  const existingByOrderId = new Map(existingRecords.map((record) => [record.baseOrderId, record] as const));

  const toPreviousImportSnapshot = (
    record: (typeof existingRecords)[number]
  ): BaseOrderImportPreviousSnapshot => ({
    orderNumber: record.orderNumber ?? null,
    externalStatusId: record.externalStatusId ?? null,
    externalStatusName: record.externalStatusName ?? null,
    buyerName: record.buyerName,
    buyerEmail: record.buyerEmail ?? null,
    currency: record.currency ?? null,
    totalGross: record.totalGross ?? null,
    deliveryMethod: record.deliveryMethod ?? null,
    paymentMethod: record.paymentMethod ?? null,
    source: record.source ?? null,
    orderCreatedAt: record.orderCreatedAt ?? null,
    orderUpdatedAt: record.orderUpdatedAt ?? null,
    lineItems: record.lineItems,
    lastImportedAt: record.lastImportedAt,
  });

  const orders: BaseOrderImportPreviewItem[] = filteredOrders.map<BaseOrderImportPreviewItem>((order) => {
    const existing = existingByOrderId.get(order.baseOrderId);
    if (!existing) {
      return order;
    }

    const nextOrder: BaseOrderImportPreviewItem = {
      ...order,
      importState: existing.fingerprint === order.fingerprint ? 'imported' : 'changed',
      lastImportedAt: existing.lastImportedAt ?? null,
      previousImport: toPreviousImportSnapshot(existing),
    };
    return nextOrder;
  });

  const response: BaseOrderImportPreviewResponse = {
    orders,
    stats: {
      total: orders.length,
      newCount: orders.filter((order) => order.importState === 'new').length,
      importedCount: orders.filter((order) => order.importState === 'imported').length,
      changedCount: orders.filter((order) => order.importState === 'changed').length,
    },
  };

  return NextResponse.json(response);
}
