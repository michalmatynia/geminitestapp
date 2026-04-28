import { type NextRequest } from 'next/server';

import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import { readFilemakerJobBoardScrapeRun } from '@/features/filemaker/server/filemaker-job-board-scrape-runtime';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';

const resolveRunId = (params: { runId: string | string[] }): string => {
  const raw = Array.isArray(params.runId) ? (params.runId[0] ?? '') : params.runId;
  return decodeURIComponent(raw);
};

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string | string[] }
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const snapshot = await readFilemakerJobBoardScrapeRun(resolveRunId(params));
  if (snapshot.run === null) {
    throw notFoundError('Job-board scrape run not found.');
  }
  return Response.json(snapshot, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
