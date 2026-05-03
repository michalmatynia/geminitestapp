import { type NextRequest } from 'next/server';

import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import { readLatestFilemakerJobBoardScrapeRun } from '@/features/filemaker/server/filemaker-job-board-scrape-runtime';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const snapshot = await readLatestFilemakerJobBoardScrapeRun();
  return Response.json(snapshot, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
