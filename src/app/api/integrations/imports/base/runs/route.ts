export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  listBaseImportRuns,
} from '@/features/integrations/services/imports/base-import-run-repository';
import {
  prepareBaseImportRun,
  toStartResponse,
  updateBaseImportRunQueueJob,
} from '@/features/integrations/services/imports/base-import-service';
import { enqueueBaseImportRunJob } from '@/features/jobs/workers/baseImportQueue';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const startRunSchema = z.object({
  connectionId: z.string().trim().min(1).optional(),
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

const listRunsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

async function GET_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
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

async function POST_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const data = ctx.body as z.infer<typeof startRunSchema>;

  const run = await prepareBaseImportRun({
    inventoryId: data.inventoryId,
    catalogId: data.catalogId,
    imageMode: data.imageMode,
    uniqueOnly: data.uniqueOnly,
    allowDuplicateSku: data.allowDuplicateSku,
    ...(data.connectionId ? { connectionId: data.connectionId } : {}),
    ...(data.templateId ? { templateId: data.templateId } : {}),
    ...(typeof data.limit === 'number' ? { limit: data.limit } : {}),
    ...(Array.isArray(data.selectedIds) ? { selectedIds: data.selectedIds } : {}),
    ...(typeof data.dryRun === 'boolean' ? { dryRun: data.dryRun } : {}),
    ...(data.mode ? { mode: data.mode } : {}),
    ...(data.requestId ? { requestId: data.requestId } : {}),
  });

  let responseRun = run;
  if (run.status === 'queued' && run.stats.total > 0) {
    const queueJobId = await enqueueBaseImportRunJob({
      runId: run.id,
      reason: 'start',
      statuses: ['pending'],
    });
    responseRun = await updateBaseImportRunQueueJob(run.id, queueJobId);
  }

  return NextResponse.json(toStartResponse(responseRun), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export const GET = apiHandler(GET_handler, {
  source: 'integrations.imports.base.runs.GET',
  requireCsrf: false,
  querySchema: listRunsQuerySchema,
});

export const POST = apiHandler(POST_handler, {
  source: 'integrations.imports.base.runs.POST',
  requireCsrf: false,
  parseJsonBody: true,
  bodySchema: startRunSchema,
});
