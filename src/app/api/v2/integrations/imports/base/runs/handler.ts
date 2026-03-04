import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listBaseImportRuns } from '@/features/integrations/services/imports/base-import-run-repository';
import { startBaseImportRunResponse } from '@/features/integrations/services/imports/base-import-run-starter';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export const startRunSchema = z.object({
  connectionId: z.string().trim().min(1),
  inventoryId: z.string().trim().min(1),
  catalogId: z.string().trim().min(1),
  templateId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().optional(),
  imageMode: z.enum(['links', 'download']).default('links'),
  uniqueOnly: z.boolean().default(true),
  allowDuplicateSku: z.boolean().default(false),
  selectedIds: z.array(z.string().trim().min(1)).optional(),
  dryRun: z.boolean().optional(),
  mode: z.enum(['create_only', 'upsert_on_base_id', 'upsert_on_sku']).optional(),
  requestId: z.string().trim().min(1).optional(),
});

export const listRunsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = (ctx.query ?? {}) as z.infer<typeof listRunsQuerySchema>;
  const runs = await listBaseImportRuns(query.limit ?? 25);
  return NextResponse.json(
    { runs },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const rawConnectionId =
    typeof (ctx.body as Record<string, unknown> | undefined)?.['connectionId'] === 'string'
      ? String((ctx.body as Record<string, unknown>)['connectionId']).trim()
      : '';
  if (!rawConnectionId) {
    throw badRequestError('Base.com connection is required.');
  }

  const data = ctx.body as z.infer<typeof startRunSchema>;
  const response = await startBaseImportRunResponse({
    connectionId: rawConnectionId,
    inventoryId: data.inventoryId,
    catalogId: data.catalogId,
    imageMode: data.imageMode,
    uniqueOnly: data.uniqueOnly,
    allowDuplicateSku: data.allowDuplicateSku,
    ...(data.templateId ? { templateId: data.templateId } : {}),
    ...(typeof data.limit === 'number' ? { limit: data.limit } : {}),
    ...(Array.isArray(data.selectedIds) ? { selectedIds: data.selectedIds } : {}),
    ...(typeof data.dryRun === 'boolean' ? { dryRun: data.dryRun } : {}),
    ...(data.mode ? { mode: data.mode } : {}),
    ...(data.requestId ? { requestId: data.requestId } : {}),
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
