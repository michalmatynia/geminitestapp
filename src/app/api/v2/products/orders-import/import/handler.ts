import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getIntegrationRepository } from '@/features/integrations/server';
import { getProductOrdersImportRepository } from '@/features/products/server';
import { baseOrderImportPersistPayloadSchema } from '@/shared/contracts/products/orders-import';
import { type BaseOrderImportPersistResponse } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

export { baseOrderImportPersistPayloadSchema as importOrdersImportSchema };

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const assertBaseConnectionExists = async (connectionId: string): Promise<void> => {
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
};

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof baseOrderImportPersistPayloadSchema>;
  await assertBaseConnectionExists(data.connectionId);

  const repository = await getProductOrdersImportRepository();
  const importResult = await repository.upsertOrders(data.connectionId, data.orders);
  const response: BaseOrderImportPersistResponse = {
    importedCount: importResult.createdCount + importResult.updatedCount,
    createdCount: importResult.createdCount,
    updatedCount: importResult.updatedCount,
    syncedAt: importResult.syncedAt,
    results: importResult.results,
  };

  return NextResponse.json(response);
}
