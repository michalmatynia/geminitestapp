import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import { listFilemakerMailThreads } from '@/features/filemaker/server';

import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { z } from 'zod';

const querySchema = z.object({
  query: optionalTrimmedQueryString(),
  accountId: optionalTrimmedQueryString(),
  mailboxPath: optionalTrimmedQueryString(),
  campaignId: optionalTrimmedQueryString(),
  runId: optionalTrimmedQueryString(),
  deliveryId: optionalTrimmedQueryString(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

const hasQueryValue = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const { query, accountId, mailboxPath, campaignId, runId, deliveryId, limit } = querySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  const input = {
    ...(hasQueryValue(query) ? { query } : {}),
    ...(hasQueryValue(accountId) ? { accountId } : {}),
    ...(hasQueryValue(mailboxPath) ? { mailboxPath } : {}),
    ...(hasQueryValue(campaignId) ? { campaignId } : {}),
    ...(hasQueryValue(runId) ? { runId } : {}),
    ...(hasQueryValue(deliveryId) ? { deliveryId } : {}),
    ...(typeof limit === 'number' ? { limit } : {}),
  };
  return Response.json({
    threads: await listFilemakerMailThreads(input),
  });
}
