export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createProductSyncProfile,
  listProductSyncProfiles,
} from '@/features/product-sync/services/product-sync-repository';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

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

const createProfileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  connectionId: z.string().trim().min(1),
  inventoryId: z.string().trim().min(1),
  catalogId: z.string().trim().nullable().optional(),
  scheduleIntervalMinutes: z.number().int().min(1).max(24 * 60).optional(),
  batchSize: z.number().int().min(1).max(500).optional(),
  conflictPolicy: z.enum(['skip']).optional(),
  fieldRules: z.array(fieldRuleSchema).optional(),
});

async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const profiles = await listProductSyncProfiles();
  return NextResponse.json({ profiles }, { headers: { 'Cache-Control': 'no-store' } });
}

async function POST_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof createProfileSchema>;
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
    ...(body.conflictPolicy !== undefined
      ? { conflictPolicy: body.conflictPolicy }
      : {}),
  });

  return NextResponse.json(profile, {
    status: 201,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export const GET = apiHandler(GET_handler, {
  source: 'products.sync.profiles.GET',
  requireCsrf: false,
  cacheControl: 'no-store',
});

export const POST = apiHandler(POST_handler, {
  source: 'products.sync.profiles.POST',
  parseJsonBody: true,
  bodySchema: createProfileSchema,
});
