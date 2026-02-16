export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  resumeBaseImportRun,
  toStartResponse,
  updateBaseImportRunQueueJob,
} from '@/features/integrations/services/imports/base-import-service';
import { enqueueBaseImportRunJob } from '@/features/jobs/workers/baseImportQueue';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const requestSchema = z.object({
  statuses: z
    .array(
      z.enum(['pending', 'processing', 'imported', 'updated', 'skipped', 'failed'])
    )
    .optional(),
});

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid resume payload.' },
      { status: 400 }
    );
  }

  const statuses = parsed.data.statuses ?? ['failed', 'pending'];
  const resumed = await resumeBaseImportRun(params.runId, statuses);
  const queueJobId = await enqueueBaseImportRunJob({
    runId: resumed.id,
    reason: 'resume',
    statuses,
  });
  const responseRun = await updateBaseImportRunQueueJob(resumed.id, queueJobId);

  return NextResponse.json(toStartResponse(responseRun), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export const POST = apiHandlerWithParams<{ runId: string }>(POST_handler, {
  source: 'integrations.imports.base.runs.[runId].resume.POST',
  requireCsrf: false,
});
