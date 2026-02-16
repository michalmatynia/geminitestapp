export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import {
  createPatternSchema,
  getValidatorPatternsHandler,
  postValidatorPatternsHandler,
} from './handler';

export const GET = apiHandler(
  async (req, ctx: ApiHandlerContext): Promise<Response> =>
    getValidatorPatternsHandler(req, ctx),
  {
    source: 'products.validator-patterns.GET',
    cacheControl: 'no-store',
  },
);

export const POST = apiHandler(
  async (req, ctx: ApiHandlerContext): Promise<Response> =>
    postValidatorPatternsHandler(req, ctx),
  {
    source: 'products.validator-patterns.POST',
    parseJsonBody: true,
    bodySchema: createPatternSchema,
  },
);
