export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import { postBaseImportsHandler, requestSchema } from './handler';

import type { NextRequest } from 'next/server';

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    postBaseImportsHandler(req, ctx),
  {
    source: 'products.imports.base.POST',
    requireCsrf: false,
    parseJsonBody: true,
    bodySchema: requestSchema,
  }
);
