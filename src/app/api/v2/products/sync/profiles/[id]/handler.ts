import { randomUUID } from 'crypto';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteProductSyncProfile,
  getProductSyncProfile,
  updateProductSyncProfile,
} from '@/features/product-sync/services/product-sync-repository';
import type {
  ProductSyncDeleteResponse,
  ProductSyncProfile,
  ProductSyncProfileUpdatePayload,
} from '@/shared/contracts/product-sync';
import { productSyncProfileUpdatePayloadSchema } from '@/shared/contracts/product-sync';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';
export const updateProfileSchema = productSyncProfileUpdatePayloadSchema;

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Sync profile id is required'),
});

const parseProfileId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data.id;
};

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const profileId = parseProfileId(params);
  const profile = await getProductSyncProfile(profileId);
  if (!profile) {
    throw notFoundError('Sync profile not found.', { profileId });
  }
  return NextResponse.json(profile, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const profileId = parseProfileId(params);
  const body = ctx.body as ProductSyncProfileUpdatePayload;
  const patch: Partial<ProductSyncProfile> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.isDefault !== undefined) patch.isDefault = body.isDefault;
  if (body.enabled !== undefined) patch.enabled = body.enabled;
  if (body.connectionId !== undefined) patch.connectionId = body.connectionId;
  if (body.inventoryId !== undefined) patch.inventoryId = body.inventoryId;
  if (body.catalogId !== undefined) patch.catalogId = body.catalogId;
  if (body.scheduleIntervalMinutes !== undefined)
    patch.scheduleIntervalMinutes = body.scheduleIntervalMinutes;
  if (body.batchSize !== undefined) patch.batchSize = body.batchSize;
  if (body.conflictPolicy !== undefined) patch.conflictPolicy = body.conflictPolicy;
  if (body.fieldRules !== undefined) {
    patch.fieldRules = body.fieldRules.map((rule) => ({
      id: rule.id ?? randomUUID(),
      appField: rule.appField,
      baseField: rule.baseField,
      direction: rule.direction,
    }));
  }

  const profile = await updateProductSyncProfile(profileId, patch);

  if (!profile) {
    throw notFoundError('Sync profile not found.', { profileId });
  }

  return NextResponse.json(profile, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const profileId = parseProfileId(params);
  const deleted = await deleteProductSyncProfile(profileId);
  if (!deleted) {
    throw notFoundError('Sync profile not found.', { profileId });
  }
  const response: ProductSyncDeleteResponse = { ok: true };
  return NextResponse.json(response);
}
