export const runtime = 'nodejs';

import type { ApiHandlerContext, ApiRouteHandler } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import {
  GET_handler as getActiveTemplateHandler,
  POST_handler as postActiveTemplateHandler,
} from '../active-template/handler';
import {
  GET_handler as getExportWarehouseHandler,
  POST_handler as postExportWarehouseHandler,
} from '../export-warehouse/handler';
import {
  GET_handler as getLastTemplateHandler,
  POST_handler as postLastTemplateHandler,
} from '../last-template/handler';

import type { NextRequest } from 'next/server';

type SettingParams = { setting: string };

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

export const GET = apiHandlerWithParams<SettingParams>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: SettingParams): Promise<Response> => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.imports.base.setting.GET',
      context: { route: '/api/integrations/imports/base/[setting]' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/imports/base/[setting]',
      method: 'GET',
      source: 'api.compat.integrations.imports.base.setting.GET',
    });
    return resolveHandlers(params.setting).GET(req, ctx);
  },
  {
    source: 'products.imports.base.setting.GET',
    requireCsrf: false,
  }
);

export const POST = apiHandlerWithParams<SettingParams>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: SettingParams): Promise<Response> => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.imports.base.setting.POST',
      context: { route: '/api/integrations/imports/base/[setting]' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/imports/base/[setting]',
      method: 'POST',
      source: 'api.compat.integrations.imports.base.setting.POST',
    });
    return resolveHandlers(params.setting).POST(req, ctx);
  },
  {
    source: 'products.imports.base.setting.POST',
    requireCsrf: false,
  }
);
