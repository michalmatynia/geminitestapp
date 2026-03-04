import type { NextRequest } from 'next/server';

import type { ApiHandlerContext, ApiRouteHandler } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';

import {
  GET_handler as getActiveTemplateHandler,
  POST_handler as postActiveTemplateHandler,
} from '@/app/api/v2/integrations/imports/base/active-template/handler';
import {
  GET_handler as getExportWarehouseHandler,
  POST_handler as postExportWarehouseHandler,
} from '@/app/api/v2/integrations/imports/base/export-warehouse/handler';
import {
  GET_handler as getLastTemplateHandler,
  POST_handler as postLastTemplateHandler,
} from '@/app/api/v2/integrations/imports/base/last-template/handler';

export type SettingParams = { setting: string };

type RouteHandlers = {
  GET: ApiRouteHandler;
  POST: ApiRouteHandler;
};

const IMPORT_BASE_SETTING_HANDLERS: Record<string, RouteHandlers> = {
  'active-template': {
    GET: getActiveTemplateHandler,
    POST: postActiveTemplateHandler,
  },
  'export-warehouse': {
    GET: getExportWarehouseHandler,
    POST: postExportWarehouseHandler,
  },
  'last-template': {
    GET: getLastTemplateHandler,
    POST: postLastTemplateHandler,
  },
};

const resolveHandlers = (setting: string): RouteHandlers => {
  const handlers = IMPORT_BASE_SETTING_HANDLERS[setting];
  if (!handlers) {
    throw notFoundError(`Unknown imports/base setting: ${setting}`);
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
