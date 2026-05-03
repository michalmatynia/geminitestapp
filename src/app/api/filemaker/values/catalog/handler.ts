import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  listMongoFilemakerValueCatalog,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  return Response.json(await listMongoFilemakerValueCatalog());
}

