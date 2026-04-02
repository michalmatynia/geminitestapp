import { z } from 'zod';

import type { SettingParams } from '@/app/api/v2/integrations/base/setting-params';
import {
  GET_handler as getDefaultConnectionHandler,
  POST_handler as postDefaultConnectionHandler,
} from '@/app/api/v2/integrations/exports/tradera/default-connection/handler';
import type { ApiHandlerContext, ApiRouteHandler } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

import type { NextRequest } from 'next/server';

export type { SettingParams };
export const querySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
});

type RouteHandlers = {
  GET: ApiRouteHandler;
  POST: ApiRouteHandler;
};

const EXPORT_TRADERA_SETTING_HANDLERS: Record<string, RouteHandlers> = {
  'default-connection': {
    GET: getDefaultConnectionHandler,
    POST: postDefaultConnectionHandler,
  },
};

const resolveHandlers = (setting: string): RouteHandlers => {
  const handlers = EXPORT_TRADERA_SETTING_HANDLERS[setting];
  if (!handlers) {
    throw notFoundError(`Unknown exports/tradera setting: ${setting}`);
  }
  return handlers;
};

export async function GET_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: SettingParams
): Promise<Response> {
  return resolveHandlers(params.setting).GET(req, ctx);
}

export async function POST_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: SettingParams
): Promise<Response> {
  return resolveHandlers(params.setting).POST(req, ctx);
}
