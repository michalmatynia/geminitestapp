import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

import { GET_handler } from '../handler';

export const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const GET_heavy_handler = (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
  GET_handler(req, ctx, 'heavy');
