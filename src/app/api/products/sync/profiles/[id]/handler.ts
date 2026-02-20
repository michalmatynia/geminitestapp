import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteProductSyncProfile,
  getProductSyncProfile,
  updateProductSyncProfile,
} from '@/features/product-sync/services/product-sync-repository';
import type { ProductSyncProfile } from '@/features/product-sync/types/product-sync';
import { notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const fieldRuleSchema = z.object({
  id: z.string().trim().min(1).optional(),
  appField: z.enum([
    'stock',
    'price',
    'name_en',
    'description_en',
    'sku',
    'ean',
    'weight',
  ]),
  baseField: z.string().trim().min(1),
  direction: z.enum(['disabled', 'base_to_app', 'app_to_base']),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  connectionId: z.string().trim().min(1).optional(),
  inventoryId: z.string().trim().min(1).optional(),
  catalogId: z.string().trim().nullable().optional(),
  scheduleIntervalMinutes: z.number().int().min(1).max(24 * 60).optional(),
  batchSize: z.number().int().min(1).max(500).optional(),
  conflictPolicy: z.enum(['skip']).optional(),
  fieldRules: z.array(fieldRuleSchema).optional(),
});

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const profile = await getProductSyncProfile(params.id);
  if (!profile) {
    throw notFoundError('Sync profile not found.', { profileId: params.id });
  }
  return NextResponse.json(profile, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const body = ctx.body as z.infer<typeof updateProfileSchema>;
  const patch: Partial<ProductSyncProfile> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.enabled !== undefined) patch.enabled = body.enabled;
  if (body.connectionId !== undefined) patch.connectionId = body.connectionId;
  if (body.inventoryId !== undefined) patch.inventoryId = body.inventoryId;
  if (body.catalogId !== undefined) patch.catalogId = body.catalogId;
  if (body.scheduleIntervalMinutes !== undefined) patch.scheduleIntervalMinutes = body.scheduleIntervalMinutes;
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

  const profile = await updateProductSyncProfile(params.id, patch);

  if (!profile) {
    throw notFoundError('Sync profile not found.', { profileId: params.id });
  }

  return NextResponse.json(profile, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const deleted = await deleteProductSyncProfile(params.id);
  if (!deleted) {
    throw notFoundError('Sync profile not found.', { profileId: params.id });
  }
  return NextResponse.json({ ok: true });
}
