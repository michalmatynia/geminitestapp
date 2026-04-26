import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  listMongoFilemakerPersons,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const url = new URL(req.url);
  const result = await listMongoFilemakerPersons({
    address: url.searchParams.get('address'),
    bank: url.searchParams.get('bank'),
    limit: url.searchParams.get('limit'),
    organization: url.searchParams.get('organization'),
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize'),
    query: url.searchParams.get('query'),
    updatedBy: url.searchParams.get('updatedBy'),
  });
  return Response.json(result);
}
