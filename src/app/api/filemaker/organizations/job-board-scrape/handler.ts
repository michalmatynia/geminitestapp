import { type NextRequest } from 'next/server';

import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import { runFilemakerJobBoardScrape } from '@/features/filemaker/server/filemaker-job-board-scrape';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

const readOptionalJsonBody = async (req: NextRequest): Promise<unknown> => {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return {};
  try {
    const bodyText = await req.text();
    if (bodyText.trim().length === 0) return {};
    return JSON.parse(bodyText) as unknown;
  } catch (error) {
    throw badRequestError('Invalid job-board scrape request JSON.').withCause(error);
  }
};

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result = await runFilemakerJobBoardScrape(await readOptionalJsonBody(req));
  return Response.json(result);
}
