import { z } from 'zod';

import type { SettingParams } from '@/app/api/v2/integrations/base/setting-params';
import {
  getHandler as getActiveTemplateHandler,
  postHandler as postActiveTemplateHandler,
} from '@/app/api/v2/integrations/exports/base/active-template/handler';
import {
  getHandler as getDefaultConnectionHandler,
  postHandler as postDefaultConnectionHandler,
} from '@/app/api/v2/integrations/exports/base/default-connection/handler';
import {
  getHandler as getDefaultInventoryHandler,
  postHandler as postDefaultInventoryHandler,
} from '@/app/api/v2/integrations/exports/base/default-inventory/handler';
import {
  getHandler as getExportWarehouseHandler,
  postHandler as postExportWarehouseHandler,
} from '@/app/api/v2/integrations/exports/base/export-warehouse/handler';
import {
  getHandler as getImageRetryPresetsHandler,
  postHandler as postImageRetryPresetsHandler,
} from '@/app/api/v2/integrations/exports/base/image-retry-presets/handler';
import {
  getHandler as getStockFallbackHandler,
  postHandler as postStockFallbackHandler,
} from '@/app/api/v2/integrations/exports/base/stock-fallback/handler';
import type { ApiHandlerContext, ApiRouteHandler } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

import type { NextRequest } from 'next/server';

export type { SettingParams };
export const querySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
  inventoryId: optionalTrimmedQueryString(),
});

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
  'export-warehouse': {
    GET: getExportWarehouseHandler,
    POST: postExportWarehouseHandler,
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

export async function getHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: SettingParams
): Promise<Response> {
  return resolveHandlers(params.setting).GET(req, ctx);
}

export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: SettingParams
): Promise<Response> {
  return resolveHandlers(params.setting).POST(req, ctx);
}
