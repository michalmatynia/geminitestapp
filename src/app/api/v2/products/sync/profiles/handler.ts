import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import {
  createProductSyncProfile,
  listProductSyncProfiles,
} from '@/features/product-sync/public/services/product-sync-repository';
import type {
  ProductSyncProfileCreatePayload,
  ProductSyncProfilesResponse,
} from '@/shared/contracts/product-sync';
import { productSyncProfileCreatePayloadSchema } from '@/shared/contracts/product-sync';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
export const createProfileSchema = productSyncProfileCreatePayloadSchema;

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const profiles = await listProductSyncProfiles();
  const response: ProductSyncProfilesResponse = { profiles };
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductSyncProfileCreatePayload;
  const profile = await createProductSyncProfile({
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    connectionId: body.connectionId,
    inventoryId: body.inventoryId,
    ...(body.catalogId !== undefined ? { catalogId: body.catalogId } : {}),
    ...(body.scheduleIntervalMinutes !== undefined
      ? { scheduleIntervalMinutes: body.scheduleIntervalMinutes }
      : {}),
    ...(body.batchSize !== undefined ? { batchSize: body.batchSize } : {}),
    ...(body.fieldRules !== undefined
      ? {
        fieldRules: body.fieldRules.map((rule) => ({
          id: rule.id ?? randomUUID(),
          appField: rule.appField,
          baseField: rule.baseField,
          direction: rule.direction,
        })),
      }
      : {}),
    ...(body.conflictPolicy !== undefined ? { conflictPolicy: body.conflictPolicy } : {}),
  });

  return NextResponse.json(profile, {
    status: 201,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
