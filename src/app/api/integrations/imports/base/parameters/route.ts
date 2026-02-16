export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import {
  getBaseImportParametersHandler,
  postBaseImportParametersHandler,
} from './handler';

export const POST = apiHandler(
  async (req, ctx: ApiHandlerContext): Promise<Response> =>
    postBaseImportParametersHandler(req, ctx),
  { source: 'products.imports.base.parameters.POST', requireCsrf: false }
);

export const GET = apiHandler(
  async (req, ctx: ApiHandlerContext): Promise<Response> =>
    getBaseImportParametersHandler(req, ctx),
  { source: 'products.imports.base.parameters.GET', requireCsrf: false }
);
