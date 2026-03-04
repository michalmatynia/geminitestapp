import type { NextRequest } from 'next/server';

import type { ApiHandlerContext, ApiRouteHandler } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';

import {
  GET_handler as getActiveTemplateHandler,
  POST_handler as postActiveTemplateHandler,
} from '@/app/api/v2/integrations/exports/base/active-template/handler';
import {
  GET_handler as getDefaultConnectionHandler,
  POST_handler as postDefaultConnectionHandler,
} from '@/app/api/v2/integrations/exports/base/default-connection/handler';
import {
  GET_handler as getDefaultInventoryHandler,
  POST_handler as postDefaultInventoryHandler,
} from '@/app/api/v2/integrations/exports/base/default-inventory/handler';
import {
  GET_handler as getImageRetryPresetsHandler,
  POST_handler as postImageRetryPresetsHandler,
} from '@/app/api/v2/integrations/exports/base/image-retry-presets/handler';
import {
  GET_handler as getStockFallbackHandler,
  POST_handler as postStockFallbackHandler,
} from '@/app/api/v2/integrations/exports/base/stock-fallback/handler';

export type SettingParams = { setting: string };

type RouteHandlers = {
  GET: ApiRouteHandler;
  POST: ApiRouteHandler;
};

const EXPORT_BASE_SETTING_HANDLERS: Record<string, RouteHandlers> = {
  'active-template': {
    GET: getActiveTemplateHandler,
    POST: postActiveTemplateHandler,
  },
  'default-connection': {
    GET: getDefaultConnectionHandler,
    POST: postDefaultConnectionHandler,
  },
  'default-inventory': {
    GET: getDefaultInventoryHandler,
    POST: postDefaultInventoryHandler,
  },
  'image-retry-presets': {
    GET: getImageRetryPresetsHandler,
    POST: postImageRetryPresetsHandler,
  },
  'stock-fallback': {
    GET: getStockFallbackHandler,
    POST: postStockFallbackHandler,
  },
};

const resolveHandlers = (setting: string): RouteHandlers => {
  const handlers = EXPORT_BASE_SETTING_HANDLERS[setting];
  if (!handlers) {
    throw notFoundError(`Unknown exports/base setting: ${setting}`);
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
