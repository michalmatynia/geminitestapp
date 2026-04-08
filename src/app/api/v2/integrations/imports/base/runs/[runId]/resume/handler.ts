import { NextRequest, NextResponse } from 'next/server';

import {
  resumeBaseImportRun,
  toStartResponse,
  updateBaseImportRunQueueJob,
  dispatchBaseImportRunJob,
} from '@/features/integrations/server';
import type { BaseImportStartResponse } from '@/shared/contracts/integrations/base-com';
import { baseImportRunResumePayloadSchema } from '@/shared/contracts/integrations/base-com';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const requestSchema = baseImportRunResumePayloadSchema;

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid resume payload.' }, { status: 400 });
  }

  const statuses = parsed.data.statuses ?? ['failed', 'pending'];
  const resumed = await resumeBaseImportRun(params.runId, statuses);
  const { dispatchMode, queueJobId } = await dispatchBaseImportRunJob({
    runId: resumed.id,
    reason: 'resume',
    statuses: ['pending'],
  });
  const responseRun = await updateBaseImportRunQueueJob(resumed.id, queueJobId, dispatchMode);

  const response: BaseImportStartResponse = toStartResponse(responseRun);
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
