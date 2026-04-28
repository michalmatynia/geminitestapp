import { type NextRequest } from 'next/server';

import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import { cancelFilemakerJobBoardScrapeRun } from '@/features/filemaker/server/filemaker-job-board-scrape-runtime';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const resolveRunId = (params: { runId: string | string[] }): string => {
  const raw = Array.isArray(params.runId) ? (params.runId[0] ?? '') : params.runId;
  return decodeURIComponent(raw);
};

export async function postHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string | string[] }
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const snapshot = await cancelFilemakerJobBoardScrapeRun(resolveRunId(params));
  return Response.json(snapshot, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
