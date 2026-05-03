import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  listMongoFilemakerWebsites,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const url = new URL(req.url);
  const result = await listMongoFilemakerWebsites({
    links: url.searchParams.get('links'),
    limit: url.searchParams.get('limit'),
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize'),
    query: url.searchParams.get('query'),
  });
  return Response.json(result);
}
