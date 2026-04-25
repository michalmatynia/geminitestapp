import { randomUUID } from 'crypto';

import { type NextRequest, NextResponse } from 'next/server';

import {
  createProductSyncProfile,
  listProductSyncProfiles,
} from '@/features/product-sync/services/product-sync-repository';
import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
import { fetchBaseInventories } from '@/features/integrations/services/imports/base-client/inventory';
import type {
  ProductSyncProfileCreatePayload,
  ProductSyncProfilesResponse,
} from '@/shared/contracts/product-sync';
import { productSyncProfileCreatePayloadSchema } from '@/shared/contracts/product-sync';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { isBaseIntegrationSlug } from '@/shared/lib/integration-slugs';
import {
  buildProductSyncProfileCreateInput,
  buildProductSyncProfilesResponse,
  PRODUCT_SYNC_NO_STORE_HEADERS,
} from './handler.helpers';
export const createProfileSchema = productSyncProfileCreatePayloadSchema;

const toTrimmedString = (value: string | null | undefined): string => value?.trim() ?? '';

const resolveFallbackInventoryFromBaseApi = async (
  token: string
): Promise<string | null> => {
  const inventories = await fetchBaseInventories(token);
  const defaultInventory = inventories.find((inventory) => inventory.is_default) ?? inventories[0];
  const inventoryId = toTrimmedString(defaultInventory?.id);
  return inventoryId.length > 0 ? inventoryId : null;
};

const resolveProfileCreateInventoryId = async (
  body: ProductSyncProfileCreatePayload
): Promise<string> => {
  const explicitInventoryId = toTrimmedString(body.inventoryId);
  if (explicitInventoryId.length > 0) return explicitInventoryId;

  const integrationRepo = getIntegrationRepository();
  const connection = await integrationRepo.getConnectionById(body.connectionId);
  if (!connection) {
    throw badRequestError('Selected Base connection was not found.', {
      connectionId: body.connectionId,
    });
  }

  const integration = await integrationRepo.getIntegrationById(connection.integrationId);
  if (!isBaseIntegrationSlug(integration?.slug)) {
    throw badRequestError('Selected connection is not a Base.com integration.', {
      connectionId: body.connectionId,
    });
  }

  const connectionInventoryId = toTrimmedString(connection.baseLastInventoryId);
  if (connectionInventoryId.length > 0) return connectionInventoryId;

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  if (tokenResolution.token !== null) {
    const apiInventoryId = await resolveFallbackInventoryFromBaseApi(tokenResolution.token);
    if (apiInventoryId !== null) return apiInventoryId;
  }

  throw badRequestError(
    'Inventory ID is required. Set an inventory ID on the sync profile or import inventories for this Base.com connection first.',
    { connectionId: body.connectionId }
  );
};

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const profiles = await listProductSyncProfiles();
  const response: ProductSyncProfilesResponse = buildProductSyncProfilesResponse(profiles);
  return NextResponse.json(response, { headers: PRODUCT_SYNC_NO_STORE_HEADERS });
}

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductSyncProfileCreatePayload;
  const inventoryId = await resolveProfileCreateInventoryId(body);
  const profile = await createProductSyncProfile(
    buildProductSyncProfileCreateInput({ ...body, inventoryId }, randomUUID)
  );

  return NextResponse.json(profile, {
    status: 201,
    headers: PRODUCT_SYNC_NO_STORE_HEADERS,
  });
}
