export const runtime = 'nodejs';


import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext, ApiRouteHandler } from '@/shared/contracts/ui';

import {
  GET_handler as getActiveTemplateHandler,
  POST_handler as postActiveTemplateHandler,
} from '../active-template/handler';
import {
  GET_handler as getDefaultConnectionHandler,
  POST_handler as postDefaultConnectionHandler,
} from '../default-connection/handler';
import {
  GET_handler as getDefaultInventoryHandler,
  POST_handler as postDefaultInventoryHandler,
} from '../default-inventory/handler';
import {
  GET_handler as getImageRetryPresetsHandler,
  POST_handler as postImageRetryPresetsHandler,
} from '../image-retry-presets/handler';
import {
  GET_handler as getStockFallbackHandler,
  POST_handler as postStockFallbackHandler,
} from '../stock-fallback/handler';

import type { NextRequest } from 'next/server';

type SettingParams = { setting: string };

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

export const GET = apiHandlerWithParams<SettingParams>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: SettingParams): Promise<Response> =>
    resolveHandlers(params.setting).GET(req, ctx),
  {
    source: 'products.exports.base.setting.GET',
    requireCsrf: false,
  }
);

export const POST = apiHandlerWithParams<SettingParams>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: SettingParams): Promise<Response> =>
    resolveHandlers(params.setting).POST(req, ctx),
  {
    source: 'products.exports.base.setting.POST',
    requireCsrf: false,
  }
);
