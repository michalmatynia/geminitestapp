import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  listMongoFilemakerEmails,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const url = new URL(req.url);
  const result = await listMongoFilemakerEmails({
    limit: url.searchParams.get('limit'),
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize'),
    query: url.searchParams.get('query'),
    sort: url.searchParams.get('sort'),
    status: url.searchParams.get('status'),
    updatedBy: url.searchParams.get('updatedBy'),
  });
  return Response.json(result);
}
