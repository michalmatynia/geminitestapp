import { type NextRequest, NextResponse } from 'next/server';

import { refreshCompanyEmails } from '@/features/job-board/server/job-scans-service';
import {
  jobBoardRefreshCompanyEmailsRequestSchema,
  jobBoardRefreshCompanyEmailsResponseSchema,
  type JobBoardRefreshCompanyEmailsRequest,
} from '@/shared/contracts/job-board';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { jobBoardRefreshCompanyEmailsRequestSchema };

export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = (ctx.body as JobBoardRefreshCompanyEmailsRequest | null | undefined) ?? {};
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const refreshIndex = segments.lastIndexOf('refresh-emails');
  const companyId = refreshIndex > 0 ? segments[refreshIndex - 1] : undefined;
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required in URL.' }, { status: 400 });
  }

  try {
    const result = await refreshCompanyEmails({
      companyId,
      useVision: body.useVision,
      autoPromote: body.autoPromote,
      headless: body.headless,
    });
    return NextResponse.json(
      jobBoardRefreshCompanyEmailsResponseSchema.parse({
        ...result,
      })
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
