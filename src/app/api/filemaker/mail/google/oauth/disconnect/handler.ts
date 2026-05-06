import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { validationError } from '@/shared/errors/app-error';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import { disconnectGoogleMailOAuth } from '@/features/filemaker/server/mail/mail-google-oauth';

type DisconnectRequestBody = {
  accountId?: unknown;
};

const readAccountId = async (req: NextRequest): Promise<string> => {
  const queryAccountId = req.nextUrl.searchParams.get('accountId')?.trim() ?? '';
  if (queryAccountId.length > 0) return queryAccountId;
  const body = (await req.json().catch(() => ({}))) as DisconnectRequestBody;
  return typeof body.accountId === 'string' ? body.accountId.trim() : '';
};

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const accountId = await readAccountId(req);
  if (accountId.length === 0) {
    throw validationError('Mail account id is required.');
  }
  return Response.json({
    account: await disconnectGoogleMailOAuth(accountId),
  });
}
