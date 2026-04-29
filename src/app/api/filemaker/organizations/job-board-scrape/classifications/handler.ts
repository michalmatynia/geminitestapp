import { type NextRequest } from 'next/server';

import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import { applyFilemakerJobBoardLexiconClassifications } from '@/features/filemaker/server/filemaker-job-board-scrape';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

const readJsonBody = async (req: NextRequest): Promise<unknown> => {
  try {
    return (await req.json()) as unknown;
  } catch (error) {
    throw badRequestError('Invalid job-board lexicon classification request JSON.').withCause(error);
  }
};

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result = await applyFilemakerJobBoardLexiconClassifications(await readJsonBody(req));
  return Response.json(result, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
