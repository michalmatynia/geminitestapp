import { NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository, resolveBaseConnectionToken, callBaseApi } from '@/features/integrations/server';
import { normalizeBaseOrderStatuses } from '@/features/products/services/product-orders-import-normalization';
import { baseOrderImportStatusesPayloadSchema } from '@/shared/contracts/products/orders-import';
import { type BaseOrderImportStatusesResponse } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const resolveBaseConnection = async (connectionId: string) => {
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

  return connection;
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = baseOrderImportStatusesPayloadSchema.safeParse({
    connectionId: req.nextUrl.searchParams.get('connectionId') ?? '',
  });
  if (!parsed.success) {
    throw badRequestError('Connection is required.');
  }

  const connection = await resolveBaseConnection(parsed.data.connectionId);
  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  if (!tokenResolution.token) {
    throw badRequestError(
      tokenResolution.error ??
        'Base.com API token is required. Password token fallback is disabled.'
    );
  }

  const payload = await callBaseApi(tokenResolution.token, 'getOrderStatusList');
  const response: BaseOrderImportStatusesResponse = {
    statuses: normalizeBaseOrderStatuses(payload),
  };

  return NextResponse.json(response);
}
