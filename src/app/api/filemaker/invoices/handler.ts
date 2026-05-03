import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  listMongoFilemakerInvoices,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const url = new URL(req.url);
  const result = await listMongoFilemakerInvoices({
    limit: url.searchParams.get('limit'),
    organization: url.searchParams.get('organization'),
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize'),
    payment: url.searchParams.get('payment'),
    query: url.searchParams.get('query'),
    year: url.searchParams.get('year'),
  });
  return Response.json(result);
}
