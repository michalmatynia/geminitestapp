import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  listMongoFilemakerEvents,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const url = new URL(req.url);
  const result = await listMongoFilemakerEvents({
    address: url.searchParams.get('address'),
    limit: url.searchParams.get('limit'),
    organization: url.searchParams.get('organization'),
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize'),
    query: url.searchParams.get('query'),
    status: url.searchParams.get('status'),
    updatedBy: url.searchParams.get('updatedBy'),
  });
  return Response.json(result);
}
