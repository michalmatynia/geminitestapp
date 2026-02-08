export const runtime = 'nodejs';

import { NextRequest } from 'next/server';

import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

import { GET_handler } from '../route';

const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx, 'heavy'),
  { source: 'settings.GET.heavy', rateLimitKey: disableSettingsRateLimit ? false : 'api' }
);
