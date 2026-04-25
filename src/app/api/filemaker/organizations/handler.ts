import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  listMongoFilemakerOrganizations,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const url = new URL(req.url);
  const result = await listMongoFilemakerOrganizations({
    address: url.searchParams.get('address'),
    bank: url.searchParams.get('bank'),
    limit: url.searchParams.get('limit'),
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize'),
    parent: url.searchParams.get('parent'),
    query: url.searchParams.get('query'),
    updatedBy: url.searchParams.get('updatedBy'),
  });
  return Response.json(result);
}
